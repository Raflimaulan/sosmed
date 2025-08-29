
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { FabledFilters } from '@/components/fabled-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';

export default function CreatePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFabledFilters, setShowFabledFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for voice post
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [postType, setPostType] = useState("image");

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStatus('recording');
      setIsRecording(true);
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64Audio = reader.result as string;
            setAudioPreview(base64Audio);
        };

        setRecordingStatus('recorded');
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop()); // Stop microphone access
      };
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();

      // Start timer
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

    } catch (err) {
      console.error("Gagal mengakses mikrofon:", err);
      toast({
        title: "Akses Mikrofon Ditolak",
        description: "Harap izinkan akses ke mikrofon Anda di pengaturan browser.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if(timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };
  
  const resetRecording = () => {
    setAudioPreview(null);
    setRecordingStatus('idle');
    setRecordingTime(0);
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }


  const compressImage = (file: File | Blob, fileName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const targetSizeKB = 500;
      const targetSizeBytes = targetSizeKB * 1024;
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Gagal mendapatkan konteks kanvas'));
          }

          let width = img.width;
          let height = img.height;
          const maxDimension = 1280; // Max width/height of 1280px

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.9;
          const compress = () => {
              canvas.toBlob((blob) => {
                  if (blob && blob.size > targetSizeBytes && quality > 0.1) {
                      quality -= 0.1;
                      compress();
                  } else if (blob) {
                      const compressedReader = new FileReader();
                      compressedReader.onloadend = () => {
                          resolve(compressedReader.result as string);
                      };
                      compressedReader.readAsDataURL(blob);
                  } else {
                      // Fallback to original if blob fails
                      resolve(event.target?.result as string);
                  }
              }, 'image/jpeg', quality);
          };

          compress();
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const compressedDataUrl = await compressImage(file, file.name);
        setImagePreview(compressedDataUrl);
        // We no longer need the original file object as we have the compressed data URL
        setImageFile(null);
      } catch (error) {
        console.error("Kesalahan mengompres gambar:", error);
        toast({
          title: "Kompresi Gambar Gagal",
          description: "Tidak dapat memproses gambar. Coba gambar lain.",
          variant: "destructive",
        });
        // Fallback to original file preview if compression fails
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  const dataUriToBlob = (dataUri: string): Blob => {
    const byteString = atob(dataUri.split(',')[1]);
    const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  const handleImageStyled = async (styledImageUri: string) => {
    setIsProcessing(true);
    try {
      const imageBlob = dataUriToBlob(styledImageUri);
      const compressedUri = await compressImage(imageBlob, 'styled-image.jpg');
      setImagePreview(compressedUri);
      setImageFile(null);
    } catch (error) {
      console.error("Kesalahan mengompres gambar bergaya:", error);
      toast({
        title: "Pemrosesan Gambar Gagal",
        description: "Tidak dapat mengompres gambar bergaya.",
        variant: "destructive",
      });
      // Fallback to the uncompressed styled image
      setImagePreview(styledImageUri);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleHashtagClick = (hashtag: string) => {
    const newHashtag = `#${hashtag.replace(/#/g, '')}`;
    const pattern = new RegExp(`\\B${newHashtag}\\b`, 'g');
    if (!caption.match(pattern)) {
      setCaption(prev => `${prev} ${newHashtag}`.trim());
    }
  };

  const handlePostSubmit = async () => {
    if (!user) return;
    
    const isImagePostValid = postType === "image" && (imagePreview || caption.trim());
    const isVoicePostValid = postType === "voice" && audioPreview;

    if (!isImagePostValid && !isVoicePostValid) {
       toast({
            title: "Konten Hilang",
            description: "Harap tambahkan gambar, keterangan, atau pesan suara.",
            variant: "destructive"
        });
        return;
    }
    
    setIsLoading(true);

    try {
        const hashtags = caption.match(/#\\w+/g)?.map(h => h.substring(1)) || [];
        const postData: any = {
            userId: user.uid,
            username: user.displayName,
            avatarUrl: user.photoURL,
            caption: caption,
            hashtags: hashtags,
            likes: [],
            comments: [],
            timestamp: serverTimestamp(),
        };

        if (postType === 'image' && imagePreview) {
            postData.imageUrl = imagePreview;
        }

        if (postType === 'voice' && audioPreview) {
            postData.audioUrl = audioPreview;
        }

        await addDoc(collection(firestore, 'posts'), postData);

        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
            postsCount: increment(1)
        });

        toast({
            title: "Postingan Dibuat!",
            description: "Momen ajaib Anda telah dibagikan.",
        });

        router.push('/');

    } catch (error: any) {
        console.error("Error membuat postingan:", error);
        toast({
            title: "Gagal Membuat Postingan",
            description: error.message || "Terjadi kesalahan tak terduga.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || isProcessing || isRecording || 
    (postType === 'image' && !imagePreview && !caption.trim()) ||
    (postType === 'voice' && !audioPreview);

  return (
    <>
    <div className="flex justify-center items-start w-full min-h-screen p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Buat Postingan Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={postType} onValueChange={setPostType} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image" disabled={isRecording}>Gambar & Teks</TabsTrigger>
              <TabsTrigger value="voice" disabled={isRecording}>Pesan Suara</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="space-y-6 mt-6">
              <div 
                className={cn(
                    "flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg border-border bg-card-foreground/5 hover:bg-card-foreground/10 transition-colors cursor-pointer relative overflow-hidden",
                    (imagePreview || isProcessing) && "border-solid"
                )}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                {imagePreview && !isProcessing ? (
                    <Image src={imagePreview} alt="Pratinjau terpilih" fill className="object-cover" />
                ): (
                    <div className="text-center p-4">
                        {isProcessing ? (
                            <>
                                <Icons.Spinner className="w-16 h-16 text-primary animate-spin mb-4 mx-auto" />
                                <p className="text-muted-foreground">Memproses gambar...</p>
                            </>
                        ) : (
                            <>
                                <Icons.Image className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                                <p className="text-muted-foreground">Seret & lepas gambar atau klik untuk mengunggah</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Gambar akan dikompres menjadi ~500KB</p>
                            </>
                        )}
                    </div>
                )}
                <input 
                    type="file" 
                    className="sr-only" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/png, image/jpeg, image/gif"
                    disabled={isProcessing}
                />
              </div>
              
              {imagePreview && (
                <div>
                  <Button type="button" onClick={() => setShowFabledFilters(true)} disabled={isProcessing}>
                    <Icons.Sparkles className="mr-2 h-4 w-4" />
                    Terapkan Filter Legendaris
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="voice" className="space-y-6 mt-6">
              <div className="flex flex-col items-center justify-center w-full h-60 border-2 border-dashed rounded-lg border-border bg-card-foreground/5">
                {recordingStatus === 'idle' && (
                  <Button onClick={startRecording} size="lg" className="rounded-full w-24 h-24">
                    <Icons.Mic className="w-10 h-10" />
                  </Button>
                )}
                {recordingStatus === 'recording' && (
                  <div className="flex flex-col items-center gap-4">
                     <p className="font-mono text-2xl text-primary">{formatTime(recordingTime)}</p>
                     <Button onClick={stopRecording} size="lg" variant="destructive" className="rounded-full w-24 h-24">
                       <Icons.Mic className="w-10 h-10 animate-pulse" />
                     </Button>
                     <p className="text-muted-foreground">Ketuk untuk berhenti merekam</p>
                  </div>
                )}
                {recordingStatus === 'recorded' && audioPreview && (
                  <div className="flex items-center justify-center gap-4 w-full px-4">
                     <Button onClick={resetRecording} variant="ghost" size="icon">
                        <Icons.Delete className="w-6 h-6 text-destructive" />
                     </Button>
                     <audio controls src={audioPreview} className="w-full">
                        Browser Anda tidak mendukung elemen audio.
                     </audio>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-6 mt-6 pt-6 border-t">
              <div className="space-y-2">
                 <Label htmlFor="caption">Keterangan (Opsional)</Label>
                 <Textarea 
                    id="caption" 
                    placeholder="Tulis sesuatu yang ajaib..." 
                    rows={4} 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
              </div>
              
              <HashtagSuggester 
                postContent={caption} 
                onHashtagClick={handleHashtagClick}
              />
          </div>

        </CardContent>
        <CardFooter>
          <Button 
            className="w-full font-bold text-lg py-6" 
            onClick={handlePostSubmit}
            disabled={isSubmitDisabled}
          >
            {(isLoading || isProcessing || isRecording) && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? "Memproses..." : (isRecording ? "Merekam..." : (isLoading ? "Membagikan..." : "Bagikan Postingan"))}
          </Button>
        </CardFooter>
      </Card>
    </div>
    {imagePreview && (
        <FabledFilters
            open={showFabledFilters}
            onOpenChange={setShowFabledFilters}
            originalImageUri={imagePreview}
            onImageStyled={handleImageStyled}
        />
    )}
    </>
  );
}
