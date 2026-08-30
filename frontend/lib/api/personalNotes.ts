import { apiFetch } from './client';
import {
    PersonalNote, PersonalNoteCreate, PersonalNoteUpdate, DueRemindersResponse, NoteSortBy
} from './types';

export const personalNotesApi = {

    list: (includeDone: boolean = true, sortBy: NoteSortBy = 'due_date') =>
        apiFetch<PersonalNote[]>(`/api/v1/notes?include_done=${includeDone}&sort_by=${sortBy}`),

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
