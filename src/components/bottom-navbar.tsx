
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { LucideIcon } from 'lucide-react';
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from './ui/button';
import { Icons } from './icons';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface BottomNavbarProps {
  items: NavItem[];
}

const ADMIN_EMAIL = "we@gmail.com";

export function BottomNavbar({ items }: BottomNavbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  
  const navItems = React.useMemo(() => {
    const newItems = [...items];
    if (user?.email === ADMIN_EMAIL) {
        const hasAdmin = newItems.some(item => item.href === '/admin');
        if (!hasAdmin) {
           // This logic seems a bit redundant but reflects the original.
           // It ensures admin is added if not present.
        }
    }
    return newItems.filter(item => item.href !== '/admin' || user?.email === ADMIN_EMAIL);
  }, [items, user?.email]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error saat keluar: ", error);
    }
  };


  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border z-50">
      <div className="flex justify-around items-center h-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full">
                <item.icon className={cn('h-6 w-6', isActive ? 'text-primary' : 'text-muted-foreground')} />
            </Link>
          );
        })}
        {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <button className="flex flex-col items-center justify-center w-full h-full">
                    <Avatar className={cn(
                        "h-7 w-7 border-2", 
                        pathname.startsWith(`/${user.uid}`) ? "border-primary" : "border-transparent"
                    )}>
                      <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.displayName || 'Pengguna'} />
                      <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" side="top" align="end">
                 <DropdownMenuItem asChild>
                   <Link href={`/${user.uid}`}>
                    <Icons.Profile className="mr-2" />
                    <span>Profil</span>
                   </Link>
                 </DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={handleLogout}>
                    <Icons.LogOut className="mr-2" />
                    <span>Keluar</span>
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>
    </div>
  );
}
