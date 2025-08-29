
'use client';

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { animateImage } from "@/ai/flows/animate-image";

interface AnimateImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalImageUri: string;
}

export function AnimateImageDialog({ open, onOpenChange, originalImageUri }: AnimateImageDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleAnimate = async () => {
    if (!prompt) {
      toast({ title: "Perintah kosong!", description: "Harap berikan perintah transformasi.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setGeneratedImage(null);
    try {
      const result = await animateImage({
        photoDataUri: originalImageUri,
        prompt: prompt,
      });
      setGeneratedImage(result.dreamClipImageUri);
      toast({ title: "Transformasi Berhasil!", description: "Sihirmu telah menciptakan gambar baru." });
    } catch (error: any) {
      console.error("Kesalahan mengubah gambar:", error);
      toast({
        title: "Transformasi Gagal",
        description: error.message || "AI gagal mengubah gambar. Coba mantra lain.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setPrompt("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Ubah Gambar dengan AI</DialogTitle>
          <DialogDescription>
            Ketikkan mantra untuk mengubah gambarmu. Contoh: "buat naganya bernapas api".
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 items-center">
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-card relative">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-card-foreground/5">
                        <Icons.Spinner className="w-16 h-16 animate-spin text-primary mb-4" />
                        <p>Merapal mantra transformasi...</p>
                    </div>
                ) : (
                    <Image src={generatedImage ?? originalImageUri} alt="Gambar pratinjau" fill className="object-contain" />
                )}
            </div>
            
            <div className="w-full space-y-2">
                <Input 
                    placeholder="Contoh: buat awan bergerak, buat mata berkedip..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                />
                <Button onClick={handleAnimate} disabled={isLoading || !prompt.trim()} className="w-full">
                    {isLoading ? <Icons.Spinner className="mr-2" /> : <Icons.Animate className="mr-2" />}
                    Ubah dengan Sihir AI
                </Button>
            </div>
        </div>

        <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose}>Tutup</Button>
            {/* Future "Post as new Clip" button can go here */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
