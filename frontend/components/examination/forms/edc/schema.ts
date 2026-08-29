import { z } from 'zod';

export const EDCSchema = z.object({
    // 1. Cinsel Öykü
    c_q1: z.string().optional(), // Başlangıç (Aniden/Kademeli)
    c_q2: z.string().optional(), // Süre
    c_q2_unit: z.string().optional(), // Süre Birimi (Ay/Yıl)
    c_q3: z.string().optional(), // Sabah Ereksiyonu (Var/Yok)
    c_q4: z.string().optional(), // Mastürbasyon Kalitesi (İyi/Yetersiz/Kötü)
    c_q5: z.string().optional(), // Sertlik Skoru (1-10)
    c_q6: z.string().optional(), // Sorun Odağı (Sağlama/Sürdürme)
    c_q7: z.string().optional(), // Cinsel İstek (Normal/Azalmış/Yok)
    c_q8: z.string().optional(), // Boşalma/Orgazm
    c_q10: z.string().optional(), // İlişki Sayısı

    // 2. Tıbbi
    c_m1: z.string().optional(), // Kalp
    c_m2: z.string().optional(), // Hipertansiyon
    c_m3: z.string().optional(), // Hiperlipidemi
    c_m4: z.string().optional(), // DM
    c_m6: z.string().optional(), // Nörolojik
    c_m7: z.string().optional(), // Pelvik Cerrahi
    c_m8: z.string().optional(), // Uyku Apnesi
    c_m9: z.string().optional(), // Hormonal

    // 3. İlaç & Alışkanlık
    c_h1: z.string().optional(), // Düzenli İlaç
    c_h1_detail: z.string().optional(),
    c_h2: z.string().optional(), // Sigara
    c_h2_detail: z.string().optional(),
    c_h3: z.string().optional(), // Alkol
    c_h5: z.string().optional(), // Fiziksel Aktivite

    // 4. Psikososyal
    c_p1: z.string().optional(), // Stres/Kaygı
    c_p2: z.string().optional(), // Performans Kaygısı
    c_p3: z.string().optional(), // Partner İlişkisi
    c_p4: z.string().optional(), // Depresyon
    c_p5: z.string().optional(), // Partner Durumu
    c_p6: z.string().optional(), // Partner Yaklaşımı
    c_p7: z.string().optional(), // Çekim Kaybı

    // 5. Tedavi
    c_t1: z.string().optional(), // İlaç Deneyimi
    c_t2: z.string().optional(), // İlaç Yanıtı
    c_t3: z.string().optional(), // Sertlik Kaybı Endişesi
});

export type EDCData = z.infer<typeof EDCSchema>;

export const defaultEDCData: EDCData = {};
