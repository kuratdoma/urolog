import { describe, it, expect } from 'vitest';
import {
    parseSystemQuery,
    buildIpssData,
    buildIiefData,
    buildSystemInquiry,
    buildExaminationPdfBaseName,
} from './examination-print-data';

describe('parseSystemQuery', () => {
    it('JSON olmayan sistem sorgusunu boş nesneye indirger', () => {
        expect(parseSystemQuery({ sistem_sorgu: 'serbest metin' })).toEqual({});
        expect(parseSystemQuery({ sistem_sorgu: '{bozuk' })).toEqual({});
        expect(parseSystemQuery({})).toEqual({});
    });

    it('JSON sistem sorgusunu ayrıştırır', () => {
        expect(parseSystemQuery({ sistem_sorgu: '{"urgency":"3"}' })).toEqual({ urgency: '3' });
    });
});

describe('buildIpssData', () => {
    /** "Hiç ölçülmedi" ile "her şey 0" ayrımı: blok basılmamalı. */
    it('tüm bileşenler sıfırsa null döner', () => {
        expect(buildIpssData({ ipss_skor: '0' }, {})).toBeNull();
    });

    it('irritatif/obstrüktif kırılımı ve detay metnini üretir', () => {
        const data = buildIpssData(
            {
                ipss_skor: '12',
                residiv_hissi: '2',
                kesik_idrar_yapma: '1',
                projeksiyon_azalma: '3',
                idrar_bas_zorluk: '0',
                pollakiuri: '4',
                nokturi: '2',
            },
            { urgency: '0' },
        );
        expect(data).not.toBeNull();
        expect(data!.obstructive).toBe(6);
        expect(data!.irritative).toBe(6);
        expect(data!.detailText).toContain('IRR: 6, OBST: 6, IPSS: 12');
        expect(data!.detailText).toContain('Rezidü hissi 2');
    });

    it('urgency muayenede yoksa sistem sorgusundan alınır', () => {
        const data = buildIpssData({ ipss_skor: '0' }, { urgency: '3' });
        expect(data!.irritative).toBe(3);
    });
});

describe('buildIiefData', () => {
    it('skor 0 ise null döner', () => {
        expect(buildIiefData({ iief_ef_skor: '0' })).toBeNull();
    });

    it.each([
        [8, 'Şiddetli ED'],
        [14, 'Orta ED'],
        [20, 'Hafif-Orta ED'],
        [24, 'Hafif ED'],
        [28, 'ED Yok'],
    ])('skor %i -> %s', (score, severity) => {
        expect(buildIiefData({ iief_ef_skor: String(score) })!.severity).toBe(severity);
    });
});

describe('buildSystemInquiry', () => {
    /** "Seçiniz..." veri değil, boş sentinel — çıktıya girmemeli. */
    it('Seçiniz... değerini yok sayar', () => {
        expect(buildSystemInquiry({ disuri: 'Seçiniz...' }, {})).toBe('');
    });

    it('LUTS metnini sistem sorgusundan, diğerlerini muayeneden alır', () => {
        const text = buildSystemInquiry(
            { disuri: 'Var', pollakiuri: '3' },
            { pollakiuri_text: 'Var' },
        );
        expect(text).toContain('Pollaküri var');
        expect(text).toContain('Disüri var');
    });

    /**
     * REGRESYON: IPSS sütunu sayısal puandır. Metin karşılığı yoksa sayının belirti
     * satırına düşmesi "Pollaküri 3" gibi anlamsız bir çıktı üretir — mevcut davranış
     * budur ve web ile birebir korunmalıdır (değişirse iki rapor ayrışır).
     */
    it('metin yoksa muayenedeki sayısal değeri kullanır (web ile birebir)', () => {
        expect(buildSystemInquiry({ pollakiuri: '3' }, {})).toBe('Pollaküri 3');
    });
});

describe('buildExaminationPdfBaseName', () => {
    it('AdSoyad-tarih-Muayene kalıbını üretir', () => {
        expect(
            buildExaminationPdfBaseName({ tarih: '2026-09-01T10:00:00' }, { ad: 'Ayşe', soyad: 'Yılmaz' }),
        ).toBe('AyşeYılmaz-2026-09-01-Muayene');
    });

    it('tarih ayrıştırılamazsa uydurmaz', () => {
        expect(buildExaminationPdfBaseName({ tarih: null }, { ad: 'Ali', soyad: 'Veli' }))
            .toBe('AliVeli-Tarihsiz-Muayene');
    });
});
