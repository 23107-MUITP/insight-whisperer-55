import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { Filter, BarChart3, TrendingUp, PieChartIcon } from "lucide-react";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface DataVisualizationProps {
  fileData?: any[] | null;
  filteredData?: any[] | null;
  filterContext?: string | null;
}

const DataVisualization = ({ fileData, filteredData, filterContext }: DataVisualizationProps) => {
  // Use filtered data if available, otherwise use full file data
  const activeData = filteredData || fileData;
  
  const { numericColumns, categoricalColumns, chartData } = useMemo(() => {
    if (!activeData || activeData.length === 0) {
      return { numericColumns: [], categoricalColumns: [], chartData: [] };
    }

    const columns = Object.keys(activeData[0]);
    const numeric: string[] = [];
    const categorical: string[] = [];

    columns.forEach(col => {
      const firstValue = activeData[0][col];
      if (typeof firstValue === 'number' || !isNaN(Number(firstValue))) {
        numeric.push(col);
      } else {
        categorical.push(col);
      }
    });

    // Prepare data for charts (limit to first 15 rows for better visualization)
    const limitedData = activeData.slice(0, 15);

    return { 
      numericColumns: numeric, 
      categoricalColumns: categorical,
      chartData: limitedData
    };
  }, [activeData]);

  // Generate categorical distribution for pie chart
  const pieData = useMemo(() => {
    if (!activeData || categoricalColumns.length === 0) return [];
    
    const firstCatCol = categoricalColumns[0];
    const distribution: Record<string, number> = {};
    
    activeData.forEach(row => {
      const value = String(row[firstCatCol]);
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return Object.entries(distribution)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [activeData, categoricalColumns]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!activeData || activeData.length === 0 || numericColumns.length === 0) return null;
    
    const primaryNumCol = numericColumns[0];
    const values = activeData.map(row => parseFloat(row[primaryNumCol]) || 0);
    const total = values.reduce((sum, val) => sum + val, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return {
      total: total.toLocaleString(),
      average: avg.toFixed(2),
      max: max.toLocaleString(),
      min: min.toLocaleString(),
      count: activeData.length,
      column: primaryNumCol
    };
  }, [activeData, numericColumns]);

  if (!fileData || fileData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Upload a file to see dynamic visualizations
          </p>
        </CardContent>
      </Card>
    );
  }

  const labelKey = categoricalColumns[0] || Object.keys(activeData?.[0] || {})[0];

  return (
    <div className="space-y-4">
      {/* Filter Status Banner */}
      {filterContext && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Filter className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Dashboard Filtered</p>
              <p className="text-xs text-muted-foreground">
                Showing data for: <Badge variant="secondary" className="ml-1">{filterContext}</Badge>
                {activeData && <span className="ml-2">({activeData.length} records)</span>}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Metrics */}
      {summaryMetrics && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total ({summaryMetrics.column})</p>
              <p className="text-2xl font-bold">{summaryMetrics.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-2xl font-bold">{summaryMetrics.average}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Highest</p>
              <p className="text-2xl font-bold text-green-600">{summaryMetrics.max}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Lowest</p>
              <p className="text-2xl font-bold text-red-600">{summaryMetrics.min}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {numericColumns.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trend Analysis
                {filterContext && <Badge variant="outline" className="text-xs">{filterContext}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey={labelKey} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                  <Legend />
                  {numericColumns.slice(0, 3).map((col, idx) => (
                    <Line 
                      key={col}
                      type="monotone" 
                      dataKey={col} 
                      stroke={COLORS[idx % COLORS.length]} 
                      strokeWidth={2} 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {numericColumns.length >= 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Comparative Analysis
                {filterContext && <Badge variant="outline" className="text-xs">{filterContext}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey={labelKey} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                  <Legend />
                  {numericColumns.slice(0, 3).map((col, idx) => (
                    <Bar 
                      key={col}
                      dataKey={col} 
                      fill={COLORS[idx % COLORS.length]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChartIcon className="h-4 w-4 text-primary" />
                {categoricalColumns[0]} Distribution
                {filterContext && <Badge variant="outline" className="text-xs">{filterContext}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DataVisualization;
