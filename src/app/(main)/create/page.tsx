
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { addDoc, collection, doc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { HashtagSuggester } from "@/components/hashtag-suggester";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CreatePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostSubmit = async () => {
    if (!user || !imagePreview) {
        toast({
            title: "Missing Information",
            description: "Please select an image and write a caption.",
            variant: "destructive"
        });
        return;
    }
    setIsLoading(true);

    try {
        // 1. Create post document in Firestore with Base64 image
        const postsCollectionRef = collection(firestore, 'posts');
        await addDoc(postsCollectionRef, {
            userId: user.uid,
            username: user.displayName,
            avatarUrl: user.photoURL,
            imageUrl: imagePreview, // Save the Base64 data URI
            caption: caption,
            hashtags: [], // TODO: Extract hashtags from caption or from suggester
            likes: [],
            comments: [],
            timestamp: serverTimestamp(),
        });

        // 2. Update user's post count
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
            postsCount: increment(1)
        });

        toast({
            title: "Post Created!",
            description: "Your magical moment has been shared.",
        });

        router.push('/');

    } catch (error: any) {
        console.error("Error creating post:", error);
        toast({
            title: "Error Creating Post",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start w-full min-h-screen p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create New Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div 
            className={cn(
                "flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg border-border bg-card-foreground/5 hover:bg-card-foreground/10 transition-colors cursor-pointer relative overflow-hidden",
                imagePreview && "border-solid"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
                <Image src={imagePreview} alt="Selected preview" fill className="object-cover" />
            ): (
                <div className="text-center">
                    <Icons.Image className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                    <p className="text-muted-foreground">Drag & drop an image or click to upload</p>
                </div>
            )}
            <input 
                type="file" 
                className="sr-only" 
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/png, image/jpeg, image/gif"
            />
          </div>

          <div className="space-y-2">
             <label htmlFor="caption" className="font-medium">Caption</label>
             <Textarea 
                id="caption" 
                placeholder="Write something magical..." 
                rows={4} 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
          </div>
          
          <HashtagSuggester />

        </CardContent>
        <CardFooter>
          <Button 
            className="w-full font-bold text-lg py-6" 
            onClick={handlePostSubmit}
            disabled={isLoading || !imageFile}
          >
            {isLoading && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Share Post
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
