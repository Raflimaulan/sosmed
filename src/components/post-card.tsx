
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { id } from 'date-fns/locale';
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
import { AnimateImageDialog } from "./animate-image-dialog";
import { Slider } from "./ui/slider";


interface PostCardProps {
  post: Post;
}

const AudioPlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSliderChange = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };
    
    const formatTime = (time: number) => {
        if (isNaN(time) || time === 0) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('ended', () => setIsPlaying(false));

            return () => {
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('ended', () => setIsPlaying(false));
            };
        }
    }, []);

    return (
        <div className="flex items-center gap-3 w-full bg-muted/50 p-3 rounded-lg">
             <audio ref={audioRef} src={src} preload="metadata"></audio>
             <Button onClick={togglePlayPause} variant="ghost" size="icon" className="rounded-full">
                {isPlaying ? <Icons.Pause className="w-5 h-5" /> : <Icons.Play className="w-5 h-5" />}
             </Button>
             <div className="flex-1 flex items-center gap-2">
                <Slider
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    onValueChange={handleSliderChange}
                    className="flex-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">{formatTime(currentTime)} / {formatTime(duration)}</span>
             </div>
        </div>
    )
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
    const [showAnimateDialog, setShowAnimateDialog] = useState(false);


    const isOwner = user?.uid === post.userId;
    const timeAgo = post.timestamp ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true, locale: id }) : 'baru saja';

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
            toast({ title: "Harap login untuk menyukai postingan", variant: "destructive" });
            return;
        }
        const postRef = doc(firestore, "posts", post.id);
        const currentlyLiked = isLiked;
        try {
            await updateDoc(postRef, {
                likes: currentlyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (error) {
            console.error("Error menyukai postingan:", error);
            toast({ title: "Gagal memperbarui suka", variant: "destructive" });
        }
    };
    
    const handleBookmark = async () => {
        if (!user) {
            toast({ title: "Harap login untuk menyimpan postingan", variant: "destructive" });
            return;
        }
        const userRef = doc(firestore, "users", user.uid);
        try {
            await updateDoc(userRef, {
                savedPosts: isBookmarked ? arrayRemove(post.id) : arrayUnion(post.id)
            });
        } catch (error) {
            console.error("Error menyimpan postingan:", error);
            toast({ title: "Gagal menyimpan postingan", variant: "destructive" });
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
                title: "Postingan Dihapus",
                description: "Postingan Anda telah berhasil dihapus.",
            });
        } catch (error) {
            console.error("Error menghapus postingan: ", error);
            toast({
                title: "Error",
                description: "Gagal menghapus postingan. Silakan coba lagi.",
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
                    {(postUser?.followers?.length ?? 0) >= 5 && (
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
                            <span className="sr-only">Opsi lainnya</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {isOwner && (
                            <>
                                <DropdownMenuItem onSelect={() => setShowDeleteAlert(true)} className="text-red-500">
                                    <Icons.Delete className="mr-2 h-4 w-4" />
                                    Hapus Postingan
                                </DropdownMenuItem>
                            </>
                        )}
                        {!isOwner && (
                             <DropdownMenuItem asChild>
                                <Link href={`/${post.userId}`}>
                                    <Icons.Profile className="mr-2 h-4 w-4" />
                                    Lihat Profil
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

            </CardHeader>
            
            {post.imageUrl && (
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
            )}

            {post.audioUrl && (
                <CardContent className="p-4">
                    <AudioPlayer src={post.audioUrl} />
                </CardContent>
            )}

            <CardFooter className="flex flex-col items-start gap-3 p-4">
                <div className="flex items-center w-full">
                <Button variant="ghost" size="icon" onClick={handleLike}>
                    <Icons.Like
                    className={cn("transition-all", isLiked ? "fill-red-500 text-red-500" : "")}
                    />
                    <span className="sr-only">Suka</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowCommentSheet(true)}>
                    <Icons.Comment />
                    <span className="sr-only">Komentar</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => post.imageUrl && setShowAnimateDialog(true)} disabled={!post.imageUrl}>
                    <Icons.Animate />
                    <span className="sr-only">Hidupkan</span>
                </Button>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={handleBookmark}>
                    <Icons.Bookmark className={cn("transition-all", isBookmarked ? "fill-primary text-primary" : "")}/>
                    <span className="sr-only">Simpan</span>
                </Button>
                </div>
                
                {post.likes.length > 0 && (
                    <div className="font-bold text-sm">{post.likes.length} suka</div>
                )}
                
                {post.caption && (
                    <div className="text-sm w-full">
                        <Link href={`/${post.userId}`} className="font-bold hover:underline">
                            {post.username}
                        </Link>{" "}
                        <span className="whitespace-pre-wrap">{post.caption}</span>
                    </div>
                )}

                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {post.hashtags.map((tag) => (
                            <Link key={tag} href={`/tags/${tag}`} className="text-accent hover:underline text-sm">
                            #{tag}
                            </Link>
                        ))}
                    </div>
                )}
                
                {commentsCount > 0 && (
                    <div className="text-sm text-muted-foreground cursor-pointer" onClick={() => setShowCommentSheet(true)}>
                        Lihat semua {commentsCount} komentar
                    </div>
                )}
            </CardFooter>
            </Card>
            <CommentSheet 
                postId={post.id} 
                open={showCommentSheet} 
                onOpenChange={setShowCommentSheet} 
            />
             {post.imageUrl && (
                <AnimateImageDialog
                    open={showAnimateDialog}
                    onOpenChange={setShowAnimateDialog}
                    originalImageUri={post.imageUrl}
                />
            )}
            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus postingan Anda secara permanen
                        dan semua komentarnya dari server kami.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeletePost}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" /> : "Hapus"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
