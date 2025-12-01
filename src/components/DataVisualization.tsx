import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface DataVisualizationProps {
  fileData?: any[] | null;
}

const DataVisualization = ({ fileData }: DataVisualizationProps) => {
  const { numericColumns, categoricalColumns, chartData } = useMemo(() => {
    if (!fileData || fileData.length === 0) {
      return { numericColumns: [], categoricalColumns: [], chartData: [] };
    }

    const columns = Object.keys(fileData[0]);
    const numeric: string[] = [];
    const categorical: string[] = [];

    columns.forEach(col => {
      const firstValue = fileData[0][col];
      if (typeof firstValue === 'number' || !isNaN(Number(firstValue))) {
        numeric.push(col);
      } else {
        categorical.push(col);
      }
    });

    // Prepare data for charts (limit to first 10 rows for better visualization)
    const limitedData = fileData.slice(0, 10);

    return { 
      numericColumns: numeric, 
      categoricalColumns: categorical,
      chartData: limitedData
    };
  }, [fileData]);

  // Generate categorical distribution for pie chart
  const pieData = useMemo(() => {
    if (!fileData || categoricalColumns.length === 0) return [];
    
    const firstCatCol = categoricalColumns[0];
    const distribution: Record<string, number> = {};
    
    fileData.forEach(row => {
      const value = String(row[firstCatCol]);
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return Object.entries(distribution)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [fileData, categoricalColumns]);

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

  const labelKey = categoricalColumns[0] || Object.keys(fileData[0])[0];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {numericColumns.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={labelKey} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
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
          <CardHeader>
            <CardTitle>Comparative Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={labelKey} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
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
          <CardHeader>
            <CardTitle>{categoricalColumns[0]} Distribution</CardTitle>
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
  );
};

export default DataVisualization;
