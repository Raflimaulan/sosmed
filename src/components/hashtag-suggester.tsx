"use client";

import { useState } from "react";
import { suggestHashtags } from "@/ai/flows/suggest-hashtags";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea"; // Re-using for consistency

export function HashtagSuggester() {
  const [postContent, setPostContent] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    if (!postContent.trim()) {
      toast({
        title: "Caption is empty",
        description: "Please write a caption before suggesting hashtags.",
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
      console.error("Error suggesting hashtags:", error);
      toast({
        title: "AI Error",
        description: "Could not generate hashtag suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Button onClick={handleSuggest} disabled={isLoading}>
          {isLoading ? (
            <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.Hashtag className="mr-2 h-4 w-4" />
          )}
          Suggest Hashtags with AI
        </Button>
      </div>
      
      {(isLoading || suggestions.length > 0) && (
        <div className="p-4 border rounded-lg border-border bg-card-foreground/5 min-h-[80px]">
          <h4 className="font-semibold mb-2">Suggested Hashtags:</h4>
          {isLoading ? (
             <div className="flex items-center space-x-2">
                <Icons.Spinner className="h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Conjuring ideas...</span>
             </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((tag, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors text-sm px-3 py-1">
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
