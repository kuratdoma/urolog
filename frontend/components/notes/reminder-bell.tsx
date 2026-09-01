'use client';

import { Bell, Check, X, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDueReminders } from '@/hooks/use-due-reminders';
import { SnoozeDialog } from './snooze-dialog';
import { useState } from 'react';
import { NoteReminderOccurrence, PersonalNote, api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function ReminderBell() {
    const queryClient = useQueryClient();
    const { due, missedCount, acknowledge, snooze } = useDueReminders();
    const [snoozeTarget, setSnoozeTarget] = useState<NoteReminderOccurrence | null>(null);

    const { data: pendingNotes = [] } = useQuery({
        queryKey: ['personal-notes', 'pending-assignments'],
        queryFn: () => api.personalNotes.getPendingAssignments(),
        refetchInterval: 30000,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['personal-notes'] });

    const handleAcceptTask = async (note: PersonalNote) => {
        try {
            await api.personalNotes.accept(note.id);
            toast.success(`"${note.title}" görevi kabul edildi.`);
            invalidate();
        } catch (e: any) {
            toast.error(e.message || 'Hata oluştu');
        }
    };

    const handleRejectTask = async (note: PersonalNote) => {
        try {
            await api.personalNotes.reject(note.id);
            toast.info(`"${note.title}" görevi reddedildi.`);
            invalidate();
        } catch (e: any) {
            toast.error(e.message || 'Hata oluştu');
        }
    };

    const totalCount = due.length + (missedCount > 0 ? 1 : 0) + pendingNotes.length;

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
                <PopoverContent align="end" className="w-88 p-0">
                    <div className="p-3 border-b font-medium text-sm flex items-center justify-between">
                        <span>Bildirimler & Görevler</span>
                        {totalCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {totalCount}
                            </Badge>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y">
                        {/* Pending Assigned Tasks Section */}
                        {pendingNotes.length > 0 && (
                            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-2">
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 px-2 py-1 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Onay Bekleyen Görevler ({pendingNotes.length})
                                </div>
                                <div className="space-y-2 mt-1">
                                    {pendingNotes.map((note) => (
                                        <div key={note.id} className="p-2.5 bg-background rounded-lg border shadow-xs space-y-1.5">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1 font-medium text-foreground">
                                                    <User className="h-3 w-3 text-primary" />
                                                    {note.creator?.full_name || note.creator?.username}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50">
                                                    Atandı
                                                </Badge>
                                            </div>
                                            <div className="font-medium text-xs text-foreground">{note.title}</div>
                                            {note.content && (
                                                <div className="text-[11px] text-muted-foreground line-clamp-2">
                                                    {note.content}
                                                </div>
                                            )}
                                            <div className="flex gap-1.5 pt-1">
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1 gap-1"
                                                    onClick={() => handleAcceptTask(note)}
                                                >
                                                    <Check className="h-3 w-3" />
                                                    Kabul Et
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 flex-1 gap-1"
                                                    onClick={() => handleRejectTask(note)}
                                                >
                                                    <X className="h-3 w-3" />
                                                    Reddet
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {missedCount > 0 && (
                            <div className="p-3 text-sm text-muted-foreground bg-muted/50">
                                {missedCount} hatırlatma kaçırıldı
                            </div>
                        )}

                        {due.length === 0 && missedCount === 0 && pendingNotes.length === 0 && (
                            <div className="p-6 text-sm text-muted-foreground text-center">
                                Bekleyen bildirim veya görev yok
                            </div>
                        )}

                        {due.map((occurrence) => (
                            <div key={occurrence.id} className="p-3">
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
