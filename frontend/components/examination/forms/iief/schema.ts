import { z } from 'zod';

export const IIEFSchema = z.object({
    q1: z.string().describe("Sertleşme Sıklığı"),
    q2: z.string().describe("Sertleşme Yeterliliği"),
    q3: z.string().describe("Hazneye Giriş Sıklığı"),
    q4: z.string().describe("Sertliği Sürdürme Sıklığı"),
    q5: z.string().describe("Sürdürme Zorluğu"),
    q6: z.string().describe("Öz Güven"),
    iief_total: z.string().optional().describe("Toplam IIEF-EF Skoru")
});

export type IIEFData = z.infer<typeof IIEFSchema>;

export const defaultIIEFData: IIEFData = {
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: '',
    q6: '',
    iief_total: ''
};
