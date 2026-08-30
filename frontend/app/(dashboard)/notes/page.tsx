'use client';

import { NoteList } from '@/components/notes/note-list';

export default function NotesPage() {
    return (
        <div className="p-4 max-w-3xl mx-auto">
            <NoteList />
        </div>
    );
}
