
"use client";

import { useState } from "react";
import { suggestHashtags } from "@/ai/flows/suggest-hashtags";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface HashtagSuggesterProps {
  postContent: string;
  onHashtagClick: (hashtag: string) => void;
}

export function HashtagSuggester({ postContent, onHashtagClick }: HashtagSuggesterProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    if (!postContent.trim()) {
      toast({
        title: "Keterangan kosong",
        description: "Harap tulis keterangan sebelum menyarankan tagar.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestHashtags({ postContent });
      setSuggestions(result.hashtags);
    } catch (error) {
      console.error("Kesalahan menyarankan tagar:", error);
      toast({
        title: "Kesalahan AI",
        description: "Tidak dapat menghasilkan saran tagar. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Button type="button" onClick={handleSuggest} disabled={isLoading}>
          {isLoading ? (
            <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.Hashtag className="mr-2 h-4 w-4" />
          )}
          Sarankan Tagar dengan AI
        </Button>
      </div>
      
      {(isLoading || suggestions.length > 0) && (
        <div className="p-4 border rounded-lg bg-card-foreground/5 min-h-[80px]">
          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Tagar yang Disarankan:</h4>
          {isLoading ? (
             <div className="flex items-center space-x-2">
                <Icons.Spinner className="h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Meramu ide...</span>
             </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm px-3 py-1"
                  onClick={() => onHashtagClick(tag)}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
