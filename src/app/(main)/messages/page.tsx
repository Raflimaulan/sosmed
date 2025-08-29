
'use client';

import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { Chat, Message, User as UserProfile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";


export default function MessagesPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // For group creation
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch existing chats
  useEffect(() => {
    if (!currentUser) return;

    setLoadingChats(true);
    const chatsRef = collection(firestore, 'chats');
    const q = query(chatsRef, where('userIds', 'array-contains', currentUser.uid), orderBy('lastMessageTimestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userChats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Chat));
      setChats(userChats);
      setLoadingChats(false);
    }, (error) => {
      console.error("Error mengambil data chat: ", error);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch all users for new chat list
  useEffect(() => {
    if (!currentUser) return;
    
    setLoadingUsers(true);
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('uid', '!=', currentUser.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const usersData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
        setAllUsers(usersData);
        setLoadingUsers(false);
    }, (error) => {
        console.error("Error mengambil data pengguna:", error);
        setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [currentUser]);


  // Fetch messages for the active chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(firestore, 'chats', activeChat.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chatMessages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(chatMessages);
      setLoadingMessages(false);
    }, (error) => {
        console.error("Error mengambil data pesan:", error);
        setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeChat]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUser || isSending) return;

    setIsSending(true);
    const messagesRef = collection(firestore, 'chats', activeChat.id, 'messages');

    try {
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: newMessage,
        timestamp: serverTimestamp(),
      });

      const chatDocRef = doc(firestore, 'chats', activeChat.id);
      await updateDoc(chatDocRef, {
        lastMessage: newMessage,
        lastMessageTimestamp: serverTimestamp(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error mengirim pesan:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = async (targetUser: UserProfile) => {
    if (!currentUser) return;

    try {
      const chatId = currentUser.uid > targetUser.uid
        ? `${currentUser.uid}_${targetUser.uid}`
        : `${targetUser.uid}_${currentUser.uid}`;
      
      const chatDocRef = doc(firestore, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        setActiveChat({ id: chatDoc.id, ...chatDoc.data() } as Chat);
      } else {
        const newChatData: any = {
          userIds: [currentUser.uid, targetUser.uid],
          users: {
            [currentUser.uid]: {
              username: currentUser.displayName || 'Pengguna',
              avatarUrl: currentUser.photoURL || `https://picsum.photos/seed/${currentUser.uid}/200/200`,
            },
            [targetUser.uid]: {
              username: targetUser.username,
              avatarUrl: targetUser.avatarUrl,
            }
          },
          lastMessage: null,
          lastMessageTimestamp: serverTimestamp(),
          isGroup: false,
        };
        await setDoc(chatDocRef, newChatData);
        setActiveChat({ id: chatId, ...newChatData } as Chat);
      }
    } catch (error) {
      console.error("Error memulai percakapan: ", error);
    }
  }

  const handleToggleUserSelection = (user: UserProfile) => {
    setSelectedUsers(prev => 
      prev.find(u => u.uid === user.uid)
        ? prev.filter(u => u.uid !== user.uid)
        : [...prev, user]
    );
  }

  const handleCreateGroup = async () => {
    if (!currentUser || selectedUsers.length < 2 || !groupName.trim()) {
      toast({
        title: "Pembuatan grup gagal",
        description: "Harap pilih setidaknya 2 pengguna dan berikan nama grup.",
        variant: "destructive"
      });
      return;
    }
    setIsCreatingGroup(true);
    try {
      const allGroupUsers = [currentUser, ...selectedUsers];
      const userIds = allGroupUsers.map(u => u.uid);
      
      const usersObject = allGroupUsers.reduce((acc, user) => {
        acc[user.uid] = {
          username: user.username || user.displayName || 'Pengguna',
          avatarUrl: user.avatarUrl || user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
        };
        return acc;
      }, {} as Chat['users']);
      
      const newChatData: Omit<Chat, 'id'> = {
        isGroup: true,
        groupName: groupName,
        groupAvatarUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
        admins: [currentUser.uid],
        userIds: userIds,
        users: usersObject,
        lastMessage: `Grup dibuat oleh ${currentUser.displayName}`,
        lastMessageTimestamp: serverTimestamp() as any,
      };

      const newChatRef = await addDoc(collection(firestore, 'chats'), newChatData);
      
      toast({ title: "Grup Dibuat!", description: `Grup "${groupName}" telah berhasil dibuat.` });
      
      setActiveChat({ id: newChatRef.id, ...newChatData } as Chat);
      setSelectedUsers([]);
      setGroupName("");

    } catch (error) {
      console.error("Error membuat grup:", error);
      toast({ title: "Error", description: "Gagal membuat grup.", variant: "destructive" });
    } finally {
      setIsCreatingGroup(false);
    }
  }
  
  const getOtherUser = (chat: Chat) => {
    if (!currentUser || chat.isGroup) return null;
    const otherUserId = chat.userIds.find(id => id !== currentUser.uid)!;
    return chat.users[otherUserId];
  }

  const getChatDisplayData = (chat: Chat) => {
    if (chat.isGroup) {
      return {
        name: chat.groupName,
        avatarUrl: chat.groupAvatarUrl,
        isGroup: true,
      }
    }
    const otherUser = getOtherUser(chat);
    return {
      name: otherUser?.username,
      avatarUrl: otherUser?.avatarUrl,
      isGroup: false,
    }
  }

  const renderConversationList = () => {
    if (loadingChats) {
      return (
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      );
    }
    if (chats.length === 0) {
      return <div className="p-4 text-center text-muted-foreground">Belum ada percakapan.</div>;
    }
    return chats.map((chat) => {
      const displayData = getChatDisplayData(chat);
      return (
         <div 
          key={chat.id} 
          className={cn(
            "flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
            activeChat?.id === chat.id && "bg-muted"
          )}
          onClick={() => setActiveChat(chat)}
        >
          <Avatar>
            <AvatarImage src={displayData.avatarUrl} alt={displayData.name} data-ai-hint="person avatar"/>
            <AvatarFallback>
              {displayData.isGroup ? <Icons.Users className="w-4 h-4" /> : displayData.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold truncate">{displayData.name}</p>
            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage || '...'}</p>
          </div>
        </div>
      );
    });
  }

  const renderUserList = () => {
    if (loadingUsers) {
        return (
            <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
        );
    }
    if (allUsers.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">Tidak ada pengguna lain ditemukan.</div>;
    }
    return allUsers.map((user) => (
        <div
            key={user.uid}
            className={cn(
              "flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
              selectedUsers.find(u => u.uid === user.uid) && "bg-primary/20"
            )}
            onClick={() => handleToggleUserSelection(user)}
        >
            <Avatar>
                <AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="person avatar"/>
                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{user.username}</p>
            </div>
            {selectedUsers.find(u => u.uid === user.uid) && <Icons.Verified className="text-primary" />}
        </div>
    ));
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full">
      {/* Sidebar for conversations and new chat */}
      <aside className={cn("flex flex-col border-r h-full", activeChat && "hidden md:flex")}>
          <Tabs defaultValue="chats" className="flex flex-col flex-1">
              <div className="p-2 border-b">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chats">Obrolan</TabsTrigger>
                      <TabsTrigger value="new">Grup Baru</TabsTrigger>
                  </TabsList>
              </div>
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <TabsContent value="chats">
                        {renderConversationList()}
                    </TabsContent>
                    <TabsContent value="new" className="flex flex-col h-full">
                        <div className="p-4 space-y-4 border-b">
                          <Input 
                            placeholder="Nama Grup" 
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                          />
                            <Button 
                              className="w-full"
                              onClick={handleCreateGroup} 
                              disabled={isCreatingGroup || selectedUsers.length < 2 || !groupName.trim()}
                            >
                              {isCreatingGroup ? <Icons.Spinner className="animate-spin" /> : <><Icons.Users className="mr-2" />Buat Grup</>}
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {renderUserList()}
                        </div>
                    </TabsContent>
                </ScrollArea>
              </div>
          </Tabs>
      </aside>

      {/* Main chat window */}
      <main className={cn("col-span-1 md:col-span-2 lg:col-span-3 flex flex-col", !activeChat && "hidden md:flex", "h-full")}>
        {activeChat ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-center gap-3 shrink-0">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveChat(null)}>
                  <Icons.Back />
              </Button>
              <Avatar>
                <AvatarImage src={getChatDisplayData(activeChat)?.avatarUrl} alt={getChatDisplayData(activeChat)?.name} data-ai-hint="person avatar" />
                <AvatarFallback>
                  {getChatDisplayData(activeChat).isGroup ? <Icons.Users className="w-4 h-4" /> : getChatDisplayData(activeChat)?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-bold">{getChatDisplayData(activeChat)?.name}</h3>
            </div>
            <div className="flex-1 overflow-hidden bg-muted/20">
                <ScrollArea className="h-full p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                        <Icons.Spinner className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md p-3 rounded-xl ${msg.senderId === currentUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
            </div>
            <div className="p-4 border-t bg-background shrink-0">
              <form onSubmit={handleSendMessage} className="relative">
                <Input 
                  placeholder="Ketik pesan..." 
                  className="pr-12 h-12 text-base" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                />
                <Button size="icon" type="submit" className="absolute top-1/2 right-2 -translate-y-1/2" disabled={isSending || !newMessage.trim()}>
                  {isSending ? <Icons.Spinner className="animate-spin" /> : <Icons.Send />}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-col items-center justify-center h-full text-muted-foreground hidden md:flex">
            <Icons.Messages className="w-24 h-24 mb-4" />
            <h3 className="text-xl font-bold">Pesan Anda</h3>
            <p>Pilih percakapan atau mulai yang baru.</p>
          </div>
        )}
      </main>
    </div>
  );
}
