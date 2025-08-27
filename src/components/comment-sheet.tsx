
'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { Comment } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

interface CommentSheetProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentSheet({ postId, open, onOpenChange }: CommentSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!postId || !open) return;
    
    setIsLoading(true);
    const commentsRef = collection(firestore, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        setComments(commentsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching comments:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [postId, open]);

  useEffect(() => {
    // Scroll to bottom when new comments are added
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [comments]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    const commentsRef = collection(firestore, 'posts', postId, 'comments');
    try {
        await addDoc(commentsRef, {
            userId: user.uid,
            username: user.displayName,
            avatarUrl: user.photoURL,
            text: newComment,
            timestamp: serverTimestamp()
        });
        setNewComment("");
    } catch (error) {
         console.error("Error adding comment:", error);
         toast({ title: "Failed to add comment", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader className="text-center">
          <SheetTitle>Comments</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
            <div className="space-y-4" ref={scrollAreaRef}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Icons.Spinner className="w-8 h-8 animate-spin" />
                    </div>
                ) : comments.length > 0 ? (
                    comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                        <Link href={`/${comment.userId}`}>
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={comment.avatarUrl} alt={comment.username} data-ai-hint="person avatar" />
                                <AvatarFallback>{comment.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="flex-1 text-sm">
                        <p>
                            <Link href={`/${comment.userId}`} className="font-bold hover:underline">
                            {comment.username}
                            </Link>{" "}
                            {comment.text}
                        </p>
                        </div>
                    </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground pt-10">
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                )}
            </div>
            </ScrollArea>
        </div>

        <div className="mt-auto border-t pt-4">
          <form onSubmit={handleCommentSubmit} className="relative w-full">
            <Input
              placeholder="Add a comment..."
              className="pr-12 h-12"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-primary"
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? (
                <Icons.Spinner className="animate-spin" />
              ) : (
                <Icons.Send />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
