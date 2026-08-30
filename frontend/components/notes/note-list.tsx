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
import { api, PersonalNote, PersonalNoteCreate, RecurrenceType, NoteSortBy } from '@/lib/api';
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

    const notesQuery = useQuery({
        queryKey: ['personal-notes', 'list', sortBy],
        queryFn: () => api.personalNotes.list(true, sortBy),
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
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Bir hata oluştu');
        }
    };

    const handleDelete = async (note: PersonalNote) => {
        try {
            await api.personalNotes.delete(note.id);
            toast.success('Not silindi');
            invalidate();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Bir hata oluştu');
        }
    };

    const handleToggleDone = async (note: PersonalNote, checked: boolean) => {
        try {
            await api.personalNotes.update(note.id, { is_done: checked });
            invalidate();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Bir hata oluştu');
        }
    };

    const notes = notesQuery.data ?? [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Notlarım</h2>
                <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as NoteSortBy)}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(SORT_LABELS) as NoteSortBy[]).map((s) => (
                                <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleCreate}>Yeni Not</Button>
                </div>
            </div>

            {notesQuery.isLoading && <div className="text-sm text-muted-foreground">Yükleniyor...</div>}

            {!notesQuery.isLoading && notes.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                    Henüz bir not eklemediniz
                </div>
            )}

            <div className="space-y-2">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className={cn(
                            'border rounded-lg p-4 flex justify-between items-start',
                            NOTE_COLOR_CARD_BG[note.color]
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <Checkbox
                                className="mt-1"
                                checked={note.is_done}
                                onCheckedChange={(checked) => handleToggleDone(note, !!checked)}
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={note.is_done ? 'line-through text-muted-foreground' : 'font-medium'}>
                                        {note.title}
                                    </span>
                                    <Badge variant="secondary">{RECURRENCE_LABELS[note.recurrence_type]}</Badge>
                                </div>
                                {note.content && (
                                    <p className={cn('text-sm text-muted-foreground mt-1', note.is_done && 'line-through')}>
                                        {note.content}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(note.starts_at), 'd MMMM yyyy HH:mm', { locale: tr })}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(note)}>
                                Düzenle
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(note)}>
                                Sil
                            </Button>
                        </div>
                    </div>
                ))}
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
