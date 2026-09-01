'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BellRing, Check, X, Calendar, User, ArrowRight } from 'lucide-react';
import { api, PersonalNote } from '@/lib/api';
import { NOTE_COLOR_CARD_BG, NOTE_COLOR_LABELS } from './note-colors';
import { cn } from '@/lib/utils';

export function TaskAssignmentPopup() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    // Poll for pending assignments assigned to current user every 30 seconds
    const { data: pendingNotes = [] } = useQuery({
        queryKey: ['personal-notes', 'pending-assignments'],
        queryFn: () => api.personalNotes.getPendingAssignments(),
        refetchInterval: 30000,
    });

    useEffect(() => {
        // Show popup if there are unseen pending notes
        const unseenNotes = pendingNotes.filter((n) => !n.popup_shown);
        if (unseenNotes.length > 0) {
            setOpen(true);
            setCurrentIndex(0);
        }
    }, [pendingNotes]);

    const activeNote: PersonalNote | undefined = pendingNotes[currentIndex] || pendingNotes[0];

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['personal-notes'] });
    };

    const handleAccept = async (note: PersonalNote) => {
        setProcessing(true);
        try {
            await api.personalNotes.accept(note.id);
            toast.success(`"${note.title}" görevi kabul edildi ve iş listenize eklendi.`);
            invalidate();
            advanceOrClose();
        } catch (e: any) {
            toast.error(e.message || 'Görev kabul edilirken hata oluştu.');
        } finally {
            setProcessing(false);
        }
    };

    const handleRejectSubmit = async () => {
        if (!activeNote) return;
        setProcessing(true);
        try {
            await api.personalNotes.reject(activeNote.id, rejectionReason || undefined);
            toast.info(`"${activeNote.title}" görevi reddedildi.`);
            setRejectDialogOpen(false);
            setRejectionReason('');
            invalidate();
            advanceOrClose();
        } catch (e: any) {
            toast.error(e.message || 'Görev reddedilirken hata oluştu.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDismiss = async () => {
        if (activeNote) {
            try {
                await api.personalNotes.markPopupSeen([activeNote.id]);
            } catch {
                // Ignore
            }
        }
        advanceOrClose();
    };

    const advanceOrClose = () => {
        if (currentIndex < pendingNotes.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            setOpen(false);
            setCurrentIndex(0);
        }
    };

    if (!activeNote || !open) return null;

    const assignerName = activeNote.creator?.full_name || activeNote.creator?.username || 'Bir kullanıcı';

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && handleDismiss()}>
                <DialogContent className="max-w-lg p-0 overflow-hidden border-2 border-primary/20 shadow-2xl">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                                    <BellRing className="h-5 w-5 animate-bounce" />
                                    Yeni Görev / İş Atandı!
                                </DialogTitle>
                                {pendingNotes.length > 1 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                                        {currentIndex + 1} / {pendingNotes.length}
                                    </span>
                                )}
                            </div>
                        </DialogHeader>
                        <p className="text-xs text-blue-100 mt-1">
                            Aşağıdaki iş listenize eklenmek üzere size yönlendirildi.
                        </p>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Assigner Info Banner */}
                        <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/60 text-sm">
                            <User className="h-4 w-4 text-primary shrink-0" />
                            <span>
                                <strong>{assignerName}</strong> size bir görev atadı:
                            </span>
                        </div>

                        {/* Note Details Card */}
                        <div
                            className={cn(
                                'border rounded-xl p-4 space-y-2 shadow-sm',
                                NOTE_COLOR_CARD_BG[activeNote.color]
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                                    {activeNote.title}
                                </h4>
                                <Badge variant="outline" className="text-xs shrink-0">
                                    {NOTE_COLOR_LABELS[activeNote.color]}
                                </Badge>
                            </div>

                            {activeNote.content && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {activeNote.content}
                                </p>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-black/5 dark:border-white/5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                    Planlanan Zaman: {format(new Date(activeNote.starts_at), 'd MMMM yyyy HH:mm', { locale: tr })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-muted/30 border-t flex flex-row items-center justify-between sm:justify-between gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Daha Sonra Karar Ver
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRejectDialogOpen(true)}
                                disabled={processing}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                            >
                                <X className="h-4 w-4" />
                                Reddet
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleAccept(activeNote)}
                                disabled={processing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
                            >
                                <Check className="h-4 w-4" />
                                Kabul Et (Listeme Ekle)
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rejection Reason Sub-Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Görevi Reddet</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            "{activeNote.title}" görevini reddetmek üzeresiniz. Dilerseniz atayan kişiye iletilmek üzere gerekçe belirtebilirsiniz.
                        </p>
                        <Textarea
                            placeholder="Reddetme gerekçesi (opsiyonel)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="min-h-[80px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Vazgeç
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectSubmit}
                            disabled={processing}
                        >
                            Reddetmeyi Onayla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
