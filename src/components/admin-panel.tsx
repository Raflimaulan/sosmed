
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Icons } from './icons';
import { addFollowersAction } from '@/actions/admin';


export function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [followersCount, setFollowersCount] = useState<number>(100);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            setIsFetchingUsers(true);
            const usersCollection = collection(firestore, 'users');
            const userSnapshot = await getDocs(usersCollection);
            const userList = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
            setUsers(userList);
            setIsFetchingUsers(false);
        };

        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) {
            toast({ title: 'Error', description: 'Please select a user.', variant: 'destructive' });
            return;
        }
        setIsLoading(true);

        const result = await addFollowersAction(selectedUser, followersCount);

        if (result.success) {
            toast({ title: 'Success!', description: result.message });
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }

        setIsLoading(false);
    };

    return (
        <div className="flex justify-center items-start w-full min-h-screen p-4 sm:p-6 md:p-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Admin Panel</CardTitle>
                    <CardDescription>Add followers to any user account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="user-select">Select User</Label>
                            {isFetchingUsers ? (
                                <div className="flex items-center space-x-2">
                                   <Icons.Spinner className="animate-spin h-5 w-5" />
                                   <span>Loading users...</span>
                                </div>
                            ) : (
                                <Select onValueChange={setSelectedUser} value={selectedUser}>
                                    <SelectTrigger id="user-select">
                                        <SelectValue placeholder="Select a user to bless with followers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(user => (
                                            <SelectItem key={user.uid} value={user.uid}>
                                                {user.username} ({user.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="followers-count">Number of Followers to Add</Label>
                            <Input
                                id="followers-count"
                                type="number"
                                value={followersCount}
                                onChange={(e) => setFollowersCount(Number(e.target.value))}
                                min="1"
                            />
                        </div>
                        <Button type="submit" className="w-full font-bold" disabled={isLoading || isFetchingUsers}>
                            {isLoading && <Icons.Spinner className="animate-spin mr-2" />}
                            Add Followers
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
