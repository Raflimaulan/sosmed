
import type { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  username: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  followers: string[];
  following: string[];
  postsCount: number;
  savedPosts?: string[];
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: Timestamp;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  imageUrl?: string;
  audioUrl?: string;
  caption: string;
  hashtags: string[];
  likes: string[];
  // The comments array is now deprecated in favor of the subcollection
  // It is kept for type safety with older data if any exists.
  comments: any[]; 
  timestamp: Timestamp;
}

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
}

export interface Chat {
    id: string;
    userIds: string[];
    users: {
        [key: string]: {
            username: string;
            avatarUrl: string;
        }
    };
    lastMessage: string | null;
    lastMessageTimestamp: Timestamp;
    
    // Group chat fields
    isGroup?: boolean;
    groupName?: string;
    groupAvatarUrl?: string;
    admins?: string[];
}
