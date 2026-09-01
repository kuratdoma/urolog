'use client';

import { useEffect, useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Check, User, Users, AtSign, Info } from 'lucide-react';
import { PersonalNote, PersonalNoteCreate, RecurrenceType, NoteColor, UserMini, api } from '@/lib/api';
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
    const [assignedToId, setAssignedToId] = useState<string>('self');
    const [colleagues, setColleagues] = useState<UserMini[]>([]);
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('once');
    const [interval, setInterval] = useState(1);
    const [startsAt, setStartsAt] = useState<Date>(() => roundToNearest15(new Date()));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            api.personalNotes.listColleagues().then(setColleagues).catch(() => {});
            setTitle(note?.title ?? '');
            setContent(note?.content ?? '');
            setColor(note?.color ?? 'default');
            setAssignedToId(note?.assigned_to_id ? String(note.assigned_to_id) : 'self');
            setRecurrenceType(note?.recurrence_type ?? 'once');
            setInterval(note?.interval ?? 1);
            setStartsAt(roundToNearest15(note?.starts_at ? new Date(note.starts_at) : new Date()));
        }
    }, [open, note]);

    const handleMentionClick = (user: UserMini) => {
        // Insert @username into content and select assignee
        const mentionTag = `@${user.username} `;
        setContent((prev) => prev ? `${prev} ${mentionTag}` : mentionTag);
        setAssignedToId(String(user.id));
    };

    const handleSubmit = async () => {
        if (!title) return;
        setSubmitting(true);
        try {
            const timeOfDay = `${String(startsAt.getHours()).padStart(2, '0')}:${String(startsAt.getMinutes()).padStart(2, '0')}:00`;
            const targetAssignee = assignedToId && assignedToId !== 'self' ? Number(assignedToId) : undefined;
            await onSubmit({
                title,
                content: content || undefined,
                color,
                assigned_to_id: targetAssignee,
                recurrence_type: recurrenceType,
                interval,
                time_of_day: timeOfDay,
                starts_at: startsAt.toISOString(),
            });
        } finally {
            setSubmitting(false);
        }
    };

    const isAssigningToOther = assignedToId && assignedToId !== 'self';
    const selectedUser = colleagues.find((c) => String(c.id) === assignedToId);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="w-[60vw] max-w-none sm:max-w-none max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-4 pr-6">
                        <DialogTitle>{note ? 'İşi / Notu Düzenle' : 'Yeni İş / Not Oluştur'}</DialogTitle>
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
                        <Input
                            id="note-title"
                            placeholder="Örn: Hasta sonuç kontrolü veya konsültasyon takibi..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="note-content">İçerik ve Detaylar</Label>
                            {colleagues.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <AtSign className="h-3 w-3" />
                                    <span>Hızlı @ etiketle:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {colleagues.slice(0, 4).map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => handleMentionClick(c)}
                                                className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20 text-xs font-mono text-primary transition-colors"
                                            >
                                                @{c.username}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <Textarea
                            id="note-content"
                            placeholder="Not detayları... Başka birine atamak için metin içinde @kullaniciadi yazabilir veya aşağıdan görevli seçebilirsiniz."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[130px] resize-y"
                        />
                    </div>

                    {/* Görev Atama / Ortak İş Listesi Alanı */}
                    <div className="p-3 bg-muted/40 border rounded-lg space-y-2">
                        <Label className="flex items-center gap-1.5 font-medium">
                            <Users className="h-4 w-4 text-primary" />
                            İş Kime Atansın? (Ortak Görev Listesi)
                        </Label>
                        <Select value={assignedToId} onValueChange={setAssignedToId}>
                            <SelectTrigger className="w-full bg-background">
                                <SelectValue placeholder="Görevli Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="self">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>Kendim (Kişisel Not / İşim)</span>
                                    </div>
                                </SelectItem>
                                {colleagues.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{c.full_name || c.username}</span>
                                            <span className="text-xs text-muted-foreground font-mono">(@{c.username})</span>
                                            {c.role && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                                                    {c.role}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {isAssigningToOther && selectedUser && (
                            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 p-2.5 rounded border border-amber-200 dark:border-amber-900">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>
                                    Bu iş <strong>{selectedUser.full_name || selectedUser.username}</strong> kullanıcısına atanacak. Kullanıcı sisteme girdiğinde ekranda popup uyarı açılacak ve kabul/red onayı istenecektir.
                                </span>
                            </div>
                        )}
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
                        {isAssigningToOther ? 'Görevi Ata ve Kaydet' : 'Kaydet'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
