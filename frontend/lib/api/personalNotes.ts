import { apiFetch } from './client';
import {
    PersonalNote, PersonalNoteCreate, PersonalNoteUpdate, DueRemindersResponse, NoteSortBy, NoteScope, UserMini
} from './types';

export const personalNotesApi = {

    // Aktif scope'lar yalnızca tamamlanmamış işleri döner; tamamlananlar 'archive' scope'unda.
    list: (sortBy: NoteSortBy = 'due_date', scope: NoteScope = 'all') =>
        apiFetch<PersonalNote[]>(`/api/v1/notes?sort_by=${sortBy}&scope=${scope}`),

    listColleagues: () =>
        apiFetch<UserMini[]>('/api/v1/notes/colleagues'),

    getPendingAssignments: () =>
        apiFetch<PersonalNote[]>('/api/v1/notes/pending-assignments'),

    markPopupSeen: (noteIds: number[]) =>
        apiFetch<{ ok: boolean }>('/api/v1/notes/pending-assignments/popup-seen', {
            method: 'POST',
            body: JSON.stringify(noteIds),
        }),

    accept: (id: number) =>
        apiFetch<PersonalNote>(`/api/v1/notes/${id}/accept`, { method: 'POST' }),

    reject: (id: number, reason?: string) =>
        apiFetch<PersonalNote>(`/api/v1/notes/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ rejection_reason: reason }),
        }),

    create: (data: PersonalNoteCreate) =>
        apiFetch<PersonalNote>('/api/v1/notes', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: number, data: PersonalNoteUpdate) =>
        apiFetch<PersonalNote>(`/api/v1/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    delete: (id: number) =>
        apiFetch<{ ok: boolean }>(`/api/v1/notes/${id}`, { method: 'DELETE' }),

    getDueReminders: () =>
        apiFetch<DueRemindersResponse>('/api/v1/notes/reminders/due'),

    acknowledge: (occurrenceId: number) =>
        apiFetch<{ ok: boolean }>(`/api/v1/notes/reminders/${occurrenceId}/ack`, { method: 'POST' }),

    snooze: (occurrenceId: number, newDatetime: string) =>
        apiFetch<{ ok: boolean }>(`/api/v1/notes/reminders/${occurrenceId}/snooze`, {
            method: 'POST',
            body: JSON.stringify({ new_datetime: newDatetime }),
        }),

};
