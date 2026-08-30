'use client';

import { useEffect, useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { PersonalNote, PersonalNoteCreate, RecurrenceType, NoteColor } from '@/lib/api';
import { DateTimeField, roundToNearest15 } from './date-time-field';
import { NOTE_COLOR_ORDER, NOTE_COLOR_SWATCH, NOTE_COLOR_LABELS } from './note-colors';
import { cn } from '@/lib/utils';

interface NoteFormDialogProps {
    open: boolean;
    note?: PersonalNote | null;
    onClose: () => void;
    onSubmit: (data: PersonalNoteCreate) => Promise<void>;
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    once: 'Tek seferlik',
    daily: 'Her gün',
    weekly: 'Her hafta',
    monthly: 'Her ay',
};

export function NoteFormDialog({ open, note, onClose, onSubmit }: NoteFormDialogProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [color, setColor] = useState<NoteColor>('default');
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('once');
    const [interval, setInterval] = useState(1);
    const [startsAt, setStartsAt] = useState<Date>(() => roundToNearest15(new Date()));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle(note?.title ?? '');
            setContent(note?.content ?? '');
            setColor(note?.color ?? 'default');
            setRecurrenceType(note?.recurrence_type ?? 'once');
            setInterval(note?.interval ?? 1);
            setStartsAt(roundToNearest15(note?.starts_at ? new Date(note.starts_at) : new Date()));
        }
    }, [open, note]);

    const handleSubmit = async () => {
        if (!title) return;
        setSubmitting(true);
        try {
            const timeOfDay = `${String(startsAt.getHours()).padStart(2, '0')}:${String(startsAt.getMinutes()).padStart(2, '0')}:00`;
            await onSubmit({
                title,
                content: content || undefined,
                color,
                recurrence_type: recurrenceType,
                interval,
                time_of_day: timeOfDay,
                starts_at: startsAt.toISOString(),
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="w-[60vw] max-w-none sm:max-w-none max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-4 pr-6">
                        <DialogTitle>{note ? 'Notu Düzenle' : 'Yeni Not'}</DialogTitle>
                        <div className="flex items-center gap-1.5">
                            {NOTE_COLOR_ORDER.map((c) => (
                                <Button
                                    key={c}
                                    type="button"
                                    title={NOTE_COLOR_LABELS[c]}
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        'h-7 w-7 p-0 rounded-md flex items-center justify-center border-2 transition-colors',
                                        NOTE_COLOR_SWATCH[c],
                                        color === c ? 'border-gray-700' : 'border-transparent'
                                    )}
                                >
                                    {color === c && <Check className="h-4 w-4 text-gray-800" />}
                                </Button>
                            ))}
                        </div>
                    </div>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="note-title">Başlık</Label>
                        <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="note-content">İçerik</Label>
                        <Textarea
                            id="note-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[160px] resize-y"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tarih ve saat</Label>
                        <DateTimeField value={startsAt} onChange={setStartsAt} />
                    </div>
                    <div className="space-y-2">
                        <Label>Tekrar</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((rt) => (
                                <Button
                                    key={rt}
                                    type="button"
                                    size="sm"
                                    className={cn(
                                        'h-8 px-3 text-xs',
                                        recurrenceType === rt
                                            ? 'bg-gray-700 text-white hover:bg-gray-700'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    )}
                                    onClick={() => setRecurrenceType(rt)}
                                >
                                    {RECURRENCE_LABELS[rt]}
                                </Button>
                            ))}
                        </div>
                    </div>
                    {recurrenceType !== 'once' && (
                        <div className="space-y-2">
                            <Label htmlFor="note-interval">Aralık (kaç {recurrenceType === 'daily' ? 'günde' : recurrenceType === 'weekly' ? 'haftada' : 'ayda'} bir)</Label>
                            <Input
                                id="note-interval"
                                type="number"
                                min={1}
                                value={interval}
                                onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>İptal</Button>
                    <Button onClick={handleSubmit} disabled={!title || submitting}>
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
