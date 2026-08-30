'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useDailyDigest } from '@/hooks/use-daily-digest';
import { RecurrenceType } from '@/lib/api';

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    once: 'Tek seferlik',
    daily: 'Her gün',
    weekly: 'Her hafta',
    monthly: 'Her ay',
};

export function DailyDigestDialog() {
    const { open, setOpen, todaysNotes, isLoading } = useDailyDigest();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[65vw] h-[65vh] max-w-none sm:max-w-none flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5" />
                        Bugünün İş Listesi — {format(new Date(), 'd MMMM yyyy, EEEE', { locale: tr })}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {isLoading && <div className="text-sm text-muted-foreground">Yükleniyor...</div>}
                    {!isLoading && todaysNotes.length === 0 && (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                            Bugün için planlanmış bir not yok
                        </div>
                    )}
                    {todaysNotes.map((note) => (
                        <div key={note.id} className="border rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{note.title}</span>
                                <Badge variant="secondary">{RECURRENCE_LABELS[note.recurrence_type]}</Badge>
                            </div>
                            {note.content && (
                                <p className="text-sm text-muted-foreground mt-1">{note.content}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(note.starts_at), 'HH:mm', { locale: tr })}
                            </p>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
