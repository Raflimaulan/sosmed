
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { PostCard } from "@/components/post-card";
import { Skeleton } from '@/components/ui/skeleton';
import type { Post } from "@/types";
import { Icons } from '@/components/icons';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const postsCollection = collection(firestore, 'posts');
    const q = query(postsCollection, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
        console.error("Error mengambil data postingan:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="flex justify-center w-full min-h-screen p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-2xl space-y-8">
                <Skeleton className="h-[750px] w-full rounded-xl" />
                <Skeleton className="h-[750px] w-full rounded-xl" />
            </div>
        </div>
    );
  }
  
  if(posts.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-muted-foreground">
              <Icons.Home className="w-24 h-24 mb-4" />
              <h3 className="text-xl font-bold">Selamat Datang di Fantasio</h3>
              <p>Di sini sepi... jadilah yang pertama memposting!</p>
          </div>
      )
  }

  return (
    <div className="flex justify-center w-full min-h-screen p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl space-y-8">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
