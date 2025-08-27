'use server';

import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export async function addFollowersAction(userId: string, count: number): Promise<{ success: boolean, message: string }> {
    if (!userId || !count) {
        return { success: false, message: 'User ID and count are required.' };
    }

    try {
        const userRef = doc(firestore, 'users', userId);
        const newFollowers = [];
        for (let i = 0; i < count; i++) {
            // Create a dummy follower ID. In a real scenario, these might be real user IDs.
            const dummyId = `bot_${Date.now()}_${i}`;
            newFollowers.push(dummyId);
        }

        await updateDoc(userRef, {
            followers: arrayUnion(...newFollowers)
        });

        return { success: true, message: `Successfully added ${count} followers.` };
    } catch (error: any) {
        console.error("Error adding followers:", error);
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
}
