'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const _hasHydrated = useAuthStore((s) => s._hasHydrated);
    const refreshAttempted = useAuthStore((s) => s.refreshAttempted);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    // PERF/UX: Hem Zustand persist rehydrate'ı hem de AuthBootstrap'ın refresh
    // denemesinin tamamlanmasını bekle. refreshAttempted=true olmadan redirect
    // kararı vermek, sayfa yenilemesinde "token yok → hemen login" yanlış
    // yönlendirmesine yol açar.
    const isReady = _hasHydrated && refreshAttempted;

    useEffect(() => {
        if (!isReady) return;
        if (!isAuthenticated()) {
            router.push('/login');
        }
    }, [isReady, isAuthenticated, router]);

    // Hazır değil: AuthBootstrap refresh denemesini bitirene kadar spinner.
    if (!isReady) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Hazır ama oturum yok → redirect (yukarıdaki useEffect hallediyor).
    if (!isAuthenticated()) {
        return null;
    }

    return <>{children}</>;
}
