// @vitest-environment node
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { ExaminationPDF } from '@/components/pdf/ExaminationPDF';
import { registerPDFFonts } from '@/lib/pdf-fonts';
import { buildExaminationComputedData } from './examination-print-data';

/**
 * Sunucu tarafı render dumanı testi: Android ucunun (app/mobile-print/...) yaptığı işin
 * aynısı. Fontun DOSYADAN yüklenmesi burada doğrulanır — tarayıcı origin'i olmadan
 * çalışmazsa Türkçe glifler kutuya döner ve bu test render aşamasında patlar.
 */
describe('ExaminationPDF sunucuda render edilir', () => {
    const exam = {
        id: '1',
        hasta_id: '7',
        tarih: '2026-09-01T09:00:00',
        sikayet: 'İdrar yaparken yanma, sık idrara çıkma',
        ipss_skor: '12',
        pollakiuri: '4',
        nokturi: '2',
        residiv_hissi: '2',
        projeksiyon_azalma: '3',
        iief_ef_skor: '18',
        sistem_sorgu: '{"pollakiuri_text":"Var","urgency":"2"}',
        tani: 'BPH',
    };
    const patient = { id: '7', ad: 'Ayşe', soyad: 'Yılmaz', tc_kimlik: '12345678901', cinsiyet: 'Kadın' };

    it('geçerli bir PDF üretir', async () => {
        registerPDFFonts();
        const buffer = await renderToBuffer(
            React.createElement(ExaminationPDF, {
                exam,
                patient,
                settings: { clinic_name: 'UroLOG Klinik' },
                computedData: buildExaminationComputedData(exam),
                selectedLabs: [],
                selectedImaging: [],
            }) as any,
        );

        expect(buffer.length).toBeGreaterThan(1000);
        expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    }, 30000);

    it('gerçek DB verisiyle render edilir', async () => {
        const realExam = {
            "tarih": "2024-12-25",
            "sikayet": "ŞİKAYETLERİ 2.5 AYDIR VAR.",
            "oyku": "Öykü metni...",
            "tani1": "NÖROJEN MESANE",
            "tani1_kodu": "N31.9",
            "tani2": "DİVERTİKÜL",
            "tani2_kodu": "C17.3",
            "oneriler": "None\nİŞEME CİZELGE 4 GÜN",
            "tedavi": "İŞEME CİZELGE 4 GÜN",
            "kan_sulandirici": 0,
            "aliskanliklar": "Alkol: HERGÜN 1-2 KADEH; Sigara: 12 YIL; Allerji: ÖZ YOK",
            "sistem_sorgu": "Disuri: YOK; Pollakiuri: VAR; Nokturi: 3; Kabizlik: YOK",
            "ozgecmis": "ÖZ YOK",
            "soygecmis": "ANNE KOAH \nBABA MENENJİT !",
            "kullandigi_ilaclar": "B 12 BAŞLANMIŞ \nMELATONİN",
            "doktor": "Tayyar Alp Özkan",
            "id": "10e121e6-39cb-5172-921d-8162cb4f7765",
            "hasta_id": "eb41c9cf-66e5-4fdb-a388-9acd885eb51d"
        };
        const realPatient = {
            "id": "eb41c9cf-66e5-4fdb-a388-9acd885eb51d",
            "tc_kimlik": "52546649618",
            "ad": "GÜVEN",
            "soyad": "BAKIREZER",
            "cinsiyet": "ERKEK",
            "dogum_tarihi": "1967-06-19",
            "doktor": "Tayyar Alp Özkan",
            "protokol_no": "ES40156"
        };
        registerPDFFonts();
        const buffer = await renderToBuffer(
            React.createElement(ExaminationPDF, {
                exam: realExam,
                patient: realPatient,
                settings: { clinic_name: 'UroLOG Klinik' },
                computedData: buildExaminationComputedData(realExam),
                selectedLabs: [],
                selectedImaging: [],
            }) as any,
        );

        expect(buffer.length).toBeGreaterThan(1000);
        expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });
});
