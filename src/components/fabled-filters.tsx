
'use client';

import { useState } from "react";
import Image from "next/image";
import { styleImage } from "@/ai/flows/style-image";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";

interface FabledFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalImageUri: string;
  onImageStyled: (styledImageUri: string) => void;
}

const predefinedFilters = [
  { name: "Cat Air Berkilau", prompt: "Lukisan cat air yang berkilauan dan cerah dengan tepi yang lembut dan sorotan yang bersinar." },
  { name: "Lukisan Minyak Misterius", prompt: "Lukisan minyak klasik dengan pencahayaan dramatis, tekstur yang kaya, dan sentuhan realisme magis." },
  { name: "Sketsa Angkasa", prompt: "Sketsa pensil detail dengan pola kosmik yang berputar dan bintang-bintang di latar belakang." },
  { name: "Hutan Ajaib", prompt: "Ubah gambar agar terlihat seperti diambil di hutan ajaib dengan flora bercahaya dan cahaya lembut yang berbintik-bintik." },
  { name: "Golem Steampunk", prompt: "Bayangkan kembali subjek sebagai golem steampunk, dengan roda gigi, kuningan, dan pipa yang bersinar." },
  { name: "Pahlawan Anime", prompt: "Gambar ulang gambar dalam gaya anime modern yang dinamis dengan garis tebal dan warna-warna cerah." },
];

export function FabledFilters({ open, onOpenChange, originalImageUri, onImageStyled }: FabledFiltersProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleApplyFilter = async (prompt: string) => {
    if (!prompt) {
      toast({ title: "Mantra kosong!", description: "Harap berikan mantra gaya.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setGeneratedImage(null);
    try {
      const result = await styleImage({
        photoDataUri: originalImageUri,
        prompt: prompt,
      });
      setGeneratedImage(result.stylizedImage);
    } catch (error) {
      console.error("Kesalahan menerapkan filter:", error);
      toast({
        title: "Alkimia Gagal",
        description: "AI gagal mengubah gambar. Coba mantra lain.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmSelection = async () => {
    if (generatedImage && user) {
        onImageStyled(generatedImage);
        onOpenChange(false);
        setGeneratedImage(null);
    }
  }
  
  const handleClose = () => {
    onOpenChange(false);
    setGeneratedImage(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Filter Legendaris</DialogTitle>
          <DialogDescription>
            Pilih mantra sihir untuk mengubah gambarmu, atau ciptakan sendiri.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
            <div className="flex flex-col gap-4">
                 <h3 className="font-semibold text-center">Pratinjau</h3>
                 <Card className="flex-1 w-full relative overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-card-foreground/5">
                            <Icons.Spinner className="w-16 h-16 animate-spin text-primary mb-4" />
                            <p>Meracik mantra...</p>
                            <p className="text-xs">(Ini mungkin butuh beberapa saat)</p>
                        </div>
                    ) : (
                         <Image src={generatedImage ?? originalImageUri} alt="Pratinjau gambar" fill className="object-contain" />
                    )}
                 </Card>
            </div>
            <div className="flex flex-col min-h-0">
                <Tabs defaultValue="predefined" className="flex flex-col flex-1">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="predefined">Mantra Bawaan</TabsTrigger>
                    <TabsTrigger value="custom">Mantra Kustom</TabsTrigger>
                  </TabsList>
                  <TabsContent value="predefined" className="flex-1 overflow-hidden mt-4">
                    <ScrollArea className="h-full pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            {predefinedFilters.map((filter) => (
                            <Button key={filter.name} variant="outline" className="h-20 text-wrap" onClick={() => handleApplyFilter(filter.prompt)} disabled={isLoading}>
                                {filter.name}
                            </Button>
                            ))}
                        </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="custom" className="flex flex-col gap-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Jelaskan gaya yang ingin Anda terapkan. Contoh: "Lukisan Van Gogh dengan langit malam berbintang".
                    </p>
                    <Input 
                        placeholder="Kata-kata ajaibmu..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button onClick={() => handleApplyFilter(customPrompt)} disabled={isLoading || !customPrompt.trim()}>
                        <Icons.Sparkles className="mr-2" />
                        Racik Mantra Kustom
                    </Button>
                  </TabsContent>
                </Tabs>
            </div>
        </div>

        <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose}>Batal</Button>
            <Button onClick={handleConfirmSelection} disabled={!generatedImage || isLoading}>
                {isLoading ? <Icons.Spinner className="mr-2 animate-spin" /> : <Icons.Verified className="mr-2" />}
                Terapkan & Gunakan Gambar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
