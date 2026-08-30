import { useMemo } from "react";
import { Muayene } from "@/lib/api";

export interface ExaminationFormData {
    hasta_id: string;
    tarih: Date | undefined;
    sikayet: string;
    oyku: string;
    tansiyon: string;
    ates: string;
    kvah: string;
    bobrek_sag: string;
    bobrek_sol: string;
    suprapubik_kitle: string;
    ego: string;
    rektal_tuse: string;
    disuri: string;
    hematuri: string;
    genital_akinti: string;
    kabizlik: string;
    tas_oyku: string;
    ates_sq: string;
    catallanma: string;
    projeksiyon_azalma_sq: string;
    kalibre_incelme: string;
    terminal_damlama: string;
    inkontinans: string;
    erektil_islev: string;
    ejakulasyon: string;
    residiv_hissi: string;
    pollakiuri: string;
    kesik_idrar_yapma: string;
    urgency: string;
    projeksiyon_azalma: string;
    idrar_bas_zorluk: string;
    nokturi: string;
    pollakiuri_text: string;
    nokturi_text: string;
    residu_hissi_text: string;
    idrar_bas_zorluk_text: string;
    kesik_idrar_yapma_text: string;
    ipss_skor: string;
    ipss_qol: string;
    ozgecmis: string;
    soygecmis: string;
    kullandigi_ilaclar: string;
    sigara: string;
    alkol: string;
    sosyal: string;
    fizik_muayene: string;
    bulgu_notu: string;
    tani1: string;
    tani1_kodu: string;
    tani2: string;
    tani2_kodu: string;
    tani3: string;
    tani3_kodu: string;
    tani4: string;
    tani4_kodu: string;
    tani5: string;
    tani5_kodu: string;
    sonuc: string;
    tedavi: string;
    recete: string;
    oneriler: string;
    takip_notu: string;
    sistem_sorgu: string;
    allerjiler: string;
    kan_sulandirici: number;
    prosedur: string;
    mshq: string;
    mshq_answers: { q1: string; q2: string; q3: string; q4: string };
    doktor: string;
}

export const createInitialFormState = (patientId: string): ExaminationFormData => ({
    hasta_id: patientId,
    tarih: new Date(),
    sikayet: "",
    oyku: "",
    tansiyon: "",
    ates: "",
    kvah: "",
    bobrek_sag: "",
    bobrek_sol: "",
    suprapubik_kitle: "",
    ego: "",
    rektal_tuse: "",
    disuri: "Seçiniz...",
    hematuri: "Seçiniz...",
    genital_akinti: "Seçiniz...",
    kabizlik: "Seçiniz...",
    tas_oyku: "Seçiniz...",
    ates_sq: "Seçiniz...",
    catallanma: "Seçiniz...",
    projeksiyon_azalma_sq: "Seçiniz...",
    kalibre_incelme: "Seçiniz...",
    terminal_damlama: "Seçiniz...",
    inkontinans: "Seçiniz...",
    erektil_islev: "Seçiniz...",
    ejakulasyon: "Seçiniz...",
    residiv_hissi: "0",
    pollakiuri: "0",
    kesik_idrar_yapma: "0",
    urgency: "0",
    projeksiyon_azalma: "0",
    idrar_bas_zorluk: "0",
    nokturi: "0",
    pollakiuri_text: "",
    nokturi_text: "",
    residu_hissi_text: "",
    idrar_bas_zorluk_text: "",
    kesik_idrar_yapma_text: "",
    ipss_skor: "0",
    ipss_qol: "0",
    ozgecmis: "",
    soygecmis: "",
    kullandigi_ilaclar: "",
    sigara: "",
    alkol: "",
    sosyal: "",
    fizik_muayene: "",
    bulgu_notu: "",
    tani1: "",
    tani1_kodu: "",
    tani2: "",
    tani2_kodu: "",
    tani3: "",
    tani3_kodu: "",
    tani4: "",
    tani4_kodu: "",
    tani5: "",
    tani5_kodu: "",
    sonuc: "",
    tedavi: "",
    recete: "",
    oneriler: "",
    takip_notu: "",
    sistem_sorgu: "",
    allerjiler: "",
    kan_sulandirici: 0,
    prosedur: "",
    mshq: "",
    mshq_answers: { q1: "", q2: "", q3: "", q4: "" },
    doktor: ""
});

export const mapExamToFormData = (exam: Muayene, initial: ExaminationFormData): ExaminationFormData => {
    let sq: Record<string, string> = {};
    if (exam.sistem_sorgu && exam.sistem_sorgu.startsWith("{")) {
        try { sq = JSON.parse(exam.sistem_sorgu); } catch { }
    }

    const mapLegacy = (val: string) => {
        if (!val || val === "0") return "";
        if (val === "1") return "Var";
        if (val === "2") return "Bazen";
        return val;
    };

    return {
        ...initial,
        ...exam,
        tarih: exam.tarih ? new Date(exam.tarih) : undefined,
        disuri: exam.disuri || "Seçiniz...",
        hematuri: exam.hematuri || "Seçiniz...",
        genital_akinti: exam.genital_akinti || "Seçiniz...",
        kabizlik: exam.kabizlik || "Seçiniz...",
        tas_oyku: exam.tas_oyku || "Seçiniz...",
        ates_sq: exam.ates || "Seçiniz...",
        catallanma: exam.catallanma || "Seçiniz...",
        projeksiyon_azalma_sq: sq.projeksiyonAzalmaSQ || (exam.projeksiyon_azalma && exam.projeksiyon_azalma !== "0" ? mapLegacy(exam.projeksiyon_azalma) : "Seçiniz..."),
        kalibre_incelme: exam.kalibre_incelme || "Seçiniz...",
        terminal_damlama: exam.terminal_damlama || "Seçiniz...",
        inkontinans: exam.inkontinans || "Seçiniz...",
        erektil_islev: sq.erektil_islev || exam.erektil_islev || "Seçiniz...",
        ejakulasyon: sq.ejakulasyon || exam.ejakulasyon || "Seçiniz...",

        sigara: (() => {
            const val = sq.sigara || (exam.aliskanliklar || "").match(/Sigara: (.*?)(;|$)/)?.[1]?.trim() || "";
            return val === "-" ? "" : val;
        })(),
        alkol: (() => {
            const val = sq.alkol || (exam.aliskanliklar || "").match(/Alkol: (.*?)(;|$)/)?.[1]?.trim() || "";
            return val === "-" ? "" : val;
        })(),
        sosyal: (() => {
            const val = sq.sosyal || (exam.aliskanliklar || "").match(/Sosyal: (.*?)(;|$)/)?.[1]?.trim() || "";
            return val === "-" ? "" : val;
        })(),

        pollakiuri_text: sq.pollakiuriText || (exam.pollakiuri && exam.pollakiuri !== "0" ? mapLegacy(exam.pollakiuri) : ""),
        nokturi_text: sq.nokturiText || (exam.nokturi && exam.nokturi !== "0" ? mapLegacy(exam.nokturi) : ""),
        residu_hissi_text: sq.residuHissiText || (exam.residiv_hissi && exam.residiv_hissi !== "0" ? mapLegacy(exam.residiv_hissi) : ""),
        idrar_bas_zorluk_text: sq.idrarBasZorlukText || (exam.idrar_bas_zorluk && exam.idrar_bas_zorluk !== "0" ? mapLegacy(exam.idrar_bas_zorluk) : ""),
        kesik_idrar_yapma_text: sq.kesikIdrarYapmaText || (exam.kesik_idrar_yapma && exam.kesik_idrar_yapma !== "0" ? mapLegacy(exam.kesik_idrar_yapma) : ""),

        tani1: exam.tani1 || (exam.tani ? exam.tani.split(" | ")[0] : "") || "",
        tani1_kodu: exam.tani1_kodu || "",
        tani2: exam.tani2 || (exam.tani ? exam.tani.split(" | ")[1] : "") || "",
        tani2_kodu: exam.tani2_kodu || "",

        doktor: exam.doktor || "",
    };
};

export const buildExaminationPayload = (
    formData: ExaminationFormData,
    patientId: string,
    ipssTotal: number,
    iiefTotal: number,
    iiefAnswers: Record<string, string>
) => {
    const fullDiagnosis = [formData.tani1, formData.tani2, formData.tani3, formData.tani4, formData.tani5].filter(Boolean).join(" | ");

    const systemQueryJSON = JSON.stringify({
        erektil_islev: formData.erektil_islev,
        ejakulasyon: formData.ejakulasyon,
        projeksiyonAzalmaSQ: formData.projeksiyon_azalma_sq,
        sigara: formData.sigara,
        alkol: formData.alkol,
        sosyal: formData.sosyal,
        pollakiuriText: formData.pollakiuri_text,
        nokturiText: formData.nokturi_text,
        residuHissiText: formData.residu_hissi_text,
        idrarBasZorlukText: formData.idrar_bas_zorluk_text,
        kesikIdrarYapmaText: formData.kesik_idrar_yapma_text
    });

    return {
        hasta_id: patientId,
        tarih: formData.tarih ? (formData.tarih instanceof Date ? formData.tarih.toISOString().split('T')[0] : String(formData.tarih)) : undefined,
        sikayet: formData.sikayet, oyku: formData.oyku, doktor: formData.doktor,
        disuri: formData.disuri !== "Seçiniz..." ? formData.disuri : undefined,
        hematuri: formData.hematuri !== "Seçiniz..." ? formData.hematuri : undefined,
        genital_akinti: formData.genital_akinti !== "Seçiniz..." ? formData.genital_akinti : undefined,
        kabizlik: formData.kabizlik !== "Seçiniz..." ? formData.kabizlik : undefined,
        tas_oyku: formData.tas_oyku !== "Seçiniz..." ? formData.tas_oyku : undefined,
        ates: formData.ates_sq !== "Seçiniz..." ? formData.ates_sq : undefined,
        catallanma: formData.catallanma !== "Seçiniz..." ? formData.catallanma : undefined,
        kalibre_incelme: formData.kalibre_incelme !== "Seçiniz..." ? formData.kalibre_incelme : undefined,
        terminal_damlama: formData.terminal_damlama !== "Seçiniz..." ? formData.terminal_damlama : undefined,
        inkontinans: formData.inkontinans !== "Seçiniz..." ? formData.inkontinans : undefined,
        sistem_sorgu: systemQueryJSON,
        ipss_skor: ipssTotal.toString(),
        residiv_hissi: formData.residiv_hissi,
        pollakiuri: formData.pollakiuri,
        kesik_idrar_yapma: formData.kesik_idrar_yapma,
        projeksiyon_azalma: formData.projeksiyon_azalma,
        idrar_bas_zorluk: formData.idrar_bas_zorluk,
        nokturi: formData.nokturi,
        iief_ef_skor: iiefTotal.toString(),
        iief_ef_answers: JSON.stringify(iiefAnswers),
        ozgecmis: formData.ozgecmis,
        soygecmis: formData.soygecmis,
        kullandigi_ilaclar: formData.kullandigi_ilaclar,
        fizik_muayene: formData.fizik_muayene,
        bulgu_notu: formData.bulgu_notu,
        rektal_tuse: formData.rektal_tuse,
        tansiyon: formData.tansiyon, ates_vital: formData.ates,
        kvah: formData.kvah, bobrek_sag: formData.bobrek_sag, bobrek_sol: formData.bobrek_sol,
        suprapubik_kitle: formData.suprapubik_kitle, ego: formData.ego,
        tani: fullDiagnosis,
        tani1: formData.tani1, tani1_kodu: formData.tani1_kodu,
        tani2: formData.tani2, tani2_kodu: formData.tani2_kodu,
        tani3: formData.tani3, tani3_kodu: formData.tani3_kodu,
        tani4: formData.tani4, tani4_kodu: formData.tani4_kodu,
        tani5: formData.tani5, tani5_kodu: formData.tani5_kodu,
        oneriler: formData.oneriler,
        sonuc: formData.sonuc,
        aliskanliklar: `Sigara: ${formData.sigara || ""}; Alkol: ${formData.alkol || ""}; Sosyal: ${formData.sosyal || ""}`,
        tedavi: formData.tedavi, recete: formData.recete,
        erektil_islev: formData.erektil_islev, ejakulasyon: formData.ejakulasyon,
        mshq: formData.mshq,
        prosedur: formData.prosedur,
        allerjiler: formData.allerjiler, kan_sulandirici: formData.kan_sulandirici
    };
};
