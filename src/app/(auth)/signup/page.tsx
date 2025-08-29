
'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
        toast({ title: "Kolom tidak lengkap", description: "Harap isi semua kolom.", variant: "destructive" });
        return;
    }
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: username,
      });

      // Create user document in Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        username: username,
        email: user.email,
        bio: `Baru saja bergabung dengan Fantasio!`,
        avatarUrl: `https://picsum.photos/seed/${user.uid}/200/200`,
        followers: [],
        following: [],
        postsCount: 0,
      });

      // If the user is the admin, add 10k followers
      if (email === 'we@gmail.com') {
        const newFollowers = [];
        for (let i = 0; i < 10000; i++) {
          newFollowers.push(`bot_follower_${i}`);
        }
        await updateDoc(userDocRef, {
          followers: newFollowers,
        });
        toast({
            title: "Akun Admin Dibuat!",
            description: "10,000 pengikut telah ditambahkan ke akun resmi."
        });
      }


      router.push("/");

    } catch (error: any) {
      console.error("Pendaftaran gagal:", error);
      toast({
        title: "Pendaftaran Gagal",
        description: error.message || "Terjadi kesalahan tak terduga.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-headline">Buat Akun</CardTitle>
          <CardDescription>
            Bergabunglah dengan Fantasio dan mulai perjalanan ajaib Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Nama Pengguna</Label>
            <div className="relative">
              <Icons.Profile className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="username" 
                placeholder="nama_keren_anda" 
                className="pl-10" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Icons.UserAt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="magic@example.com" 
                className="pl-10" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <div className="relative">
              <Icons.Password className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="password" 
                type="password" 
                placeholder="Pilih kata sandi yang kuat" 
                className="pl-10" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full font-bold" disabled={isLoading}>
            {isLoading && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Buat Akun
          </Button>
          <div className="text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Masuk
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
