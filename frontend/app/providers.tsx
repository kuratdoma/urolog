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
 *
 * PERF: AuthBootstrap bittiğinde `refreshAttempted` flag'ini set eder.
 * AuthGuard bu flag olmadan redirect kararı vermez — böylece sayfa
 * yenilemesinde "token yok → hemen login" yanlış yönlendirmesi ortadan kalkar
 * ve ilk mount'ta sorgular zaten token'a sahip olarak başlar (1 RTT, 3 değil).
 */
function AuthBootstrap() {
    const hasHydrated = useAuthStore((s) => s._hasHydrated);
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const setAuth = useAuthStore((s) => s.setAuth);
    const setRefreshAttempted = useAuthStore((s) => s.setRefreshAttempted);

    useEffect(() => {
        if (!hasHydrated) return;

        // Token zaten bellekte → refresh'e gerek yok, hemen tamamlandı say.
        if (token) {
            setRefreshAttempted();
            return;
        }

        // Daha önce hiç giriş yapılmamış → refresh denemesi anlamsız.
        if (!user) {
            setRefreshAttempted();
            return;
        }

        // Kullanıcı kaydı var ama token yok (sayfa yenilemesi) → refresh dene.
        (async () => {
            try {
                const { authApi } = await import('@/lib/api/auth');
                const data = await authApi.refresh();
                setAuth(data.access_token);
            } catch {
                // Geçerli bir refresh cookie yok — kullanıcı login'e düşer.
            } finally {
                // Her durumda (başarı veya hata) AuthGuard'a "karar ver" sinyali ver.
                setRefreshAttempted();
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasHydrated]);

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
