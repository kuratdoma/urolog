import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExpandableNoteContent } from './note-list';

describe('ExpandableNoteContent', () => {
    it('kısa notları doğrudan gösterir, açma/kapatma oku göstermez', () => {
        render(<ExpandableNoteContent content="Kısa not metni" isDone={false} />);
        expect(screen.getByText('Kısa not metni')).toBeInTheDocument();
        expect(screen.queryByText('Daha fazla göster')).not.toBeInTheDocument();
        expect(screen.queryByText('Daha az göster')).not.toBeInTheDocument();
    });

    it('çok satırlı uzun notlarda ok ve daha fazla/az göster düğmesini sunar', () => {
        const longText = 'Satır 1: İlaç raporu yenilenecek\nSatır 2: Hasta aranacak\nSatır 3: Kontrol randevusu verilecek\nSatır 4: Ek tetkik istenecek';
        render(<ExpandableNoteContent content={longText} isDone={false} />);

        // Başlangıçta "Daha fazla göster" görünür olmalı
        const expandButton = screen.getByRole('button', { name: /Daha fazla göster/i });
        expect(expandButton).toBeInTheDocument();

        // Tıklanınca genişlemeli ve "Daha az göster" olmalı
        act(() => {
            fireEvent.click(expandButton);
        });
        expect(screen.getByRole('button', { name: /Daha az göster/i })).toBeInTheDocument();

        // Tekrar tıklanınca daralmalı
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: /Daha az göster/i }));
        });
        expect(screen.getByRole('button', { name: /Daha fazla göster/i })).toBeInTheDocument();
    });

    it('tamamlanmış notlarda line-through sınıfı korunur', () => {
        const { container } = render(<ExpandableNoteContent content="Tamamlanmış not" isDone={true} />);
        const paragraph = container.querySelector('p');
        expect(paragraph?.className).toContain('line-through');
    });
});
