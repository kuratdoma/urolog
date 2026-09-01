/**
 * Muayene çıktısının TÜREV verisi — tek kaynak.
 *
 * Bu mantık daha önce yalnızca `app/print/examination/[id]/page.tsx` içinde `useMemo`
 * bloklarıydı. Android için sunucu tarafı PDF ucu (`app/mobile-print/examination/[id]`)
 * aynı hesabı yapmak zorunda; kopyalansaydı iki çıktı zamanla birbirinden ayrışırdı ve
 * hasta HANGİ IPSS kırılımını gördüğü belli olmayan iki farklı rapor alırdı. Bu yüzden
 * saf fonksiyonlara çıkarıldı: sayfa da uç da buradan çağırır.
 *
 * DİKKAT — `"Seçiniz..."` bir veri değil, boş sentinel'idir; hiçbir alanda gösterilmez.
 * IPSS sütunları (pollakiuri, nokturi, ...) SAYISAL puan tutar; aynı belirtinin
 * "Var/Yok" metni `sistem_sorgu` JSON'undaki `*_text` / `*_sq` anahtarlarındadır.
 */

export interface IpssPrintData {
    total: number;
    obstructive: number;
    irritative: number;
    detailText: string;
    individual: {
        residivHissi: number;
        kesikIdrar: number;
        projeksiyon: number;
        baslamaZorluk: number;
        pollakiuri: number;
        urgency: number;
        nokturi: number;
    };
}

export interface IiefPrintData {
    score: number;
    severity: string;
    color: string;
}

export interface ExaminationComputedData {
    sq: Record<string, any>;
    ipssData: IpssPrintData | null;
    iiefData: IiefPrintData | null;
    systemInquiry: string;
}

/** `sistem_sorgu` serbest metin de olabilir JSON da; JSON değilse boş nesne. */
export function parseSystemQuery(exam: any): Record<string, any> {
    if (!exam || !exam.sistem_sorgu) return {};
    if (typeof exam.sistem_sorgu === 'object' && exam.sistem_sorgu !== null) {
        return exam.sistem_sorgu;
    }
    if (typeof exam.sistem_sorgu === 'string' && exam.sistem_sorgu.trim().startsWith("{")) {
        try {
            return JSON.parse(exam.sistem_sorgu);
        } catch {
            return {};
        }
    }
    return {};
}

/** Tüm bileşenler 0 ise IPSS bloğu HİÇ basılmaz (null) — "0 puan" ile "ölçülmedi" aynı şey değil. */
export function buildIpssData(exam: any, sq: Record<string, any> = {}): IpssPrintData | null {
    if (!exam) return null;
    const safeSq = sq || {};
    const total = parseInt(exam.ipss_skor || "0");

    const residivHissi = parseInt(exam.residiv_hissi || "0");
    const kesikIdrar = parseInt(exam.kesik_idrar_yapma || "0");
    const projeksiyon = parseInt(exam.projeksiyon_azalma || "0");
    const baslamaZorluk = parseInt(exam.idrar_bas_zorluk || "0");
    const pollakiuri = parseInt(exam.pollakiuri || "0");
    const urgency = parseInt(exam.urgency || "0") || parseInt(safeSq.urgency || "0");
    const nokturi = parseInt(exam.nokturi || "0");

    if (total === 0 && residivHissi === 0 && pollakiuri === 0 && nokturi === 0 &&
        kesikIdrar === 0 && projeksiyon === 0 && baslamaZorluk === 0 && urgency === 0) {
        return null;
    }

    const obstructive = residivHissi + kesikIdrar + projeksiyon + baslamaZorluk;
    const irritative = pollakiuri + urgency + nokturi;

    const details: string[] = [];
    if (residivHissi > 0) details.push(`Rezidü hissi ${residivHissi}`);
    if (pollakiuri > 0) details.push(`pollakuri ${pollakiuri}`);
    if (nokturi > 0) details.push(`nokturi ${nokturi}`);
    if (kesikIdrar > 0) details.push(`kesik işeme ${kesikIdrar}`);
    if (urgency > 0) details.push(`urgency ${urgency}`);
    if (baslamaZorluk > 0) details.push(`ıkınma ${baslamaZorluk}`);
    if (projeksiyon > 0) details.push(`projeksiyon ${projeksiyon}`);

    const scoresSuffix = `IRR: ${irritative}, OBST: ${obstructive}, IPSS: ${total}`;
    const detailText = details.length > 0
        ? `${details.join(", ")}  ${scoresSuffix}`
        : scoresSuffix;

    return {
        total,
        obstructive,
        irritative,
        detailText,
        individual: { residivHissi, kesikIdrar, projeksiyon, baslamaZorluk, pollakiuri, urgency, nokturi }
    };
}

/** IIEF-EF eşikleri; skor 0 = form doldurulmamış, blok basılmaz. */
export function buildIiefData(exam: any): IiefPrintData | null {
    if (!exam) return null;
    const score = parseInt(exam.iief_ef_skor || "0");
    if (score === 0) return null;

    let severity = "ED Yok";
    let color = "emerald";
    if (score <= 10) { severity = "Şiddetli ED"; color = "red"; }
    else if (score <= 16) { severity = "Orta ED"; color = "orange"; }
    else if (score <= 21) { severity = "Hafif-Orta ED"; color = "yellow"; }
    else if (score <= 25) { severity = "Hafif ED"; color = "lime"; }

    return { score, severity, color };
}

const LUTS_MAPPING: Record<string, { label: string; sqKeys: string[] }> = {
    pollakiuri: { label: "Pollaküri", sqKeys: ["pollakiuri_text", "pollakiuri_sq"] },
    nokturi: { label: "Noktüri", sqKeys: ["nokturi_text", "nokturi_sq"] },
    projeksiyon_azalma: { label: "Zayıf Akım", sqKeys: ["projeksiyon_azalma_sq", "projeksiyon_azalma_text"] },
    idrar_bas_zorluk: { label: "Başlama Zorluğu", sqKeys: ["idrar_bas_zorluk_text", "idrar_bas_zorluk_sq"] },
    kesik_idrar_yapma: { label: "Kesik Kesik Yapma", sqKeys: ["kesik_idrar_yapma_text", "kesik_idrar_yapma_sq"] },
    residiv_hissi: { label: "Tam Boşalamama", sqKeys: ["residu_hissi_text", "residiv_hissi_text", "residiv_hissi_sq"] },
    urgency: { label: "Urgency", sqKeys: ["urgency"] },
};

const OTHER_MAPPING: Record<string, string> = {
    disuri: "Disüri",
    hematuri: "Hematüri",
    urgency: "Sıkışma",
    catallanma: "Çatallanma",
    kalibre_incelme: "Kalibre İncelme",
    terminal_damlama: "Terminal Damlama",
    inkontinans: "İnkontinans",
    genital_akinti: "Genital Akıntı",
    kabizlik: "Kabızlık",
    tas_oyku: "Taş Öyküsü",
    ates: "Ateş",
    erektil_islev: "Erektil Disfonksiyon",
    ejakulasyon: "Ejakülasyon",
};

/** Sistem sorgusu tek satırlık özet metne indirgenir (LUTS önce, diğerleri sonra). */
export function buildSystemInquiry(exam: any, sq: Record<string, any> = {}): string {
    if (!exam) return "";
    const safeSq = sq || {};
    const parts: string[] = [];

    Object.entries(LUTS_MAPPING).forEach(([key, info]) => {
        let val = "";
        for (const sqKey of info.sqKeys) {
            if (safeSq[sqKey] && safeSq[sqKey] !== "Seçiniz...") {
                val = safeSq[sqKey];
                break;
            }
        }
        if (!val) {
            const examVal = exam[key];
            if (examVal !== undefined && examVal !== null && examVal !== "" && examVal !== "Seçiniz...") {
                val = examVal;
            }
        }
        if (val) {
            const displayVal = (val === "Var" || val === "Evet" || val === "var" || val === "evet") ? "var" : val.toString().toLowerCase();
            parts.push(`${info.label} ${displayVal}`);
        }
    });

    Object.entries(OTHER_MAPPING).forEach(([key, label]) => {
        let val = exam[key];
        if (!val || val === "Seçiniz...") {
            val = safeSq[key] || safeSq[key + "_text"] || safeSq[key + "_sq"] || safeSq[key + "Text"] || safeSq[key + "SQ"];
        }
        if (val !== undefined && val !== null && val !== "" && val !== "Seçiniz...") {
            const displayVal = (val === "Var" || val === "Evet" || val === "var" || val === "evet") ? "var" : val.toString().toLowerCase();
            parts.push(`${label} ${displayVal}`);
        }
    });

    return parts.join(", ");
}

/** `ExaminationPDF`'in `computedData` prop'unun tamamı. */
export function buildExaminationComputedData(exam: any): ExaminationComputedData {
    const sq = parseSystemQuery(exam);
    return {
        sq,
        ipssData: buildIpssData(exam, sq),
        iiefData: buildIiefData(exam),
        systemInquiry: buildSystemInquiry(exam, sq),
    };
}

/**
 * Dosya adı web'deki `document.title` ile aynı kalıpta: `AdSoyad-YYYY-MM-DD-Muayene`.
 * Uzantısız döner. Tarih ayrıştırılamazsa "Tarihsiz" — uydurma tarih üretilmez.
 */
export function buildExaminationPdfBaseName(exam: any, patient: any): string {
    const raw = typeof exam?.tarih === "string" ? exam.tarih.slice(0, 10) : "";
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "Tarihsiz";
    const adSoyad = `${patient?.ad ?? ""}${patient?.soyad ?? ""}`.replace(/\s+/g, "");
    return `${adSoyad || "Hasta"}-${dateStr}-Muayene`;
}
