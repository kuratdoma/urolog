'use client';

import { useEffect, useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NoteReminderOccurrence } from '@/lib/api';
import { DateTimeField, roundToNearest15 } from './date-time-field';

interface SnoozeDialogProps {
    occurrence: NoteReminderOccurrence | null;
    onClose: () => void;
    onConfirm: (newDatetimeISO: string) => Promise<void>;
}

export function SnoozeDialog({ occurrence, onClose, onConfirm }: SnoozeDialogProps) {
    const [value, setValue] = useState<Date>(() => roundToNearest15(new Date()));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (occurrence) {
            const defaultDate = new Date();
            defaultDate.setHours(defaultDate.getHours() + 1);
            setValue(roundToNearest15(defaultDate));
        }
    }, [occurrence]);

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            await onConfirm(value.toISOString());
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={!!occurrence} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hatırlatmayı Ertele</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 py-2">
                    <Label>Yeni tarih ve saat</Label>
                    <DateTimeField value={value} onChange={setValue} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>İptal</Button>
                    <Button onClick={handleConfirm} disabled={submitting}>
                        Ertele
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
