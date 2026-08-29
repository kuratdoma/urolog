'use client';
import { Sidebar } from '@/components/layout/sidebar';
import { AuthGuard } from '@/components/auth/auth-guard';
import { BackButton } from '@/components/layout/back-button';
import { UserNav } from '@/components/layout/user-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';

import { AIScribeAction } from '@/components/layout/ai-scribe-action';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isCalendarPage = pathname === '/calendar';

    return (
        <AuthGuard>
            <div className="flex h-screen">
                <Sidebar isCalendarPage={isCalendarPage} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className={cn(
                        "flex-1 overflow-y-auto bg-slate-50 scroll-smooth",
                        isCalendarPage ? "p-0" : "p-4"
                    )}>
                        {!isCalendarPage && (
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <BackButton />
                                    <Breadcrumb />
                                </div>
                                <div className="flex items-center gap-4">
                                    <AIScribeAction />
                                    <UserNav />
                                </div>
                            </div>
                        )}
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
