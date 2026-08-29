'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, _hasHydrated } = useAuthStore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !_hasHydrated) return;

        if (!isAuthenticated()) {
            router.push('/login');
        }
    }, [isClient, _hasHydrated, isAuthenticated, router]);

    // Show nothing (or a spinner) while hydrating or checking auth
    if (!isClient || !_hasHydrated) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // If hydrated but not authenticated, render nothing while redirecting
    if (!isAuthenticated()) {
        return null;
    }

    return <>{children}</>;
}
