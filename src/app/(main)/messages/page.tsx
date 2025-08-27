
'use client';

import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDoc, getDocs } from "firebase/firestore";
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


export default function MessagesPage() {
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
      console.error("Error fetching chats: ", error);
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
        console.error("Error fetching users:", error);
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
        console.error("Error fetching messages: ", error);
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
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = async (targetUser: UserProfile) => {
    if (!currentUser) return;

    try {
      // Check if a chat already exists
      const chatId = currentUser.uid > targetUser.uid
        ? `${currentUser.uid}_${targetUser.uid}`
        : `${targetUser.uid}_${currentUser.uid}`;
      
      const chatDocRef = doc(firestore, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        // Chat exists, set it as active
        setActiveChat({ id: chatDoc.id, ...chatDoc.data() } as Chat);
      } else {
        // Chat doesn't exist, create it
        const newChatData = {
          userIds: [currentUser.uid, targetUser.uid],
          users: {
            [currentUser.uid]: {
              username: currentUser.displayName || 'User',
              avatarUrl: currentUser.photoURL || `https://picsum.photos/seed/${currentUser.uid}/200/200`,
            },
            [targetUser.uid]: {
              username: targetUser.username,
              avatarUrl: targetUser.avatarUrl,
            }
          },
          lastMessage: null,
          lastMessageTimestamp: serverTimestamp(),
        };
        await setDoc(chatDocRef, newChatData);
        setActiveChat({ id: chatId, ...newChatData } as Chat);
      }
    } catch (error) {
      console.error("Error starting conversation: ", error);
    }
  }
  
  const getOtherUser = (chat: Chat) => {
    if (!currentUser) return { username: '', avatarUrl: '' };
    const otherUserId = chat.userIds.find(id => id !== currentUser.uid)!;
    return chat.users[otherUserId];
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
      return <div className="p-4 text-center text-muted-foreground">No conversations yet.</div>;
    }
    return chats.map((chat) => {
      const otherUser = getOtherUser(chat);
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
            <AvatarImage src={otherUser?.avatarUrl} alt={otherUser?.username} data-ai-hint="person avatar"/>
            <AvatarFallback>{otherUser?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold truncate">{otherUser?.username}</p>
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
        return <div className="p-4 text-center text-muted-foreground">No other users found.</div>;
    }
    return allUsers.map((user) => (
        <div
            key={user.uid}
            className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => handleStartConversation(user)}
        >
            <Avatar>
                <AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="person avatar"/>
                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{user.username}</p>
            </div>
        </div>
    ));
  };


  return (
    <div className="h-screen flex flex-col">
       <header className="p-4 border-b flex items-center justify-center backdrop-blur-sm bg-background/80 sticky top-0 z-10 md:hidden">
          <h1 className="font-headline text-xl">Messages</h1>
       </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-65px)] md:h-screen">
        {/* Sidebar for conversations and new chat */}
        <aside className={cn("flex flex-col border-r", activeChat && "hidden md:flex")}>
            <Tabs defaultValue="chats" className="flex flex-col flex-1">
                <div className="p-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="chats">Chats</TabsTrigger>
                        <TabsTrigger value="new">New Chat</TabsTrigger>
                    </TabsList>
                </div>
                <ScrollArea className="flex-1">
                    <TabsContent value="chats">
                        {renderConversationList()}
                    </TabsContent>
                    <TabsContent value="new">
                        {renderUserList()}
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </aside>

        {/* Main chat window */}
        <main className={cn("col-span-1 md:col-span-2 lg:col-span-3 flex flex-col h-full", !activeChat && "hidden md:flex")}>
         {activeChat ? (
           <>
              <div className="p-4 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveChat(null)}>
                    <Icons.Back />
                </Button>
                <Avatar>
                  <AvatarImage src={getOtherUser(activeChat)?.avatarUrl} alt={getOtherUser(activeChat)?.username} data-ai-hint="person avatar" />
                  <AvatarFallback>{getOtherUser(activeChat)?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="font-bold">{getOtherUser(activeChat)?.username}</h3>
              </div>
              <ScrollArea className="flex-1 p-4 bg-muted/20">
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
              <div className="p-4 border-t mt-auto bg-background">
                <form onSubmit={handleSendMessage} className="relative">
                  <Input 
                    placeholder="Type a message..." 
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
           </>
         ) : (
            <div className="flex-col items-center justify-center h-full text-muted-foreground hidden md:flex">
              <Icons.Messages className="w-24 h-24 mb-4" />
              <h3 className="text-xl font-bold">Your Messages</h3>
              <p>Select a conversation or start a new one.</p>
            </div>
         )}
        </main>
      </div>
    </div>
  );
}
