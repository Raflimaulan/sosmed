
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Logo } from "@/components/logo";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import React from "react";
import { BottomNavbar } from "@/components/bottom-navbar";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { href: "/", icon: Icons.Home, label: "Beranda", tooltip: "Beranda" },
  { href: "/create", icon: Icons.Create, label: "Buat", tooltip: "Buat Postingan" },
  { href: "/messages", icon: Icons.Messages, label: "Pesan", tooltip: "Pesan" },
];

const adminNavItem = { href: "/admin", icon: Icons.Shield, label: "Admin", tooltip: "Panel Admin" };
const ADMIN_EMAIL = "we@gmail.com";


function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  const navItems = React.useMemo(() => {
    const items = [...baseNavItems];
    if (user?.email === ADMIN_EMAIL) {
      items.push(adminNavItem);
    }
    return items;
  }, [user?.email]);


  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error saat keluar: ", error);
    }
  };


  if(loading || !user) {
    return <div className="flex items-center justify-center h-screen w-full"> <Icons.Spinner className="h-8 w-8 animate-spin" /> </div>
  }
  
  return (
    <SidebarProvider>
      <Sidebar className="hidden md:flex">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.tooltip}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                    <Avatar className="h-7 w-7 mr-2">
                      <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.displayName || 'Pengguna'} data-ai-hint="person avatar" />
                      <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{user.displayName || 'Profil'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
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
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="pb-16 md:pb-0 h-full">
          {children}
        </div>
      </SidebarInset>
      <BottomNavbar items={navItems} />
    </SidebarProvider>
  );
}


export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </AuthProvider>
  );
}
