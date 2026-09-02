import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import { api, PersonalNote } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const DAILY_DIGEST_STORAGE_KEY = 'urolog:daily-digest-last-shown';

export const useDailyDigest = () => {
    const [open, setOpen] = useState(false);
    const token = useAuthStore((s) => s.token);
    const hasHydrated = useAuthStore((s) => s._hasHydrated);
    const enabled = hasHydrated && !!token;

    const notesQuery = useQuery({
        queryKey: ['personal-notes', 'list'],
        // Varsayılan liste zaten tamamlananları (arşivi) hariç tutar.
        queryFn: () => api.personalNotes.list(),
        enabled,
    });

    const todaysNotes = useMemo(() => {
        const now = new Date();
        return (notesQuery.data ?? []).filter((note: PersonalNote) => isSameDay(new Date(note.starts_at), now));
    }, [notesQuery.data]);

    useEffect(() => {
        if (!enabled || notesQuery.isLoading) return;

        const todayKey = format(new Date(), 'yyyy-MM-dd');
        try {
            const lastShown = localStorage.getItem(DAILY_DIGEST_STORAGE_KEY);
            if (lastShown !== todayKey) {
                // localStorage'a yazma bir yan etki; "bugün gösterildi mi" render
                // sırasında hesaplanamaz (async veri + tarih karşılaştırması) —
                // bu yüzden setState burada kasıtlı.
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setOpen(true);
                localStorage.setItem(DAILY_DIGEST_STORAGE_KEY, todayKey);
            }
        } catch {
            // localStorage kullanılamıyorsa (gizli sekme vb.) günlük özet sessizce atlanır.
        }
    }, [enabled, notesQuery.isLoading]);

    return { open, setOpen, todaysNotes, isLoading: notesQuery.isLoading };
};
