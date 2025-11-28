import { useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
      onFileUpload(file);
      toast.success("File uploaded successfully!");
    } else {
      toast.error("Please upload a CSV or Excel file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileUpload(file);
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