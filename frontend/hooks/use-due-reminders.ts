import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, NoteReminderOccurrence } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const DUE_REMINDERS_POLL_INTERVAL = 60 * 1000; // 60 sn
const SHOWN_OCCURRENCES_STORAGE_KEY = "urolog:shown-reminder-occurrences";

function getShownOccurrenceIds(): Set<number> {
    try {
        const raw = sessionStorage.getItem(SHOWN_OCCURRENCES_STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function markOccurrenceShown(id: number) {
    try {
        const shown = getShownOccurrenceIds();
        shown.add(id);
        sessionStorage.setItem(SHOWN_OCCURRENCES_STORAGE_KEY, JSON.stringify(Array.from(shown)));
    } catch {
        // sessionStorage kullanılamıyorsa (gizli sekme vb.) sessizce yok say —
        // tek sonuç aynı hatırlatmanın oturum içinde tekrar toast olarak görünmesidir.
    }
}

export const useDueReminders = () => {
    const queryClient = useQueryClient();
    const token = useAuthStore((s) => s.token);
    const hasHydrated = useAuthStore((s) => s._hasHydrated);
    const enabled = hasHydrated && !!token;

    const dueQuery = useQuery({
        queryKey: ["personal-notes", "due-reminders"],
        queryFn: () => api.personalNotes.getDueReminders(),
        enabled,
        refetchInterval: DUE_REMINDERS_POLL_INTERVAL,
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (!dueQuery.data) return;

        const shown = getShownOccurrenceIds();
        const newlyDue = dueQuery.data.due.filter(
            (occurrence: NoteReminderOccurrence) => !shown.has(occurrence.id)
        );

        for (const occurrence of newlyDue) {
            markOccurrenceShown(occurrence.id);
            toast(occurrence.note.title, {
                description: occurrence.note.content || undefined,
            });
        }
    }, [dueQuery.data]);

    const acknowledge = async (occurrenceId: number) => {
        await api.personalNotes.acknowledge(occurrenceId);
        queryClient.invalidateQueries({ queryKey: ["personal-notes"] });
    };

    const snooze = async (occurrenceId: number, newDatetime: string) => {
        await api.personalNotes.snooze(occurrenceId, newDatetime);
        queryClient.invalidateQueries({ queryKey: ["personal-notes"] });
    };

    return {
        due: dueQuery.data?.due ?? [],
        missedCount: dueQuery.data?.missed_count ?? 0,
        isLoading: dueQuery.isLoading,
        acknowledge,
        snooze,
    };
};
