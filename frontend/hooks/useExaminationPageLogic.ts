import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { api, Muayene, Patient } from "@/lib/api";
import { usePatientStore } from "@/stores/patient-store";
import { useSystemDefinitions } from "./useSystemDefinitions";
import { parseUroflow } from "@/components/examination/forms/physical-exam";

// Modüler Alt Modüller
import {
    ExaminationFormData,
    createInitialFormState,
    mapExamToFormData,
    buildExaminationPayload
} from "./examination/useExaminationFormData";
import { useExaminationAIScribe } from "./examination/useExaminationAIScribe";

export type { ExaminationFormData };

export const useExaminationPageLogic = (patientId: string) => {
    const queryClient = useQueryClient();
    const [patient, setPatient] = useState<Patient | null>(null);
    const { activePatient, setActivePatient } = usePatientStore();
    const [pastExaminations, setPastExaminations] = useState<Muayene[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSavedData, setLastSavedData] = useState<string>("");
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    // Track last synced uroflow text to prevent duplicate lab entries during autosave
    const lastSyncedUroflowRef = useRef<string>("");

    // Secondary UI States (Dialogs & Popovers)
    const [isPEFormOpen, setIsPEFormOpen] = useState(false);
    const [isEDCFormOpen, setIsEDCFormOpen] = useState(false);
    const [isEDDrugsOpen, setIsEDDrugsOpen] = useState(false);
    const [prescriptionPopoverOpen, setPrescriptionPopoverOpen] = useState(false);
    const [appointmentNote, setAppointmentNote] = useState<string | null>(null);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [ipssDialogOpen, setIpssDialogOpen] = useState(false);
    const [iiefDialogOpen, setIiefDialogOpen] = useState(false);
    const [mshqDialogOpen, setMshqDialogOpen] = useState(false);

    // Systems definitions
    const definitions = useSystemDefinitions();

    // Questionnaire Answers
    const [iiefAnswers, setIiefAnswers] = useState<Record<string, string>>({
        q1: "", q2: "", q3: "", q4: "", q5: "", q6: ""
    });

    const initialFormState: ExaminationFormData = useMemo(
        () => createInitialFormState(patientId),
        [patientId]
    );

    const [formData, setFormData] = useState<ExaminationFormData>(initialFormState);

    // AI Scribe Entegrasyonu
    useExaminationAIScribe({ setFormData });

    // Derived Scores
    const ipssTotal = useMemo(() => {
        return [
            formData.residiv_hissi,
            formData.pollakiuri,
            formData.kesik_idrar_yapma,
            formData.urgency,
            formData.projeksiyon_azalma,
            formData.idrar_bas_zorluk,
            formData.nokturi
        ].reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);
    }, [formData]);

    const iiefTotal = useMemo(() => {
        return [
            iiefAnswers.q1, iiefAnswers.q2, iiefAnswers.q3,
            iiefAnswers.q4, iiefAnswers.q5, iiefAnswers.q6
        ].reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);
    }, [iiefAnswers]);

    const resetForm = useCallback(() => {
        setFormData(createInitialFormState(patientId));
        setIiefAnswers({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
        setSelectedExamId(null);
        setIsEditing(true);
    }, [patientId]);

    const handleSelectExamination = useCallback((exam: Muayene) => {
        setIsCreatingNew(false);
        setSelectedExamId(exam.id);
        setIsEditing(false);

        setFormData(mapExamToFormData(exam, initialFormState));

        if (exam.iief_ef_answers) {
            try {
                setIiefAnswers(JSON.parse(exam.iief_ef_answers));
            } catch {
                setIiefAnswers({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
            }
        } else {
            setIiefAnswers({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
        }
    }, [initialFormState]);

    // Initial Selection Effect
    useEffect(() => {
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
                } catch (err) {
                    console.error("Failed to load appointments", err);
                }

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
    }, [patientId, setActivePatient, resetForm]);

    // Handlers
    const handleNewExamination = useCallback(async () => {
        setIsCreatingNew(true);
        resetForm();
        setIsEditing(true);

        if (pastExaminations.length > 0) {
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
    }, [pastExaminations, resetForm]);

    const handleSave = async (silent = false) => {
        if (!patientId || !formData.tarih) {
            if (!silent) toast.error("Lütfen tarih seçiniz.");
            return;
        }

        const payload = buildExaminationPayload(formData, patientId, ipssTotal, iiefTotal, iiefAnswers);

        try {
            if (selectedExamId) {
                await api.clinical.updateMuayene(selectedExamId, payload);
                if (!silent) toast.success("Muayene güncellendi.");
            } else {
                const res = await api.clinical.createMuayene(payload);
                setSelectedExamId(res.id);
                setIsCreatingNew(false);
                if (!silent) toast.success("Muayene kaydedildi.");
            }

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

            queryClient.invalidateQueries({ queryKey: ['muayeneler', patientId] });
            queryClient.invalidateQueries({ queryKey: ['patient-bootstrap', patientId] });
            queryClient.invalidateQueries({ queryKey: ['patient-timeline', patientId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

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
            queryClient.invalidateQueries({ queryKey: ['muayeneler', patientId] });
            queryClient.invalidateQueries({ queryKey: ['patient-bootstrap', patientId] });
            queryClient.invalidateQueries({ queryKey: ['patient-timeline', patientId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            if (selectedExamId === examToDelete) handleNewExamination();
        } catch {
            toast.error("Silme başarısız.");
        }
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
            handleDeleteExamination: (e: React.MouseEvent, id: string) => {
                e.stopPropagation();
                setExamToDelete(id);
                setDeleteDialogOpen(true);
            },
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
