
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { arrayRemove, arrayUnion, collection, doc, onSnapshot, updateDoc, deleteDoc, getDocs, writeBatch, increment, query, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { Post, User as UserProfile } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { CommentSheet } from "./comment-sheet";


interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLiked, setIsLiked] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);
    const [showCommentSheet, setShowCommentSheet] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [postUser, setPostUser] = useState<UserProfile | null>(null);

    const isOwner = user?.uid === post.userId;
    const timeAgo = post.timestamp ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'just now';

    useEffect(() => {
        if (user) {
            setIsLiked(post.likes.includes(user.uid));
        }
    }, [post.likes, user]);
    
    useEffect(() => {
        if (!post.id) return;
        const commentsRef = collection(firestore, 'posts', post.id, 'comments');
        const q = query(commentsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCommentsCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [post.id]);
    
    useEffect(() => {
        if (!user) return;
    
        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                setIsBookmarked(userData.savedPosts?.includes(post.id));
            }
        });
    
        return () => unsubscribe();
    }, [user, post.id]);

    useEffect(() => {
      if (post.userId) {
        const userDocRef = doc(firestore, 'users', post.userId);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setPostUser(docSnap.data() as UserProfile);
          }
        });
        return () => unsubscribe();
      }
    }, [post.userId]);

    const handleLike = async () => {
        if (!user) {
            toast({ title: "Please login to like posts", variant: "destructive" });
            return;
        }
        const postRef = doc(firestore, "posts", post.id);
        try {
            await updateDoc(postRef, {
                likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (error) {
            console.error("Error liking post:", error);
            toast({ title: "Failed to update like", variant: "destructive" });
        }
    };
    
    const handleBookmark = async () => {
        if (!user) {
            toast({ title: "Please login to save posts", variant: "destructive" });
            return;
        }
        const userRef = doc(firestore, "users", user.uid);
        try {
            await updateDoc(userRef, {
                savedPosts: isBookmarked ? arrayRemove(post.id) : arrayUnion(post.id)
            });
        } catch (error) {
            console.error("Error bookmarking post:", error);
            toast({ title: "Failed to save post", variant: "destructive" });
        }
    };

    const handleDeletePost = async () => {
        if (!isOwner) return;
        setIsDeleting(true);

        try {
            // Delete post document and its comments subcollection
            const postRef = doc(firestore, 'posts', post.id);
            const commentsRef = collection(firestore, 'posts', post.id, 'comments');
            const commentsSnapshot = await getDocs(commentsRef);
            
            const batch = writeBatch(firestore);
            commentsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            batch.delete(postRef);
            await batch.commit();

            // Decrement user's post count
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                postsCount: increment(-1)
            });

            toast({
                title: "Post Deleted",
                description: "Your post has been successfully deleted.",
            });
        } catch (error) {
            console.error("Error deleting post: ", error);
            toast({
                title: "Error",
                description: "Failed to delete post. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
            setShowDeleteAlert(false);
        }
    };

    return (
        <>
            <Card className="rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 p-4">
                <Link href={`/${post.userId}`}>
                <Avatar>
                    <AvatarImage src={post.avatarUrl} alt={post.username} data-ai-hint="person avatar" />
                    <AvatarFallback>{post.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                </Link>
                <div className="flex flex-col">
                <Link href={`/${post.userId}`} className="font-bold hover:underline flex items-center gap-1">
                    {post.username}
                    {(postUser?.followers?.length ?? 0) >= 1000 && (
                      <Icons.Verified className="w-4 h-4 text-blue-500" />
                    )}
                </Link>
                <span className="text-xs text-muted-foreground">
                    {timeAgo}
                </span>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-auto">
                            <Icons.More />
                            <span className="sr-only">More options</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {isOwner && (
                            <>
                                <DropdownMenuItem onSelect={() => setShowDeleteAlert(true)} className="text-red-500">
                                    <Icons.Delete className="mr-2 h-4 w-4" />
                                    Delete Post
                                </DropdownMenuItem>
                            </>
                        )}
                        {!isOwner && (
                             <DropdownMenuItem asChild>
                                <Link href={`/${post.userId}`}>
                                    <Icons.Profile className="mr-2 h-4 w-4" />
                                    View Profile
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

            </CardHeader>
            <CardContent className="p-0">
                <div className="relative aspect-[4/5] w-full">
                <Image
                    src={post.imageUrl}
                    alt={post.caption}
                    fill
                    className="object-cover"
                    data-ai-hint="fantasy landscape"
                />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-3 p-4">
                <div className="flex items-center w-full">
                <Button variant="ghost" size="icon" onClick={handleLike}>
                    <Icons.Like
                    className={cn("transition-all", isLiked ? "fill-red-500 text-red-500" : "")}
                    />
                    <span className="sr-only">Like</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowCommentSheet(true)}>
                    <Icons.Comment />
                    <span className="sr-only">Comment</span>
                </Button>
                <Button variant="ghost" size="icon">
                    <Icons.Send />
                    <span className="sr-only">Share</span>
                </Button>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={handleBookmark}>
                    <Icons.Bookmark className={cn("transition-all", isBookmarked ? "fill-primary text-primary" : "")}/>
                    <span className="sr-only">Bookmark</span>
                </Button>
                </div>
                <div className="font-bold text-sm">{post.likes.length} likes</div>
                <div className="text-sm">
                <Link href={`/${post.userId}`} className="font-bold hover:underline">
                    {post.username}
                </Link>{" "}
                <span>{post.caption}</span>
                </div>
                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex gap-2">
                        {post.hashtags.map((tag) => (
                            <Link key={tag} href={`/tags/${tag}`} className="text-accent hover:underline text-sm">
                            #{tag}
                            </Link>
                        ))}
                    </div>
                )}
                
                {commentsCount > 0 && (
                    <div className="text-sm text-muted-foreground cursor-pointer" onClick={() => setShowCommentSheet(true)}>
                        View all {commentsCount} comments
                    </div>
                )}
            </CardFooter>
            </Card>
            <CommentSheet 
                postId={post.id} 
                open={showCommentSheet} 
                onOpenChange={setShowCommentSheet} 
            />
            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        post and all its comments from our servers.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeletePost}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
