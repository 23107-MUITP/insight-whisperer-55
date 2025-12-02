import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callAIWithRetry(apiKey: string, message: string, fileData: any[] | null, fileName: string | undefined, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI API call attempt ${attempt}/${maxRetries}`);
      
      let systemPrompt = `You are an advanced AI Business Intelligence Analyst specializing in sales and marketing data analysis for consumer brands.

Your core capabilities:
1. DATA ANALYSIS: Analyze sales data, identify trends, patterns, anomalies, and outliers
2. STRATEGIC INSIGHTS: Provide actionable business recommendations backed by data
3. PERFORMANCE METRICS: Calculate and explain KPIs like growth rates, conversion rates, and regional performance
4. PREDICTIVE INSIGHTS: Suggest strategies to improve underperforming areas
5. CONVERSATIONAL: Respond naturally to management queries with clarity and precision

REGIONAL ANALYSIS EXPERTISE:
When asked about specific regions (West, South, East, North, Central, etc.):
- Filter the data to show ONLY that region's performance
- Calculate total sales, revenue, units sold for that specific region
- Compare the region against overall averages
- Identify top products/categories within that region
- Highlight growth trends specific to that region
- Provide region-specific recommendations

When analyzing data:
- Identify top-performing categories, products, or regions
- Detect sales drops or increases and explain potential causes
- Compare performance across time periods, regions, or segments
- Recommend specific, actionable strategies to improve sales
- Present insights in a clear, executive-friendly manner

Always structure responses with:
- Clear answer to the question with specific numbers
- Supporting data points and metrics (percentages, totals, averages)
- Comparison to other regions or overall performance
- Actionable recommendations for improvement`;

      if (fileData && fileData.length > 0) {
        const columns = Object.keys(fileData[0]);
        const sampleRows = fileData.slice(0, 5);
        
        // Identify region column
        const regionColumn = columns.find(col => 
          col.toLowerCase().includes('region') || 
          col.toLowerCase().includes('area') || 
          col.toLowerCase().includes('territory') ||
          col.toLowerCase().includes('zone') ||
          col.toLowerCase().includes('location')
        );
        
        // Get unique regions if found
        let regionInfo = '';
        if (regionColumn) {
          const uniqueRegions = [...new Set(fileData.map(row => row[regionColumn]).filter(Boolean))];
          regionInfo = `\nREGION COLUMN IDENTIFIED: "${regionColumn}"\nAVAILABLE REGIONS: ${uniqueRegions.join(', ')}`;
        }
        
        // Identify numeric columns for calculations
        const numericColumns = columns.filter(col => {
          const sampleValue = fileData.find(row => row[col] !== null && row[col] !== undefined)?.[col];
          return typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue));
        });
        
        systemPrompt += `\n\nCURRENT DATASET LOADED:
File: ${fileName || 'uploaded file'}
Total Records: ${fileData.length}
Columns: ${columns.join(', ')}
Numeric Columns (for calculations): ${numericColumns.join(', ')}${regionInfo}

Sample Data (first 5 rows):
${JSON.stringify(sampleRows, null, 2)}

FULL DATASET FOR ANALYSIS:
${JSON.stringify(fileData, null, 2).substring(0, 8000)}

IMPORTANT ANALYSIS INSTRUCTIONS:
- When asked about a specific region (e.g., "West", "South"), filter the data and provide metrics ONLY for that region
- Calculate totals, averages, and percentages for the requested region
- Compare region performance to overall dataset averages
- Identify the top products/categories in that region
- Provide specific numbers (e.g., "West region total sales: $X, which is Y% of total")
- If no exact match, find partial matches (e.g., "Western" for "West")

Use this data to answer user questions about:
- Regional sales performance and comparisons
- Top-performing categories/products per region
- Period-over-period comparisons by region
- Anomalies or unusual patterns in specific regions
- Strategic recommendations for regional growth
- Inventory insights by location
- Marketing performance by territory`;

        console.log(`Analyzing file: ${fileName} with ${fileData.length} rows and columns: ${columns.join(", ")}`);
      }
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
        }),
      });

      if (response.status === 503 && attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`503 error, retrying in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        
        if (response.status === 429) {
          return { error: 'Rate limit exceeded. Please try again in a moment.', status: 429 };
        }
        if (response.status === 402) {
          return { error: 'AI service requires payment. Please add credits to your workspace.', status: 402 };
        }
        if (response.status === 503) {
          return { error: 'AI service is temporarily unavailable. Please try again in a moment.', status: 503 };
        }
        
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      return { response: data.choices[0].message.content, status: 200 };
      
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Error occurred, retrying in ${waitTime}ms:`, error);
        await sleep(waitTime);
      }
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, fileData, fileName } = await req.json();
    console.log("Received message:", message);
    
    if (fileData && fileData.length > 0) {
      console.log(`File data available: ${fileName} with ${fileData.length} rows`);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const result = await callAIWithRetry(LOVABLE_API_KEY, message, fileData, fileName);
    
    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.status,
        },
      );
    }

    console.log("AI response generated successfully");

    return new Response(
      JSON.stringify({ response: result.response }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'The AI service encountered an error. Please try again.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
