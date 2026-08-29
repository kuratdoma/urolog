'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
    className?: string;
}

export function BackButton({ className }: BackButtonProps) {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className={cn(
                "group flex items-center gap-2 px-3 h-8 text-slate-700 hover:text-slate-900 hover:bg-white/80 rounded-lg transition-all duration-200 font-bold border border-transparent hover:border-slate-200 hover:shadow-sm active:scale-95",
                className
            )}
        >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-xs">GERİ</span>
        </Button>
    );
}
