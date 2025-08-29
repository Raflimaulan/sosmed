
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  username: z.string().min(3, { message: "Nama pengguna minimal 3 karakter." }).max(20),
  bio: z.string().max(160, { message: "Bio tidak boleh lebih dari 160 karakter." }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      bio: '',
    },
  });

  useEffect(() => {
    if (user) {
      // Fetch user data from Firestore to populate the form
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          form.reset({
            username: data.username,
            bio: data.bio || '',
          });
          setAvatarPreview(data.avatarUrl);
        }
        setIsPageLoading(false);
      });
    } else if (user === null) {
      // If user is not logged in, redirect
      router.push('/login');
    }
  }, [user, router, form]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsLoading(true);

    try {
      let newAvatarUrl = avatarPreview;

      // 1. Upload new avatar if selected
      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${user.uid}/${avatarFile.name}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        newAvatarUrl = await getDownloadURL(snapshot.ref);
      }

      // 2. Update Firestore document
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        username: data.username,
        bio: data.bio,
        ...(newAvatarUrl && { avatarUrl: newAvatarUrl }),
      });

      // 3. Update Firebase Auth profile
      await updateProfile(auth.currentUser!, {
        displayName: data.username,
        ...(newAvatarUrl && { photoURL: newAvatarUrl }),
      });
      
      toast({
        title: "Profil Diperbarui",
        description: "Profil Anda telah berhasil diperbarui.",
      });

      // Redirect to the updated profile page
      router.push(`/${user.uid}`);

    } catch (error: any) {
      console.error("Kesalahan memperbarui profil:", error);
      toast({
        title: "Pembaruan Gagal",
        description: error.message || "Terjadi kesalahan tak terduga.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isPageLoading) {
      return (
           <div className="flex justify-center items-center w-full min-h-screen p-4 sm:p-6 md:p-8">
               <Card className="w-full max-w-2xl animate-pulse">
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-24 h-24 rounded-full" />
                            <div className="space-y-2">
                               <Skeleton className="h-10 w-28" />
                               <Skeleton className="h-5 w-48" />
                            </div>
                        </div>
                        <div className="space-y-2">
                           <Skeleton className="h-5 w-20" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="space-y-2">
                           <Skeleton className="h-5 w-12" />
                           <Skeleton className="h-20 w-full" />
                        </div>
                    </CardContent>
                    <CardFooter>
                       <Skeleton className="h-12 w-full" />
                    </CardFooter>
               </Card>
           </div>
      )
  }


  return (
    <div className="flex justify-center items-center w-full min-h-screen p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Edit Profil</CardTitle>
              <CardDescription>
                Lakukan perubahan pada profil Anda di sini. Klik simpan setelah selesai.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center gap-4">
                <Avatar className="w-24 h-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <AvatarImage src={avatarPreview || undefined} alt="Avatar" data-ai-hint="person avatar" />
                  <AvatarFallback>
                    <Icons.Profile className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div>
                   <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Ganti Foto
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Maksimal 5MB.</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pengguna</FormLabel>
                    <FormControl>
                      <Input placeholder="nama_keren_anda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ceritakan sedikit tentang diri Anda"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full font-bold text-lg py-6" disabled={isLoading}>
                {isLoading && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
