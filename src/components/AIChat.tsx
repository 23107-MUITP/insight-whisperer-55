import { useState, useRef, useEffect } from "react";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  fileData?: any[] | null;
  fileName?: string;
  onFilteredDataChange?: (filteredData: any[] | null, filterContext: string | null) => void;
}

const AIChat = ({ fileData, fileName, onFilteredDataChange }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI analytics assistant. Ask me anything about your sales and marketing data, and I'll provide insights and recommendations. The dashboard will update based on your queries!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesis = window.speechSynthesis;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error("Failed to recognize speech. Please try again.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Cleanup on unmount
    return () => {
      speechSynthesis.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info("Listening... Speak now");
    }
  };

  const handlePlayVoice = (content: string, index: number) => {
    // Stop any currently playing speech
    if (playingIndex !== null) {
      speechSynthesis.cancel();
      setPlayingIndex(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setPlayingIndex(index);
    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => {
      setPlayingIndex(null);
      toast.error("Failed to play voice");
    };

    speechSynthesis.speak(utterance);
  };

  // Extract filter context from user query
  const extractFilterContext = (query: string): { filterType: string; filterValue: string } | null => {
    const lowerQuery = query.toLowerCase();
    
    // Region filters
    const regionKeywords = ['west', 'east', 'north', 'south', 'central', 'northeast', 'northwest', 'southeast', 'southwest'];
    for (const region of regionKeywords) {
      if (lowerQuery.includes(region)) {
        return { filterType: 'region', filterValue: region };
      }
    }
    
    // Category filters
    if (lowerQuery.includes('category') || lowerQuery.includes('categories')) {
      const categoryMatch = lowerQuery.match(/(?:category|categories)\s+(?:like\s+)?["']?(\w+)["']?/i);
      if (categoryMatch) {
        return { filterType: 'category', filterValue: categoryMatch[1] };
      }
    }
    
    // Product filters
    if (lowerQuery.includes('product')) {
      const productMatch = lowerQuery.match(/product\s+(?:like\s+)?["']?(\w+)["']?/i);
      if (productMatch) {
        return { filterType: 'product', filterValue: productMatch[1] };
      }
    }

    // Top performing
    if (lowerQuery.includes('top') && (lowerQuery.includes('selling') || lowerQuery.includes('performing'))) {
      return { filterType: 'top', filterValue: 'performance' };
    }

    // Time period filters
    const quarterMatch = lowerQuery.match(/q([1-4])/i);
    if (quarterMatch) {
      return { filterType: 'quarter', filterValue: quarterMatch[1] };
    }

    return null;
  };

  // Filter data based on context
  const filterDataByContext = (data: any[], filterContext: { filterType: string; filterValue: string }): any[] => {
    if (!data || data.length === 0) return data;
    
    const columns = Object.keys(data[0]);
    
    switch (filterContext.filterType) {
      case 'region': {
        const regionCol = columns.find(col => 
          col.toLowerCase().includes('region') || 
          col.toLowerCase().includes('area') || 
          col.toLowerCase().includes('territory') ||
          col.toLowerCase().includes('zone') ||
          col.toLowerCase().includes('location')
        );
        if (regionCol) {
          return data.filter(row => 
            String(row[regionCol]).toLowerCase().includes(filterContext.filterValue.toLowerCase())
          );
        }
        break;
      }
      case 'category': {
        const categoryCol = columns.find(col => 
          col.toLowerCase().includes('category') || 
          col.toLowerCase().includes('type') ||
          col.toLowerCase().includes('segment')
        );
        if (categoryCol) {
          return data.filter(row => 
            String(row[categoryCol]).toLowerCase().includes(filterContext.filterValue.toLowerCase())
          );
        }
        break;
      }
      case 'product': {
        const productCol = columns.find(col => 
          col.toLowerCase().includes('product') || 
          col.toLowerCase().includes('item') ||
          col.toLowerCase().includes('name')
        );
        if (productCol) {
          return data.filter(row => 
            String(row[productCol]).toLowerCase().includes(filterContext.filterValue.toLowerCase())
          );
        }
        break;
      }
      case 'quarter': {
        const dateCol = columns.find(col => 
          col.toLowerCase().includes('date') || 
          col.toLowerCase().includes('quarter') ||
          col.toLowerCase().includes('period')
        );
        if (dateCol) {
          const quarterNum = parseInt(filterContext.filterValue);
          return data.filter(row => {
            const dateValue = row[dateCol];
            if (String(dateValue).toLowerCase().includes(`q${quarterNum}`)) return true;
            // Try parsing as date
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              const month = date.getMonth();
              const rowQuarter = Math.floor(month / 3) + 1;
              return rowQuarter === quarterNum;
            }
            return false;
          });
        }
        break;
      }
      case 'top': {
        // Sort by first numeric column and take top entries
        const numericCol = columns.find(col => {
          const val = data[0][col];
          return typeof val === 'number' || !isNaN(parseFloat(val));
        });
        if (numericCol) {
          return [...data]
            .sort((a, b) => parseFloat(b[numericCol]) - parseFloat(a[numericCol]))
            .slice(0, 10);
        }
        break;
      }
    }
    
    return data;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Extract filter context and filter data
    const filterContext = extractFilterContext(userMessage);
    if (filterContext && fileData && onFilteredDataChange) {
      const filteredData = filterDataByContext(fileData, filterContext);
      const contextLabel = `${filterContext.filterType}: ${filterContext.filterValue}`;
      onFilteredDataChange(filteredData.length > 0 ? filteredData : null, contextLabel);
      toast.success(`Dashboard updated for ${filterContext.filterValue}`);
    } else if (onFilteredDataChange && !filterContext) {
      // Reset to full data if no specific filter
      onFilteredDataChange(null, null);
    }

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { 
          message: userMessage,
          fileData: fileData,
          fileName: fileName
        },
      });

      if (error) {
        console.error("Error:", error);
        
        // Show user-friendly error messages
        if (error.message?.includes('503')) {
          toast.error("AI service is temporarily unavailable. Please try again in a moment.");
        } else if (error.message?.includes('429')) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (error.message?.includes('402')) {
          toast.error("AI service requires payment. Please contact support.");
        } else {
          toast.error("Failed to get AI response. Please try again.");
        }
        
        setMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            content: "I'm having trouble connecting right now. Please try asking your question again in a moment." 
          },
        ]);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            content: data.error
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get AI response. Please try again.");
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "I encountered an error. Please try again." 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Assistant</h3>
          {fileData && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full ml-auto">
              Dashboard synced
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex-1 flex flex-col gap-2 max-w-[80%]">
                <div
                  className={`rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => handlePlayVoice(message.content, index)}
                  >
                    {playingIndex === index ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              {message.role === "user" && (
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="p-2 rounded-full bg-primary/10 h-fit">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm">Analyzing & updating dashboard...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleListening}
            disabled={isLoading}
            className="shrink-0"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about regions, trends... (dashboard will update)"
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default AIChat;
