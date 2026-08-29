'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export function SessionOverlay() {
    const isSessionExpired = useAuthStore((state) => state.isSessionExpired);
    const clearSessionExpired = useAuthStore((state) => state.clearSessionExpired);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isSessionExpired) {
            // Clear TanStack Query Cache immediately
            queryClient.clear();
        }
    }, [isSessionExpired, queryClient]);

    if (!isSessionExpired) return null;

    const handleLoginRedirect = () => {
        // Clear the flag FIRST so overlay disappears immediately
        clearSessionExpired();
        // Then redirect to login
        window.location.href = '/login';
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-xl bg-background/80 animate-in fade-in duration-300">
            <div className="max-w-md w-full mx-4 p-8 rounded-2xl border bg-card shadow-2xl flex flex-col items-center text-center space-y-6">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="h-8 w-8 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Oturum Süresi Doldu</h2>
                    <p className="text-muted-foreground">
                        Güvenliğiniz için oturumunuz sonlandırıldı. Devam etmek için lütfen tekrar giriş yapın.
                    </p>
                </div>

                <Button
                    onClick={handleLoginRedirect}
                    className="w-full h-12 text-lg font-medium"
                >
                    Tekrar Giriş Yap
                </Button>
            </div>
        </div>
    );
}
