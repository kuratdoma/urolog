import { NoteColor } from '@/lib/api';

export const NOTE_COLOR_ORDER: NoteColor[] = ['default', 'green', 'blue', 'yellow', 'red'];

export const NOTE_COLOR_SWATCH: Record<NoteColor, string> = {
    default: 'bg-gray-300',
    green: 'bg-green-400',
    blue: 'bg-blue-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
};

export const NOTE_COLOR_CARD_BG: Record<NoteColor, string> = {
    default: 'bg-white',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
};

export const NOTE_COLOR_LABELS: Record<NoteColor, string> = {
    default: 'Varsayılan',
    green: 'Normal',
    blue: 'İvedi',
    yellow: 'Önemli',
    red: 'Acil',
};
