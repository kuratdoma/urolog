import { z } from 'zod';

export const IPSSSchema = z.object({
    ipss1: z.string().describe("Yetersiz Boşalma (0-5)"),
    ipss2: z.string().describe("Sık İdrara Çıkma (0-5)"),
    ipss3: z.string().describe("Kesik Kesik İşeme (0-5)"),
    ipss4: z.string().describe("Tutamama (0-5)"),
    ipss5: z.string().describe("Zayıf Akım (0-5)"),
    ipss6: z.string().describe("Ikınma (0-5)"),
    ipss7: z.string().describe("Gece İdrara Çıkma (0-5)"),
    ipss_total: z.string().optional().describe("Toplam IPSS Skoru"),
    ipss_qol: z.string().describe("Yaşam Kalitesi Skoru (0-6)")
});

export type IPSSData = z.infer<typeof IPSSSchema>;

export const defaultIPSSData: IPSSData = {
    ipss1: '',
    ipss2: '',
    ipss3: '',
    ipss4: '',
    ipss5: '',
    ipss6: '',
    ipss7: '',
    ipss_total: '',
    ipss_qol: ''
};
