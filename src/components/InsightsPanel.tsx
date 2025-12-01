import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb } from "lucide-react";
import { useMemo } from "react";

interface InsightsPanelProps {
  fileData?: any[] | null;
}

const InsightsPanel = ({ fileData }: InsightsPanelProps) => {
  const insights = useMemo(() => {
    if (!fileData || fileData.length === 0) return null;

    const columns = Object.keys(fileData[0]);
    const numericColumns = columns.filter(col => {
      const firstValue = fileData[0][col];
      return typeof firstValue === 'number' || !isNaN(Number(firstValue));
    });

    if (numericColumns.length === 0) return null;

    // Calculate trends for first numeric column
    const primaryMetric = numericColumns[0];
    const values = fileData.map(row => Number(row[primaryMetric]) || 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const trend = values[values.length - 1] > values[0] ? 'up' : 'down';
    const trendPercent = ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1);

    // Detect anomalies
    const anomalies = values.filter(v => v > avg * 1.5 || v < avg * 0.5).length;

    return {
      primaryMetric,
      avg: avg.toFixed(2),
      max,
      min,
      trend,
      trendPercent,
      anomalies,
      totalRecords: fileData.length
    };
  }, [fileData]);

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Upload data to see AI-powered insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {insights.trend === 'up' ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Primary Metric: {insights.primaryMetric}</p>
            <p className="text-2xl font-bold">
              {insights.trend === 'up' ? '+' : ''}{insights.trendPercent}%
            </p>
            <Badge variant={insights.trend === 'up' ? 'default' : 'destructive'} className="mt-1">
              {insights.trend === 'up' ? 'Growing' : 'Declining'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-semibold">{insights.avg}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak</p>
              <p className="font-semibold">{insights.max}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lowest</p>
              <p className="font-semibold">{insights.min}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.anomalies > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Data Anomalies Detected</p>
                <p className="text-xs text-muted-foreground">
                  {insights.anomalies} outlier(s) found. Ask AI for detailed analysis.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Strategic Insight</p>
              <p className="text-xs text-muted-foreground">
                {insights.trend === 'up' 
                  ? "Performance is trending upward. Consider scaling successful strategies."
                  : "Performance decline detected. Review underperforming segments for optimization opportunities."}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Ask AI: "What strategies can improve {insights.primaryMetric}?"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsPanel;
