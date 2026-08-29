'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeInitializer } from '@/components/layout/theme-initializer';
import { SessionOverlay } from '@/components/layout/session-overlay';
import { initGlobalTextFormattingShortcuts } from '@/lib/text-formatting-shortcut';
import { useAuthStore } from '@/stores/auth-store';

/**
 * SEC: access token artık localStorage'a yazılmıyor (bkz. stores/auth-store.ts
 * partialize) — sadece bellekte tutuluyor. Bu yüzden sayfa yenilenince/
 * tarayıcı yeniden açılınca bellek sıfırlanır. Kullanıcı deneyimini korumak
 * için, önceden giriş yapılmış olduğu biliniyorsa (persisted `user` dolu ama
 * `token` yoksa) httpOnly refresh cookie'sinden sessizce yeni bir access
 * token almayı bir kez dener. Cookie geçersizse (süresi dolmuş/hiç yok)
 * sessizce başarısız olur, kullanıcı normal şekilde login sayfasına düşer.
 */
function AuthBootstrap() {
    const hasHydrated = useAuthStore((s) => s._hasHydrated);
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const setAuth = useAuthStore((s) => s.setAuth);

    useEffect(() => {
        if (!hasHydrated || token || !user) return;

        (async () => {
            try {
                const { authApi } = await import('@/lib/api/auth');
                const data = await authApi.refresh();
                setAuth(data.access_token);
            } catch {
                // Geçerli bir refresh cookie yok — kullanıcı login'e düşer.
            }
        })();
    }, [hasHydrated, token, user, setAuth]);

    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        return initGlobalTextFormattingShortcuts();
    }, []);

    const [queryClient] = useState(
        () => new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1000,
                    refetchOnWindowFocus: false,
                },
            },
        })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthBootstrap />
            <ThemeInitializer />
            <SessionOverlay />
            {children}
            <Toaster position="top-left" />
        </QueryClientProvider>
    );
}
