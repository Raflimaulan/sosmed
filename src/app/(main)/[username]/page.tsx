
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { User as UserProfile, Post } from '@/types';
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.username as string; 
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);

  const isOwnProfile = currentUser?.uid === userProfile?.uid;

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const userDocRef = doc(firestore, 'users', userId);
    
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as UserProfile;
        setUserProfile(userData);
        if (currentUser) {
            setIsFollowing(userData.followers.includes(currentUser.uid));
        }

        if (userData.savedPosts && userData.savedPosts.length > 0) {
            fetchSavedPosts(userData.savedPosts);
        } else {
            setSavedPosts([]);
            setLoadingSavedPosts(false);
        }
      } else {
        console.log('Pengguna tidak ditemukan!');
        setUserProfile(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error mengambil data pengguna:", error);
        setLoading(false);
    });

    const postsCollection = collection(firestore, 'posts');
    const q = query(postsCollection, where('userId', '==', userId));

    const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));
        
        postsData.sort((a, b) => {
            const dateA = a.timestamp?.toDate() || new Date(0);
            const dateB = b.timestamp?.toDate() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setPosts(postsData);
        setLoadingPosts(false);
    }, (error) => {
        console.error("Error mengambil data postingan:", error);
        setLoadingPosts(false);
    });

    return () => {
        unsubscribeUser();
        unsubscribePosts();
    };
  }, [userId, currentUser]);
  
  const fetchSavedPosts = async (postIds: string[]) => {
    if (postIds.length === 0) return;
    setLoadingSavedPosts(true);
    try {
        const savedPostsData: Post[] = [];
        for (let i = 0; i < postIds.length; i += 10) {
            const chunk = postIds.slice(i, i + 10);
            const postsQuery = query(collection(firestore, 'posts'), where('__name__', 'in', chunk));
            const querySnapshot = await getDocs(postsQuery);
            querySnapshot.forEach(doc => {
                savedPostsData.push({ id: doc.id, ...doc.data() } as Post);
            });
        }
        setSavedPosts(savedPostsData);
    } catch (error) {
        console.error("Error mengambil data postingan tersimpan:", error);
    } finally {
        setLoadingSavedPosts(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !userProfile || isOwnProfile || isFollowLoading) return;
    setIsFollowLoading(true);

    const currentUserRef = doc(firestore, 'users', currentUser.uid);
    const targetUserRef = doc(firestore, 'users', userProfile.uid);

    try {
        if (isFollowing) {
            // Unfollow
            await updateDoc(currentUserRef, {
                following: arrayRemove(userProfile.uid)
            });
            await updateDoc(targetUserRef, {
                followers: arrayRemove(currentUser.uid)
            });
        } else {
            // Follow
            await updateDoc(currentUserRef, {
                following: arrayUnion(userProfile.uid)
            });
            await updateDoc(targetUserRef, {
                followers: arrayUnion(currentUser.uid)
            });
        }
    } catch (error) {
        console.error("Gagal mengikuti/berhenti mengikuti pengguna:", error);
    } finally {
        setIsFollowLoading(false);
    }
  };


  const handleStartConversation = async () => {
    if (!currentUser || !userProfile || isOwnProfile) return;
    setIsMessaging(true);

    try {
      const chatId = currentUser.uid > userProfile.uid
        ? `${currentUser.uid}_${userProfile.uid}`
        : `${userProfile.uid}_${currentUser.uid}`;
      
      const chatDocRef = doc(firestore, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (!chatDoc.exists()) {
        await setDoc(chatDocRef, {
          userIds: [currentUser.uid, userProfile.uid],
          users: {
            [currentUser.uid]: {
              username: currentUser.displayName || 'Pengguna',
              avatarUrl: currentUser.photoURL || `https://picsum.photos/seed/${currentUser.uid}/200/200`,
            },
            [userProfile.uid]: {
              username: userProfile.username,
              avatarUrl: userProfile.avatarUrl,
            }
          },
          lastMessage: null,
          lastMessageTimestamp: serverTimestamp(),
        });
      }
      
      router.push('/messages');

    } catch (error) {
      console.error("Error memulai percakapan: ", error);
    } finally {
      setIsMessaging(false);
    }
  }
  
  const PostGrid = ({ posts, loading, type }: { posts: Post[], loading: boolean, type: 'user' | 'saved' }) => {
    const imagePosts = posts.filter(post => post.imageUrl);

    const emptyStateMessages = {
        user: {
            icon: Icons.Create,
            title: "Belum ada postingan",
            message: "Postingan dari pengguna ini akan muncul di sini."
        },
        saved: {
            icon: Icons.Bookmark,
            title: "Tidak ada postingan tersimpan",
            message: "Postingan yang Anda simpan akan muncul di sini."
        }
    }
    const { icon: Icon, title, message } = emptyStateMessages[type];
    
    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-4 mt-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square" />)}
            </div>
        )
    }

    if (imagePosts.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Icon className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-bold">{title}</h3>
                <p>{message}</p>
            </div>
        )
    }

    return (
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-4 mt-4">
            {imagePosts.map(post => (
            <Card key={post.id} className="aspect-square relative group overflow-hidden">
                <Image src={post.imageUrl!} alt="Postingan pengguna" fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint="fantasy" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-4 text-white font-bold">
                    <div className="flex items-center gap-1"><Icons.Like className="w-5 h-5" /> {post.likes.length}</div>
                    <div className="flex items-center gap-1"><Icons.Comment className="w-5 h-5" /> {post.comments.length}</div>
                </div>
                </div>
            </Card>
            ))}
        </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 animate-pulse">
        <header className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-10">
          <Skeleton className="w-24 h-24 sm:w-36 sm:h-36 rounded-full border-4 border-primary" />
          <div className="flex flex-col items-center sm:items-start gap-4 flex-1">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="flex items-center gap-8 text-sm">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-5 w-72" />
            </div>
          </div>
        </header>
      </div>
    );
  }

  if (!userProfile) {
    return <div className="text-center p-8">Pengguna tidak ditemukan.</div>;
  }
  
  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <header className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 sm:gap-8 mb-10">
        <Avatar className="w-24 h-24 sm:w-36 sm:h-36 border-4 border-primary mx-auto sm:mx-0">
          <AvatarImage src={userProfile.avatarUrl} alt={userProfile.username} data-ai-hint="person avatar" />
          <AvatarFallback className="text-4xl">{userProfile.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center sm:items-start gap-4">
          <div className="w-full flex flex-col sm:flex-row items-center sm:justify-start gap-4">
            <h1 className="text-2xl font-light text-foreground/80 flex items-center gap-2 order-1 sm:order-none">
              {userProfile.username}
              {(userProfile.followers?.length ?? 0) >= 5 && (
                <Icons.Verified className="w-6 h-6 text-blue-500" />
              )}
            </h1>
            {isOwnProfile && (
              <div className="flex gap-4 order-3 sm:order-none w-full sm:w-auto">
                <Button asChild variant="secondary" className="flex-1 sm:flex-initial">
                  <Link href="/settings/profile">Edit Profil</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-8 text-sm w-full justify-center sm:justify-start border-y sm:border-none py-2 sm:py-0">
            <div><span className="font-bold">{posts.length ?? 0}</span> postingan</div>
            <div><span className="font-bold">{userProfile.followers?.length ?? 0}</span> pengikut</div>
            <div><span className="font-bold">{userProfile.following?.length ?? 0}</span> mengikuti</div>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-bold font-headline">{userProfile.username}</h2>
            <p className="text-foreground/70 whitespace-pre-wrap">{userProfile.bio}</p>
          </div>
          {!isOwnProfile && (
            <div className="flex gap-4 w-full sm:w-auto pt-2">
              <Button onClick={handleFollow} disabled={isFollowLoading} className="flex-1 sm:flex-initial">
                {isFollowLoading ? <Icons.Spinner className="animate-spin" /> : (isFollowing ? 'Mengikuti' : 'Ikuti')}
              </Button>
            </div>
          )}
        </div>
      </header>
      
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts"><Icons.Create className="mr-2" />Postingan</TabsTrigger>
          <TabsTrigger value="saved" disabled={!isOwnProfile}><Icons.Bookmark className="mr-2" />Tersimpan</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <PostGrid posts={posts} loading={loadingPosts} type="user" />
        </TabsContent>
        <TabsContent value="saved">
          {isOwnProfile ? (
            <PostGrid posts={savedPosts} loading={loadingSavedPosts} type="saved" />
          ) : (
             <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>Anda hanya dapat melihat postingan yang Anda simpan sendiri.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
