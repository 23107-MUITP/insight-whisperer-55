import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface WebhookResponseProps {
  response: any;
}

const WebhookResponse = ({ response }: WebhookResponseProps) => {
  if (!response) return null;

  const isSuccess = response.success;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        ) : (
          <AlertCircle className="h-6 w-6 text-red-500" />
        )}
        <div>
          <h3 className="text-lg font-semibold">n8n Analysis Results</h3>
          <p className="text-sm text-muted-foreground">
            Automated workflow processing complete
          </p>
        </div>
        <Badge variant={isSuccess ? "default" : "destructive"} className="ml-auto">
          {isSuccess ? "Success" : "Error"}
        </Badge>
      </div>

      {response.data && (
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium text-sm">Response Data:</h4>
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}

      {response.error && (
        <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
          <h4 className="font-medium text-sm text-destructive">Error:</h4>
          <p className="text-sm text-destructive">{response.error}</p>
        </div>
      )}
    </Card>
  );
};

export default WebhookResponse;
