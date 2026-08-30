'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDueReminders } from '@/hooks/use-due-reminders';
import { SnoozeDialog } from './snooze-dialog';
import { useState } from 'react';
import { NoteReminderOccurrence } from '@/lib/api';

export function ReminderBell() {
    const { due, missedCount, acknowledge, snooze } = useDueReminders();
    const [snoozeTarget, setSnoozeTarget] = useState<NoteReminderOccurrence | null>(null);

    const totalCount = due.length + (missedCount > 0 ? 1 : 0);

    return (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {totalCount > 0 && (
                            <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
                            >
                                {totalCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                    <div className="p-3 border-b font-medium text-sm">Hatırlatmalar</div>
                    <div className="max-h-96 overflow-y-auto">
                        {missedCount > 0 && (
                            <div className="p-3 text-sm text-muted-foreground border-b bg-muted/50">
                                {missedCount} hatırlatma kaçırıldı
                            </div>
                        )}
                        {due.length === 0 && missedCount === 0 && (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                                Bekleyen hatırlatma yok
                            </div>
                        )}
                        {due.map((occurrence) => (
                            <div key={occurrence.id} className="p-3 border-b last:border-b-0">
                                <div className="font-medium text-sm">{occurrence.note.title}</div>
                                {occurrence.note.content && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {occurrence.note.content}
                                    </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" variant="outline" onClick={() => acknowledge(occurrence.id)}>
                                        Tamam
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSnoozeTarget(occurrence)}>
                                        Ertele
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
            <SnoozeDialog
                occurrence={snoozeTarget}
                onClose={() => setSnoozeTarget(null)}
                onConfirm={async (newDatetime) => {
                    if (snoozeTarget) {
                        await snooze(snoozeTarget.id, newDatetime);
                        setSnoozeTarget(null);
                    }
                }}
            />
        </>
    );
}
