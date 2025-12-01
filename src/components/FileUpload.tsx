import { useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface FileUploadProps {
  onFileUpload: (file: File, parsedData: any[], webhookResponse?: any) => void;
}

const FileUpload = ({ onFileUpload }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const parseFileData = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let parsedData: any[] = [];

          if (file.name.endsWith('.csv')) {
            const text = data as string;
            const workbook = XLSX.read(text, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else if (file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          }

          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const triggerN8nWebhook = async (file: File, parsedData: any[]) => {
    try {
      toast.info("Analyzing your data...");
      
      const { data, error } = await supabase.functions.invoke('n8n-webhook', {
        body: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          timestamp: new Date().toISOString(),
          data: parsedData,
          rowCount: parsedData.length,
        }
      });

      if (error) throw error;
      console.log("n8n webhook triggered successfully:", data);
      toast.success(`Successfully analyzed ${parsedData.length} rows of data!`);
      return data;
    } catch (error) {
      console.error("Error triggering n8n webhook:", error);
      toast.error("Failed to analyze data. Please try again.");
      return null;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
      const parsedData = await parseFileData(file);
      const webhookResponse = await triggerN8nWebhook(file, parsedData);
      onFileUpload(file, parsedData, webhookResponse);
      toast.success("File uploaded successfully!");
    } else {
      toast.error("Please upload a CSV or Excel file");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const parsedData = await parseFileData(file);
      const webhookResponse = await triggerN8nWebhook(file, parsedData);
      onFileUpload(file, parsedData, webhookResponse);
      toast.success("File uploaded successfully!");
    }
  };

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-all ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-primary/10">
          {selectedFile ? (
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            {selectedFile ? selectedFile.name : "Upload Your Data"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your Excel or CSV file here, or click to browse
          </p>
        </div>

        <label htmlFor="file-upload">
          <Button variant="default" className="cursor-pointer" asChild>
            <span>Select File</span>
          </Button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
          />
        </label>

        <p className="text-xs text-muted-foreground">
          Supported formats: CSV, XLSX
        </p>
      </div>
    </Card>
  );
};

export default FileUpload;