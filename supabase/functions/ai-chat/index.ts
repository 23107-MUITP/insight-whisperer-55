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
      
      let systemPrompt = `You are an expert AI analytics assistant specializing in sales and marketing data analysis. 
Your role is to help users understand their data, identify trends, and provide actionable recommendations for business growth.
Be concise, insightful, and focus on practical advice. When discussing data, provide specific examples and suggestions.`;

      if (fileData && fileData.length > 0) {
        const columns = Object.keys(fileData[0]);
        const sampleRows = fileData.slice(0, 5);
        
        systemPrompt = `You are an expert AI business analyst with direct access to the uploaded data file "${fileName}".

DATA SUMMARY:
- Total Rows: ${fileData.length}
- Columns: ${columns.join(", ")}

SAMPLE DATA (first 5 rows):
${JSON.stringify(sampleRows, null, 2)}

FULL DATASET STRUCTURE:
${JSON.stringify(fileData, null, 2).substring(0, 5000)}

INSTRUCTIONS:
- Analyze the actual data values provided above
- Reference specific numbers, trends, and patterns from the data
- Provide detailed insights based on the column values
- Give actionable recommendations for business growth
- Be specific and data-driven in your analysis
- When the user asks questions, analyze the entire dataset to provide accurate answers`;

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
