export const IPSS_LABELS = {
    title: "AUA SEMPTOM SKORU (AUASS / IPSS)",
    description: "Uluslararası Prostat Semptom Skoru",
    questions: {
        ipss1: { label: "1. Boşalamama Hissi", description: "İşeme sonrası rezidü hissi var mı?" },
        ipss2: { label: "2. Sık İdrara Çıkma", description: "İşeme sonrası 2 saat geçmeden tekrar işeme ihtiyacını ne sıklıkla hissettiniz?" },
        ipss3: { label: "3. Kesik Kesik Yapma", description: "işerken, idrar birkaç kez kesilip tekrar başlar mı?" },
        ipss4: { label: "4. İdrar Sıkışması", description: "İdrarınızı tutmakta (ertelemekte) zorlanır mısınız?" },
        ipss5: { label: "5. Zayıf Akış", description: "İşeme tazzyikinizde azalma var mı?" },
        ipss6: { label: "6. Ikınma", description: "İşemek için ne sıklıkla ıkınmak veya zorlanmak zorunda kaldınız?" },
        ipss7: { label: "7. Gece Kalkma", description: "gece kaç kez idrara çıktınız?" }
    },
    qualityOfLife: {
        label: "Yaşam Kalitesi",
        description: "Mevcut idrar yapma durumunuz hayatınızın geri kalanında hiç değişmeden bu şekilde devam etseydi kendinizi nasıl hissederdiniz?"
    }
} as const;

export const IPSS_ANSWER_SCALES = {
    frequency: [
        { value: '0', label: "Hiç" },
        { value: '1', label: "Nadir" },
        { value: '2', label: "Bazen" },
        { value: '3', label: "Yarısı" },
        { value: '4', label: "Sık" },
        { value: '5', label: "Her Zaman" }
    ],
    nocturia: [
        { value: '0', label: "Hiç" },
        { value: '1', label: "1" },
        { value: '2', label: "2" },
        { value: '3', label: "3" },
        { value: '4', label: "4" },
        { value: '5', label: "5+" }
    ],
    qol: [
        { value: '0', label: "Çok Memnun" },
        { value: '1', label: "Memnun" },
        { value: '2', label: "Çoğ. Memnun" },
        { value: '3', label: "Karışık" },
        { value: '4', label: "Çoğ. Mutsuz" },
        { value: '5', label: "Mutsuz" },
        { value: '6', label: "Berbat" }
    ]
} as const;

export const IPSS_OPTIONS = IPSS_ANSWER_SCALES.frequency.map(x => x.value);
export const QOL_OPTIONS = IPSS_ANSWER_SCALES.qol.map(x => x.value);
