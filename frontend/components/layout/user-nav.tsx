'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserNav() {
    const { logout, token } = useAuthStore();
    const router = useRouter();

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser', token],
        queryFn: api.auth.me,
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    });

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const initials = currentUser?.full_name
        ? currentUser.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : currentUser?.username?.slice(0, 2).toUpperCase() || '??';

    const roleName = currentUser?.role === 'ADMIN' ? 'Yönetici' :
        currentUser?.role === 'DOCTOR' ? 'Doktor' :
            currentUser?.role === 'NURSE' ? 'Hemşire' :
                currentUser?.role === 'SECRETARY' ? 'Sekreter' : 'Kullanıcı';

    return (
        <div className="flex items-center gap-2">
            <Link href="/reports" className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-full transition-all hover:shadow-sm" title="İstatistikler">
                <BarChart3 className="w-5 h-5" />
            </Link>
            <Link href="/settings" className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-full transition-all hover:shadow-sm" title="Ayarlar">
                <Settings className="w-5 h-5" />
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full ml-1">
                        <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
                            <AvatarFallback className="bg-white text-slate-700 font-bold bg-gradient-to-br from-slate-50 to-slate-100">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{currentUser?.full_name || currentUser?.username}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {roleName}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Çıkış Yap</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
