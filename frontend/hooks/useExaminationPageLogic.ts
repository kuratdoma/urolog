import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { api, Muayene, Patient } from "@/lib/api";
import { usePatientStore } from "@/stores/patient-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useAuthStore } from "@/stores/auth-store";
import { useAIScribeStore } from "@/stores/ai-scribe-store";
import { useSystemDefinitions } from "./useSystemDefinitions";
import { parseUroflow } from "@/components/examination/forms/physical-exam";

// Form Data Interface
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
    mshq_answers?: Record<string, string>;
    doktor: string;
    [key: string]: unknown;
}

export const useExaminationPageLogic = (patientId: string) => {
    const router = useRouter();
    const { setActivePatient, activePatient } = usePatientStore();


    // Core State
    const [patient, setPatient] = useState<Patient | null>(null);
    const [pastExaminations, setPastExaminations] = useState<Muayene[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    // UF/PVR -> Lab > Uroflowmetri geçmişine senkronize edilen son metin
    // (autosave'de her seferinde tekrar kayıt oluşturmamak için).
    const lastSyncedUroflowRef = useRef<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSavedData, setLastSavedData] = useState<string>("");
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    // Appointment Note
    const [appointmentNote, setAppointmentNote] = useState<string | null>(null);
    const [isNoteOpen, setIsNoteOpen] = useState(false);

    // Dialogs
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);
    const [isPEFormOpen, setIsPEFormOpen] = useState(false);
    const [isEDCFormOpen, setIsEDCFormOpen] = useState(false);
    const [isEDDrugsOpen, setIsEDDrugsOpen] = useState(false);
    const [prescriptionPopoverOpen, setPrescriptionPopoverOpen] = useState(false);

    // IPSS/IIEF Toggles
    const [ipssDialogOpen, setIpssDialogOpen] = useState(false);
    const [iiefDialogOpen, setIiefDialogOpen] = useState(false);
    const [mshqDialogOpen, setMshqDialogOpen] = useState(false);
    const [iiefAnswers, setIiefAnswers] = useState<Record<string, string>>({
        q1: "", q2: "", q3: "", q4: "", q5: "", q6: ""
    });

    // Interface moved outside


    const initialFormState: ExaminationFormData = useMemo(() => ({
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
    }), [patientId]);

    const [formData, setFormData] = useState<ExaminationFormData>(initialFormState);

    // Derived Scores
    const ipssTotal = useMemo(() => {
        const sum = [
            formData.residiv_hissi,
            formData.pollakiuri,
            formData.kesik_idrar_yapma,
            formData.urgency,
            formData.projeksiyon_azalma,
            formData.idrar_bas_zorluk,
            formData.nokturi
        ].reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);
        return sum;
    }, [formData]);

    const iiefTotal = useMemo(() => {
        const sum = [
            iiefAnswers.q1, iiefAnswers.q2, iiefAnswers.q3,
            iiefAnswers.q4, iiefAnswers.q5, iiefAnswers.q6
        ].reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);
        return sum;
    }, [iiefAnswers]);

    // System Definitions
    const handleDoctorFound = (docName: string) => {
        if (formData.doktor === "") {
            setFormData((prev: any) => ({ ...prev, doktor: docName }));
        }
    };

    const definitions = useSystemDefinitions(formData.doktor, handleDoctorFound);

    // Reset Form Helper
    const resetForm = useCallback(() => {
        const currentUser = useAuthStore.getState().user;
        const fullName = currentUser?.full_name;
        const matchedDoc = definitions.doctors.find(d => d.toLowerCase().includes(fullName?.toLowerCase() || ''));
        const defaultDoctor = matchedDoc || (definitions.doctors.length > 0 ? definitions.doctors[0] : "");

        setSelectedExamId(null);
        setIsEditing(true);
        lastSyncedUroflowRef.current = "";
        setFormData({
            ...initialFormState,
            doktor: defaultDoctor,
            tarih: new Date()
        });
        setIiefAnswers({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
    }, [definitions.doctors]);

    const handleSelectExamination = useCallback((exam: Muayene) => {
        setSelectedExamId(exam.id);
        setIsEditing(false);
        lastSyncedUroflowRef.current = (exam as any).bulgu_notu || "";

        let sq: Record<string, string> = {};
        if (exam.sistem_sorgu && exam.sistem_sorgu.startsWith("{")) {
            try { sq = JSON.parse(exam.sistem_sorgu); } catch (e) { console.error(e); }
        }

        const mapLegacy = (val: string | undefined) => {
            if (!val) return "";
            if (val === "0" || val === "false") return "Yok";
            if (val === "1" || val === "true") return "Var";
            if (!isNaN(parseInt(val)) && parseInt(val) > 0) return "Var";
            return val;
        };

        setFormData({
            ...initialFormState,
            ...exam,
            hasta_id: exam.hasta_id,
            tarih: exam.tarih ? parseISO(exam.tarih) : undefined,
            disuri: exam.disuri || "Seçiniz...",
            hematuri: exam.hematuri || "Seçiniz...",
            genital_akinti: exam.genital_akinti || "Seçiniz...",
            kabizlik: exam.kabizlik || "Seçiniz...",
            tas_oyku: exam.tas_oyku || "Seçiniz...",
            ates_sq: exam.ates || "Seçiniz...",
            catallanma: exam.catallanma || "Seçiniz...",
            kalibre_incelme: exam.kalibre_incelme || "Seçiniz...",
            terminal_damlama: exam.terminal_damlama || "Seçiniz...",
            inkontinans: exam.inkontinans || "Seçiniz...",
            erektil_islev: exam.erektil_islev || sq.erektil_islev || "Seçiniz...",
            ejakulasyon: exam.ejakulasyon || sq.ejakulasyon || "Seçiniz...",

            residiv_hissi: exam.residiv_hissi || "0",
            pollakiuri: exam.pollakiuri || "0",
            kesik_idrar_yapma: exam.kesik_idrar_yapma || "0",
            urgency: exam.inkontinans || "0",
            projeksiyon_azalma: exam.projeksiyon_azalma || "0",
            idrar_bas_zorluk: exam.idrar_bas_zorluk || "0",
            nokturi: exam.nokturi || "0",

            projeksiyon_azalma_sq: sq.projeksiyonAzalmaSQ || (exam.projeksiyon_azalma && exam.projeksiyon_azalma !== "0" ? mapLegacy(exam.projeksiyon_azalma) : ""),
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
        });

        if (exam.iief_ef_answers) {
            try { setIiefAnswers(JSON.parse(exam.iief_ef_answers)); } catch { setIiefAnswers({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" }); }
        } else {
            setIiefAnswers({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
        }
    }, [initialFormState]);

    // Initial Selection Effect
    useEffect(() => {
        // Skip auto-selection when explicitly creating a new examination
        if (isCreatingNew) return;

        if (pastExaminations.length > 0 && selectedExamId === null) {
            handleSelectExamination(pastExaminations[0]);
        } else if (pastExaminations.length === 0) {
            setIsEditing(true);
        }
    }, [pastExaminations, selectedExamId, handleSelectExamination, isCreatingNew]);

    // Core Data Loading
    useEffect(() => {
        const loadData = async (retries = 2) => {
            if (!patientId) return;

            try {
                const patientData = await api.patients.get(patientId);
                setPatient(patientData);

                if (activePatient?.id !== patientData.id) {
                    setActivePatient({
                        id: patientData.id,
                        ad: patientData.ad,
                        soyad: patientData.soyad,
                        tc_kimlik: patientData.tc_kimlik,
                        dogum_tarihi: patientData.dogum_tarihi,
                        protokol_no: patientData.protokol_no,
                        cinsiyet: patientData.cinsiyet,
                    });
                }

                const exams = await api.clinical.getMuayeneler(patientId);
                exams.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
                setPastExaminations(exams);

                if (exams.length === 0) {
                    resetForm();
                }

                try {
                    const appointments = await api.appointments.getForPatient(patientId);
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    const todaysApp = appointments.find(app =>
                        app.start && app.start.startsWith(todayStr) &&
                        app.notes && app.notes.trim().length > 0
                    );
                    if (todaysApp && todaysApp.notes) {
                        setAppointmentNote(todaysApp.notes);
                        setIsNoteOpen(true);
                    }
                } catch (err) { console.error("Failed to load appointments", err); }

            } catch (error) {
                console.error("Failed to load data", error);
                if (retries > 0) {
                    setTimeout(() => loadData(retries - 1), 2000);
                } else {
                    toast.error("Veriler yüklenirken bir hata oluştu.");
                }
            }
        };
        loadData();
    }, [patientId, setActivePatient]);


    // AI Scribe
    const { latestResult, setLatestResult } = useAIScribeStore();
    useEffect(() => {
        if (latestResult) {
            setFormData((prev: any) => {
                const newData = { ...prev };
                
                // 1. Şikayet ve Öykü - Mevcut veriye append et
                if (latestResult.sikayet) newData.sikayet = prev.sikayet ? `${prev.sikayet}\n\n[AI]: ${latestResult.sikayet}` : latestResult.sikayet;
                if (latestResult.oyku) newData.oyku = prev.oyku ? `${prev.oyku}\n\n[AI]: ${latestResult.oyku}` : latestResult.oyku;

                // 2. Sistemlerin Sorgusu - Semptom alanlarını doldur
                // updateIfEmpty: Sadece boşsa veya "Seçiniz..." ise güncelle
                const updateIfEmpty = (field: string, value: string | undefined) => {
                    if (value && (prev[field] === "Seçiniz..." || prev[field] === "" || prev[field] === "0")) {
                        (newData as Record<string, unknown>)[field] = value;
                    }
                };

                // Semptom eşleştirmeleri (VAR/YOK/BAZEN → form butonlarına)
                // AI "VAR" döndürdüğünde form butonu "Var" olarak set edilmeli
                const normalizeSymptom = (val: string | undefined): string | undefined => {
                    if (!val) return undefined;
                    const upper = val.toUpperCase().trim();
                    if (upper === "VAR" || upper === "MEVCUT" || upper === "EVET") return "Var";
                    if (upper === "YOK" || upper === "HAYIR") return "Yok";
                    if (upper === "BAZEN" || upper === "ARA SIRA") return "Bazen";
                    // Özel genital akıntı değerleri
                    if (["SARI", "YEŞİL", "HEMORAJİ", "ŞEFFAF"].includes(upper)) return val;
                    // Özel inkontinans değerleri
                    if (["URGE", "STRES", "MİKST", "ENÜREZİS NOKTURNA"].includes(upper)) return val;
                    return val; // Bilinmeyen değerleri olduğu gibi geçir
                };

                updateIfEmpty('disuri', normalizeSymptom(latestResult.disuri));
                updateIfEmpty('pollakiuri_text', normalizeSymptom(latestResult.pollakiuri));
                updateIfEmpty('nokturi_text', normalizeSymptom(latestResult.nokturi));
                updateIfEmpty('hematuri', normalizeSymptom(latestResult.hematuri));
                updateIfEmpty('genital_akinti', normalizeSymptom(latestResult.genital_akinti));
                updateIfEmpty('kabizlik', normalizeSymptom(latestResult.kabizlik));
                updateIfEmpty('tas_oyku', normalizeSymptom(latestResult.tas_oyku));
                updateIfEmpty('catallanma', normalizeSymptom(latestResult.catallanma));
                updateIfEmpty('projeksiyon_azalma_sq', normalizeSymptom(latestResult.projeksiyon_azalma));
                updateIfEmpty('kalibre_incelme', normalizeSymptom(latestResult.kalibre_incelme));
                updateIfEmpty('idrar_bas_zorluk_text', normalizeSymptom(latestResult.idrar_bas_zorluk));
                updateIfEmpty('kesik_idrar_yapma_text', normalizeSymptom(latestResult.kesik_idrar_yapma));
                updateIfEmpty('terminal_damlama', normalizeSymptom(latestResult.terminal_damlama));
                updateIfEmpty('residu_hissi_text', normalizeSymptom(latestResult.residiv_hissi));
                updateIfEmpty('inkontinans', normalizeSymptom(latestResult.inkontinans));
                updateIfEmpty('erektil_islev', normalizeSymptom(latestResult.erektil_islev));
                updateIfEmpty('ejakulasyon', latestResult.ejakulasyon); // Ejakülasyon özel değerler alabilir, normalize etme

                // 3. Özgeçmiş - Hastalıklar/Ameliyatlar (alt alta format)
                if (latestResult.ozgecmis) {
                    newData.ozgecmis = prev.ozgecmis 
                        ? `${prev.ozgecmis}\n${latestResult.ozgecmis}`.trim()
                        : latestResult.ozgecmis;
                }

                // 4. Soygeçmiş / Aile Hikayesi (alt alta format)
                if (latestResult.soygecmis) {
                    newData.soygecmis = prev.soygecmis 
                        ? `${prev.soygecmis}\n${latestResult.soygecmis}`.trim()
                        : latestResult.soygecmis;
                }

                // 5. İlaçlar (alt alta format)
                if (latestResult.kullandigi_ilaclar) {
                    newData.kullandigi_ilaclar = prev.kullandigi_ilaclar 
                        ? `${prev.kullandigi_ilaclar}\n${latestResult.kullandigi_ilaclar}`.trim()
                        : latestResult.kullandigi_ilaclar;
                }

                // 6. Alerjiler (alt alta format)
                if (latestResult.allerjiler && latestResult.allerjiler.toUpperCase() !== "YOK") {
                    newData.allerjiler = prev.allerjiler 
                        ? `${prev.allerjiler}\n${latestResult.allerjiler}`.trim()
                        : latestResult.allerjiler;
                }

                // 7. Sigara ve Alkol alışkanlıkları
                if (latestResult.sigara && !prev.sigara) {
                    newData.sigara = latestResult.sigara;
                }
                if (latestResult.alkol && !prev.alkol) {
                    newData.alkol = latestResult.alkol;
                }
                // Fallback: Eğer AI sigara/alkol ayrı göndermemişse aliskanliklar'dan parse et
                if (!latestResult.sigara && !latestResult.alkol && latestResult.aliskanliklar) {
                    const alisTxt = latestResult.aliskanliklar;
                    const sigaraMatch = alisTxt.match(/[Ss]igara[:\s]*(.*?)(?:;|$)/);
                    const alkolMatch = alisTxt.match(/[Aa]lkol[:\s]*(.*?)(?:;|$)/);
                    if (sigaraMatch && !prev.sigara) newData.sigara = sigaraMatch[1].trim();
                    if (alkolMatch && !prev.alkol) newData.alkol = alkolMatch[1].trim();
                }

                // 8. Tanılar ve ICD kodları
                updateIfEmpty('tani1', latestResult.tani1);
                if (latestResult.tani1_icd && !prev.tani1_kodu) {
                    newData.tani1_kodu = latestResult.tani1_icd;
                }
                updateIfEmpty('tani2', latestResult.tani2);
                if (latestResult.tani2_icd && !prev.tani2_kodu) {
                    newData.tani2_kodu = latestResult.tani2_icd;
                }
                updateIfEmpty('tani3', latestResult.tani3);
                if (latestResult.tani3_icd && !prev.tani3_kodu) {
                    newData.tani3_kodu = latestResult.tani3_icd;
                }

                // 9. Tedavi
                updateIfEmpty('tedavi', latestResult.tedavi);

                // 10. Öneriler - Doktorun söylediği önerileri al
                if (latestResult.oneriler) {
                    newData.oneriler = prev.oneriler
                        ? `${prev.oneriler}\n${latestResult.oneriler}`.trim()
                        : latestResult.oneriler;
                }

                // 11. Kan sulandırıcı
                if (latestResult.kan_sulandirici === 1 && prev.kan_sulandirici !== 1) {
                    newData.kan_sulandirici = 1;
                }

                return newData;
            });
            toast.success("C3PO verileri dolduruldu.");
            setLatestResult(null);
        }
    }, [latestResult, setLatestResult]);

    // Handlers
    const handleNewExamination = async () => {
        setIsCreatingNew(true);
        resetForm();
        setIsEditing(true);

        if (pastExaminations.length > 0) {
            // Helper to find latest non-empty value for a field
            const findLatest = (getter: (exam: Muayene) => any) => {
                for (const exam of pastExaminations) {
                    const val = getter(exam);
                    if (val && val !== "" && val !== "0" && val !== 0) return val;
                }
                return "";
            };

            const latestKanSulandirici = pastExaminations.find(e => e.kan_sulandirici === 1)?.kan_sulandirici || 0;

            setFormData((prev: any) => ({
                ...prev,
                ozgecmis: findLatest(e => e.ozgecmis) || "",
                soygecmis: findLatest(e => e.soygecmis) || "",
                kullandigi_ilaclar: "",
                allerjiler: findLatest(e => e.allerjiler) || "",
                kan_sulandirici: latestKanSulandirici,

                sigara: (() => {
                    const val = findLatest(e => {
                        let sq: Record<string, string> = {};
                        if (e.sistem_sorgu && e.sistem_sorgu.startsWith("{")) {
                            try { sq = JSON.parse(e.sistem_sorgu); } catch { }
                        }
                        return sq?.sigara || (e.aliskanliklar || "").match(/Sigara: (.*?)(;|$)/)?.[1]?.trim();
                    }) || "";
                    return val === "-" ? "" : val;
                })(),

                alkol: (() => {
                    const val = findLatest(e => {
                        let sq: Record<string, string> = {};
                        if (e.sistem_sorgu && e.sistem_sorgu.startsWith("{")) {
                            try { sq = JSON.parse(e.sistem_sorgu); } catch { }
                        }
                        return sq?.alkol || (e.aliskanliklar || "").match(/Alkol: (.*?)(;|$)/)?.[1]?.trim();
                    }) || "";
                    return val === "-" ? "" : val;
                })(),

                sosyal: (() => {
                    const val = findLatest(e => {
                        let sq: Record<string, string> = {};
                        if (e.sistem_sorgu && e.sistem_sorgu.startsWith("{")) {
                            try { sq = JSON.parse(e.sistem_sorgu); } catch { }
                        }
                        return sq?.sosyal || (e.aliskanliklar || "").match(/Sosyal: (.*?)(;|$)/)?.[1]?.trim();
                    }) || "";
                    return val === "-" ? "" : val;
                })(),
            }));
            toast.info("Son muayene verileri otomatik aktarıldı.");
        } else {
            toast.info("Yeni muayene formu açıldı.");
        }
    };



    const handleSave = async (silent = false) => {
        if (!patientId || !formData.tarih) {
            if (!silent) toast.error("Lütfen tarih seçiniz.");
            return;
        }

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

        const payload: any = {
            hasta_id: patientId,
            tarih: format(formData.tarih, 'yyyy-MM-dd'),
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

        try {
            if (selectedExamId) {
                await api.clinical.updateMuayene(selectedExamId, payload);
                // Silent parameter respected here - no toast if silent is true
                if (!silent) toast.success("Muayene güncellendi.");
            } else {
                const res = await api.clinical.createMuayene(payload);
                setSelectedExamId(res.id);
                setIsCreatingNew(false);
                // Silent parameter respected here - no toast if silent is true
                if (!silent) toast.success("Muayene kaydedildi.");
            }

            // UF/PVR (Muayene.bulgu_notu) -> Lab > Uroflowmetri geçmişine
            // senkronize et. Autosave her 5sn'de tetiklendiği için, sadece
            // metin gerçekten değiştiğinde yeni bir lab kaydı oluştur.
            const uroflowText = formData.bulgu_notu || "";
            if (uroflowText !== lastSyncedUroflowRef.current) {
                const seg = parseUroflow(uroflowText);
                if (seg.qmax || seg.qav || seg.vol || seg.pvr) {
                    try {
                        await api.clinical.createUroflowmetri({
                            hasta_id: patientId,
                            tarih: payload.tarih,
                            qmax: seg.qmax ? Number(seg.qmax) : undefined,
                            average_flow: seg.qav ? Number(seg.qav) : undefined,
                            volume: seg.vol ? Number(seg.vol) : undefined,
                            residual_urine: seg.pvr ? Number(seg.pvr) : undefined,
                        } as any);
                    } catch (e) {
                        console.error("Uroflowmetri lab senkronizasyonu başarısız:", e);
                    }
                }
                lastSyncedUroflowRef.current = uroflowText;
            }

            const exams = await api.clinical.getMuayeneler(patientId);
            exams.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setPastExaminations(exams);

            const currentData = JSON.stringify({ ...formData, tarih: formData.tarih ? format(formData.tarih, 'yyyy-MM-dd') : null });
            setLastSavedData(currentData);
            if (!silent) setIsEditing(false);
        } catch (e) {
            console.error(e);
            if (!silent) toast.error("İşlem başarısız.");
            throw e;
        }
    };

    // Auto Save
    useEffect(() => {
        if (!isEditing) return;
        const timer = setTimeout(() => {
            const currentData = JSON.stringify({ ...formData, tarih: formData.tarih ? format(formData.tarih, 'yyyy-MM-dd') : null });
            if (currentData !== lastSavedData && patientId && formData.tarih) {
                if (selectedExamId || (formData.sikayet.length > 3 || formData.oyku.length > 5)) {
                    setIsAutoSaving(true);
                    handleSave(true).finally(() => setIsAutoSaving(false));
                }
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [formData, isEditing, lastSavedData, patientId, selectedExamId]);

    const confirmDelete = async () => {
        if (!examToDelete) return;
        try {
            await api.clinical.deleteMuayene(examToDelete);
            toast.success("Muayene silindi.");
            setDeleteDialogOpen(false);
            const exams = await api.clinical.getMuayeneler(patientId);
            exams.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setPastExaminations(exams);
            if (selectedExamId === examToDelete) handleNewExamination();
        } catch (e) { toast.error("Silme başarısız."); }
    };

    return {
        patient,
        pastExaminations,
        selectedExamId,
        isEditing, setIsEditing,
        formData, setFormData,
        definitions,
        ipssTotal, iiefTotal,
        iiefAnswers, setIiefAnswers,
        isAutoSaving,
        handlers: {
            handleNewExamination,
            handleSelectExamination,
            handleSave,
            handleDeleteExamination: (e: React.MouseEvent, id: string) => { e.stopPropagation(); setExamToDelete(id); setDeleteDialogOpen(true); },
            confirmDelete
        },
        dialogs: {
            deleteDialogOpen, setDeleteDialogOpen,
            isPEFormOpen, setIsPEFormOpen,
            isEDCFormOpen, setIsEDCFormOpen,
            isEDDrugsOpen, setIsEDDrugsOpen,
            prescriptionPopoverOpen, setPrescriptionPopoverOpen,
            appointmentNote, isNoteOpen, setIsNoteOpen,
            ipssDialogOpen, setIpssDialogOpen,
            iiefDialogOpen, setIiefDialogOpen,
            mshqDialogOpen, setMshqDialogOpen
        }
    };
};
