export const IIEF_LABELS = {
    title: "IIEF-EF",
    description: "Uluslararası Erektil İşlev İndeksi (Erektil Fonksiyon Alanı)",
    questions: {
        q1: {
            label: "1. SERTLEŞMENİN SIKLIĞI",
            description: "Cinsel faaliyetleriniz sırasında peniste sertleşme ne sıklıkta oldu?"
        },
        q2: {
            label: "2. SERTLEŞMENİN YETERLİLİĞİ",
            description: "Cinsel uyarılmayla oluşan sertleşmelerin ne kadarlık kısmı cinsel ilişki sağlayacak düzeydeydi?"
        },
        q3: {
            label: "3. HAZNEYE GİRİŞ",
            description: "Cinsel ilişki girişimlerinde hazneye giriş ne sıklıkla mümkün oldu?"
        },
        q4: {
            label: "4. SERTLİĞİ SÜRDÜRME",
            description: "Cinsel ilişkiler sırasındaki sertliği ne sıklıkla devam ettirebildiniz?"
        },
        q5: {
            label: "5. SÜRDÜRME ZORLUĞU",
            description: "Cinsel ilişkileri tamamlamak için sertleşmeyi sürdürmekte ne kadar zorlandınız?"
        },
        q6: {
            label: "6. ÖZ GÜVEN",
            description: "Sertleşmeyi sağlama ve devam ettirme konusunda kendinize güveninizi nasıl değerlendiriyorsunuz?"
        }
    }
} as const;

export const IIEF_OPTIONS = {
    q1: [
        { value: "0", label: "Cinsel faaliyet olmadı" },
        { value: "1", label: "Hiç/hemen hemen hiç" },
        { value: "2", label: "Nadiren" },
        { value: "3", label: "Bazen" },
        { value: "4", label: "Çoğunlukla" },
        { value: "5", label: "Hemen hemen hepsinde" }
    ],
    q2: [
        { value: "0", label: "Uyarılma olmadı" },
        { value: "1", label: "Hiç/hemen hemen hiç" },
        { value: "2", label: "Nadiren" },
        { value: "3", label: "Bazen" },
        { value: "4", label: "Çoğunlukla" },
        { value: "5", label: "Hemen hemen hepsinde" }
    ],
    q3: [
        { value: "0", label: "Cinsel ilişki olmadı" },
        { value: "1", label: "Hiç/hemen hemen hiç" },
        { value: "2", label: "Nadiren" },
        { value: "3", label: "Bazen" },
        { value: "4", label: "Çoğunlukla" },
        { value: "5", label: "Hemen hemen hepsinde" }
    ],
    q4: [
        { value: "0", label: "Girişimde bulunmadım" },
        { value: "1", label: "Hiç/hemen hemen hiç" },
        { value: "2", label: "Nadiren" },
        { value: "3", label: "Bazen" },
        { value: "4", label: "Çoğunlukla" },
        { value: "5", label: "Hemen hemen hepsinde" }
    ],
    q5: [
        { value: "0", label: "Girişimde bulunmadım" },
        { value: "1", label: "Aşırı zorlandım" },
        { value: "2", label: "Çok zorlandım" },
        { value: "3", label: "Zorlandım" },
        { value: "4", label: "Biraz zorlandım" },
        { value: "5", label: "Hiç zorlanmadım" }
    ],
    q6: [
        { value: "1", label: "Çok az" },
        { value: "2", label: "Az" },
        { value: "3", label: "Orta" },
        { value: "4", label: "Tama yakın" },
        { value: "5", label: "Tam" }
    ]
} as const;
