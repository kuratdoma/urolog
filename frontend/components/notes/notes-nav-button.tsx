'use client';

import Link from 'next/link';
import { StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotesNavButton() {
    return (
        <Button variant="ghost" size="icon" asChild>
            <Link href="/notes" title="Notlarım">
                <StickyNote className="h-5 w-5 fill-white text-gray-400" />
            </Link>
        </Button>
    );
}
