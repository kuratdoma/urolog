'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Check, X, User, Send, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { api, PersonalNote, PersonalNoteCreate, RecurrenceType, NoteSortBy, NoteScope } from '@/lib/api';
import { cn } from '@/lib/utils';
import { NoteFormDialog } from './note-form-dialog';
import { NOTE_COLOR_CARD_BG } from './note-colors';

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    once: 'Tek seferlik',
    daily: 'Her gün',
    weekly: 'Her hafta',
    monthly: 'Her ay',
};

const SORT_LABELS: Record<NoteSortBy, string> = {
    due_date: 'Zamana göre',
    created_at: 'Oluşturma tarihine göre',
    importance: 'Öneme göre',
};

export function NoteList() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
    const [sortBy, setSortBy] = useState<NoteSortBy>('due_date');
    const [scope, setScope] = useState<NoteScope>('all');
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    const notesQuery = useQuery({
        queryKey: ['personal-notes', 'list', sortBy, scope],
        queryFn: () => api.personalNotes.list(true, sortBy, scope),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['personal-notes'] });

    const handleCreate = () => {
        setEditingNote(null);
        setDialogOpen(true);
    };

    const handleEdit = (note: PersonalNote) => {
        setEditingNote(note);
        setDialogOpen(true);
    };

    const handleSubmit = async (data: PersonalNoteCreate) => {
        try {
            if (editingNote) {
                await api.personalNotes.update(editingNote.id, data);
                toast.success('Not güncellendi');
            } else {
                await api.personalNotes.create(data);
                toast.success('Not oluşturuldu');
            }
            setDialogOpen(false);
            invalidate();
        } catch (e: any) {
            toast.error(e.message || 'Bir hata oluştu');
        }
    };

    const handleDelete = async (note: PersonalNote) => {
        try {
            await api.personalNotes.delete(note.id);
            toast.success('Not silindi');
            invalidate();
        } catch (e: any) {
            toast.error(e.message || 'Bir hata oluştu');
        }
    };

    const handleToggleDone = async (note: PersonalNote, checked: boolean) => {
        try {
            await api.personalNotes.update(note.id, { is_done: checked });
            invalidate();
        } catch (e: any) {
            toast.error(e.message || 'Bir hata oluştu');
        }
    };

    const handleAcceptTask = async (note: PersonalNote) => {
        setActionLoadingId(note.id);
        try {
            await api.personalNotes.accept(note.id);
            toast.success(`"${note.title}" görevi kabul edildi.`);
            invalidate();
        } catch (e: any) {
            toast.error(e.message || 'Görev kabul edilirken hata oluştu.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRejectTask = async (note: PersonalNote) => {
        setActionLoadingId(note.id);
        try {
            await api.personalNotes.reject(note.id);
            toast.info(`"${note.title}" görevi reddedildi.`);
            invalidate();
        } catch (e: any) {
            toast.error(e.message || 'Görev reddedilirken hata oluştu.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const notes = notesQuery.data ?? [];

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">İş & Not Takip Listesi</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Kişisel notlarınızı yönetin veya klinik personeli ile ortak görev paylaşımı yapın.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as NoteSortBy)}>
                        <SelectTrigger className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(SORT_LABELS) as NoteSortBy[]).map((s) => (
                                <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleCreate} className="gap-1 shadow-sm">
                        <Plus className="h-4 w-4" />
                        Yeni İş / Not
                    </Button>
                </div>
            </div>

            {/* Scope Tabs */}
            <Tabs value={scope} onValueChange={(v) => setScope(v as NoteScope)} className="w-full">
                <TabsList className="grid grid-cols-4 w-full sm:w-[500px]">
                    <TabsTrigger value="all">Tümü</TabsTrigger>
                    <TabsTrigger value="my_notes">Kişisel</TabsTrigger>
                    <TabsTrigger value="assigned_to_me">Bana Atananlar</TabsTrigger>
                    <TabsTrigger value="assigned_by_me">Atadıklarım</TabsTrigger>
                </TabsList>
            </Tabs>

            {notesQuery.isLoading && <div className="text-sm text-muted-foreground py-4">Yükleniyor...</div>}

            {!notesQuery.isLoading && notes.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">
                    Bu görünümde henüz bir iş veya not bulunmuyor.
                </div>
            )}

            <div className="space-y-2.5">
                {notes.map((note) => {
                    const isPendingForMe = note.assignment_status === 'pending' && note.assigned_to_id;
                    const hasAssignment = note.assigned_to_id && note.user_id !== note.assigned_to_id;

                    return (
                        <div
                            key={note.id}
                            className={cn(
                                'border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start gap-3 transition-shadow hover:shadow-sm',
                                NOTE_COLOR_CARD_BG[note.color]
                            )}
                        >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <Checkbox
                                    className="mt-1"
                                    checked={note.is_done}
                                    onCheckedChange={(checked) => handleToggleDone(note, !!checked)}
                                />
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={cn('font-semibold text-sm sm:text-base break-words', note.is_done && 'line-through text-muted-foreground')}>
                                            {note.title}
                                        </span>
                                        <Badge variant="secondary" className="text-[11px]">
                                            {RECURRENCE_LABELS[note.recurrence_type]}
                                        </Badge>

                                        {/* Collaborative Assignment Badges */}
                                        {hasAssignment && note.creator && (
                                            <Badge variant="outline" className="text-[11px] gap-1 bg-background/80">
                                                <User className="h-3 w-3 text-blue-600" />
                                                Atayan: {note.creator.full_name || note.creator.username}
                                            </Badge>
                                        )}

                                        {hasAssignment && note.assigned_to && (
                                            <Badge variant="outline" className="text-[11px] gap-1 bg-background/80">
                                                <Send className="h-3 w-3 text-indigo-600" />
                                                Atanan: {note.assigned_to.full_name || note.assigned_to.username}
                                            </Badge>
                                        )}

                                        {note.assignment_status === 'pending' && (
                                            <Badge variant="outline" className="text-[11px] gap-1 text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">
                                                <Clock className="h-3 w-3 animate-spin" />
                                                Onay Bekliyor
                                            </Badge>
                                        )}

                                        {note.assignment_status === 'accepted' && (
                                            <Badge variant="outline" className="text-[11px] gap-1 text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Kabul Edildi
                                            </Badge>
                                        )}

                                        {note.assignment_status === 'rejected' && (
                                            <Badge variant="outline" className="text-[11px] gap-1 text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300" title={note.rejection_reason || 'Gerekçe belirtilmedi'}>
                                                <XCircle className="h-3 w-3" />
                                                Reddedildi {note.rejection_reason && `(${note.rejection_reason})`}
                                            </Badge>
                                        )}
                                    </div>

                                    {note.content && (
                                        <p className={cn('text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap', note.is_done && 'line-through text-muted-foreground')}>
                                            {note.content}
                                        </p>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Planlanan: {format(new Date(note.starts_at), 'd MMMM yyyy HH:mm', { locale: tr })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                                {/* Inline Accept/Reject for pending assigned tasks */}
                                {isPendingForMe && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                                            onClick={() => handleAcceptTask(note)}
                                            disabled={actionLoadingId === note.id}
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            Kabul Et
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs text-rose-700 border-rose-300 hover:bg-rose-50 gap-1"
                                            onClick={() => handleRejectTask(note)}
                                            disabled={actionLoadingId === note.id}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Reddet
                                        </Button>
                                    </>
                                )}

                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleEdit(note)}>
                                    Düzenle
                                </Button>
                                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleDelete(note)}>
                                    Sil
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <NoteFormDialog
                open={dialogOpen}
                note={editingNote}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
