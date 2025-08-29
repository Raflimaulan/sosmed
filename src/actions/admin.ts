'use server';

import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export async function addFollowersAction(userId: string, count: number): Promise<{ success: boolean, message: string }> {
    if (!userId || !count) {
        return { success: false, message: 'ID Pengguna dan jumlah diperlukan.' };
    }

    try {
        const userRef = doc(firestore, 'users', userId);
        const newFollowers = [];
        for (let i = 0; i < count; i++) {
            // Buat ID pengikut dummy. Dalam skenario nyata, ini mungkin ID pengguna nyata.
            const dummyId = `bot_${Date.now()}_${i}`;
            newFollowers.push(dummyId);
        }

        await updateDoc(userRef, {
            followers: arrayUnion(...newFollowers)
        });

        return { success: true, message: `Berhasil menambahkan ${count} pengikut.` };
    } catch (error: any) {
        console.error("Kesalahan menambahkan pengikut:", error);
        return { success: false, message: error.message || "Terjadi kesalahan tak terduga." };
    }
}
