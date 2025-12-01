import { useState } from "react";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import MetricsCard from "@/components/MetricsCard";
import DataVisualization from "@/components/DataVisualization";
import AIChat from "@/components/AIChat";
import WebhookResponse from "@/components/WebhookResponse";

const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);

  const handleFileUpload = (file: File, parsedData: any[], webhookData?: any) => {
    setUploadedFile(file);
    setFileData(parsedData);
    setWebhookResponse(webhookData);
    console.log("File uploaded:", file.name, "Rows:", parsedData.length);
    console.log("Webhook response:", webhookData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI Analytics Platform
          </h1>
          <p className="text-muted-foreground text-lg">
            Transform your sales and marketing data into actionable insights with AI-powered analytics
          </p>
        </header>

        {/* File Upload */}
        <section>
          <FileUpload onFileUpload={handleFileUpload} />
        </section>

        {/* Metrics Overview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Key Metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricsCard
              title="Total Revenue"
              value="$45,231"
              icon={DollarSign}
              trend={{ value: 12.5, isPositive: true }}
            />
            <MetricsCard
              title="New Leads"
              value="2,350"
              icon={Users}
              trend={{ value: 8.2, isPositive: true }}
            />
            <MetricsCard
              title="Conversion Rate"
              value="3.24%"
              icon={Target}
              trend={{ value: -2.1, isPositive: false }}
            />
            <MetricsCard
              title="Growth Rate"
              value="18.7%"
              icon={TrendingUp}
              trend={{ value: 5.4, isPositive: true }}
            />
          </div>
        </section>

        {/* Webhook Response */}
        {webhookResponse && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Automation Results</h2>
            <WebhookResponse response={webhookResponse} />
          </section>
        )}

        {/* Data Visualizations */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Analytics Dashboard</h2>
          <DataVisualization />
        </section>

        {/* AI Chat */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">AI Insights</h2>
          <AIChat fileData={fileData} fileName={uploadedFile?.name} />
        </section>
      </div>
    </div>
  );
};

export default Index;