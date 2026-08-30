"use client";

import React, { useMemo, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSettingsStore } from "@/stores/settings-store";
import { Activity, MessageCircle, ClipboardList, History, Eye, Pill, FileText, Asterisk, Dna, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DebouncedTextarea } from "@/components/examination/shared/DebouncedText";
import { toast } from "sonner";
import { systemQueryAdapter, SystemQueryForm } from "@/components/examination/forms/system-query";
import { medicalHistoryAdapter, PastHistorySection, MedicalHistorySection } from "@/components/examination/forms/medical-history";
import { diagnosisAdapter, DiagnosisForm } from "@/components/examination/forms/diagnosis";
import { physicalExamAdapter, PhysicalExamForm } from "@/components/examination/forms/physical-exam";
import { PastExaminationsSidebar } from "@/components/examination/sidebar/PastExaminationsSidebar";
import { useExaminationPageLogic, ExaminationFormData } from "@/hooks/useExaminationPageLogic";
import { PatientHeader } from "@/components/clinical/patient-header";
import { ExaminationToolbar } from "@/components/examination/ExaminationToolbar";
import { ExaminationDialogs } from "@/components/examination/ExaminationDialogs";
import { usePEDTForm } from "@/components/examination/forms/pedt";
import { usePEClinicalForm } from "@/components/examination/forms/pe-clinical";
import { useIIEFExport } from "@/hooks/useIIEFExport";
import { QuestionnaireScoreCard } from "@/components/examination/shared/QuestionnaireScoreCard";
import { ClinicalCard } from "@/components/clinical/ClinicalCard";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { HPVBriefingPanel } from "@/components/clinical/HPVBriefingPanel";
import { Muayene } from "@/lib/api";

const HPV_KEYWORDS = ['kondilom', 'hpv', 'siğil', 'sigil', 'condyloma', 'b07', 'a63'];

export default function ExaminationPage() {
    const params = useParams();
    const patientId = String(params.id);
    const { examinationModules, aiHpvBriefingEnabled } = useSettingsStore();

    // AI HPV Briefing background states & query
    const [hpvBriefingShouldFetch, setHpvBriefingShouldFetch] = useState(false);

    const { 
        data: hpvBriefing, 
        isLoading: hpvBriefingLoading, 
        isError: hpvBriefingError, 
        error: hpvBriefingErrorObj, 
        refetch: refetchHpvBriefing 
    } = useQuery({
        queryKey: ['hpv-briefing', patientId],
        queryFn: () => api.hpvBriefing.generate(patientId),
        enabled: aiHpvBriefingEnabled && hpvBriefingShouldFetch,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const handleHpvBriefingGenerate = () => {
        setHpvBriefingShouldFetch(true);
        if (hpvBriefing) {
            refetchHpvBriefing();
        }
    };

    // --- Logic Hook ---
    const {
        patient,
        pastExaminations,
        selectedExamId,
        isEditing, setIsEditing,
        formData, setFormData,
        definitions,
        ipssTotal, iiefTotal,
        iiefAnswers, setIiefAnswers,
        handlers,
        dialogs
    } = useExaminationPageLogic(patientId);



    // --- IPSS Display Helpers ---
    const ipssObstructive = useMemo(() => {
        return (parseInt(formData.residiv_hissi) || 0) + (parseInt(formData.kesik_idrar_yapma) || 0) + (parseInt(formData.projeksiyon_azalma) || 0) + (parseInt(formData.idrar_bas_zorluk) || 0);
    }, [formData.residiv_hissi, formData.kesik_idrar_yapma, formData.projeksiyon_azalma, formData.idrar_bas_zorluk]);

    const ipssIrritative = useMemo(() => {
        return (parseInt(formData.pollakiuri) || 0) + (parseInt(formData.urgency) || 0) + (parseInt(formData.nokturi) || 0);
    }, [formData.pollakiuri, formData.urgency, formData.nokturi]);

    // --- HPV Diagnosis Check ---
    // Geçmiş muayene taraması sadece liste değiştiğinde, güncel form taraması ise
    // sadece ilgili alanlar değiştiğinde çalışır (her tuş vuruşunda değil).
    const hasHPVInPast = useMemo(() => {
        return pastExaminations.some((m: Muayene) => {
            const fields = [m.tani1, m.tani2, m.tani3, m.tani4, m.tani5, m.tani1_kodu, m.tani2_kodu, m.tani3_kodu, m.sikayet, m.tedavi].filter(Boolean);
            return fields.some((f: string) => HPV_KEYWORDS.some(k => f.toLowerCase().includes(k)));
        });
    }, [pastExaminations]);

    const hasHPVInCurrent = useMemo(() => {
        const currentFields = [formData.tani1, formData.tani2, formData.tani3, formData.tani4, formData.tani5, formData.tani1_kodu, formData.tani2_kodu, formData.tani3_kodu, formData.sikayet, formData.tedavi].filter(Boolean);
        return currentFields.some((f: string) => HPV_KEYWORDS.some(k => f.toLowerCase().includes(k)));
    }, [formData.tani1, formData.tani2, formData.tani3, formData.tani4, formData.tani5, formData.tani1_kodu, formData.tani2_kodu, formData.tani3_kodu, formData.sikayet, formData.tedavi]);

    const hasHPV = hasHPVInPast || hasHPVInCurrent;

    // --- Extracted Form Hooks ---
    const appendToStory = useCallback((narrative: string) => {
        setFormData((prev: ExaminationFormData) => ({ ...prev, oyku: prev.oyku + "\n" + narrative.trim() + "\n" }));
        toast.success("Değerlendirme öyküye aktarıldı.");
    }, [setFormData]);

    // PEDT Form Hook
    const pedt = usePEDTForm(appendToStory);

    // PE Clinical Form Hook
    const peClinical = usePEClinicalForm(appendToStory);

    // IIEF Export Hook
    const iiefExport = useIIEFExport(
        iiefAnswers,
        iiefTotal,
        appendToStory,
        () => dialogs.setIiefDialogOpen(false)
    );

    // Wrapper for IIEF export with validation toast
    const handleIIEFExport = useCallback(() => {
        if (!iiefExport.filled) {
            toast.error("IIEF-EF formu doldurulmadı.");
            return;
        }
        iiefExport.handleExport();
    }, [iiefExport]);

    // Wrapper for PEDT export with validation toast
    const handlePEDTExport = useCallback(() => {
        if (!pedt.filled) {
            toast.error("PEDT formu doldurulmadı.");
            return;
        }
        pedt.handleExport();
    }, [pedt]);

    // Wrapper for PE Clinical export with validation toast
    const handlePEFormExport = useCallback(() => {
        if (!peClinical.filled) {
            toast.error("PE Formu doldurulmadı.");
            return;
        }
        peClinical.handleExport();
    }, [peClinical]);

    // --- Stabil onChange handler'ları ---
    // Bu fonksiyonlar her render'da yeniden oluşturulursa memo'lu form bölümleri
    // her tuş vuruşunda yeniden render olur.
    const handleSikayetChange = useCallback((val: string) => {
        setFormData((prev: ExaminationFormData) => ({ ...prev, sikayet: val }));
    }, [setFormData]);

    const handleOykuChange = useCallback((val: string) => {
        setFormData((prev: ExaminationFormData) => ({ ...prev, oyku: val }));
    }, [setFormData]);

    const handleSystemQueryChange = useCallback((newData: any) => {
        setFormData((prev: any) => ({ ...prev, ...systemQueryAdapter.toLegacy(newData) }));
    }, [setFormData]);

    const handleMedicalHistoryChange = useCallback((d: any) => {
        setFormData((prev: any) => ({ ...prev, ...medicalHistoryAdapter.toLegacy(d) }));
    }, [setFormData]);

    const handlePhysicalExamChange = useCallback((d: any) => {
        setFormData((prev: any) => ({ ...prev, ...physicalExamAdapter.toLegacy(d) }));
    }, [setFormData]);

    const handleDiagnosisChange = useCallback((d: any) => {
        setFormData((prev: any) => ({ ...prev, ...diagnosisAdapter.toLegacy(d) }));
    }, [setFormData]);

    const handleOpenEDDrugs = useCallback(() => dialogs.setIsEDDrugsOpen(true), [dialogs.setIsEDDrugsOpen]);
    const handleOpenPEForm = useCallback(() => dialogs.setIsPEFormOpen(true), [dialogs.setIsPEFormOpen]);
    const handleOpenPrescription = useCallback(() => dialogs.setPrescriptionPopoverOpen(true), [dialogs.setPrescriptionPopoverOpen]);

    const systemQueryValue = useMemo(() => systemQueryAdapter.toNew(formData), [formData]);
    const medicalHistoryValue = useMemo(() => medicalHistoryAdapter.toNew(formData), [formData]);
    const physicalExamValue = useMemo(() => physicalExamAdapter.toNew(formData), [formData]);
    const diagnosisValue = useMemo(() => diagnosisAdapter.toNew(formData), [formData]);

    const handleCopyLastDrugs = useCallback(() => {
        const latestExamWithDrugs = pastExaminations.find(e => e.kullandigi_ilaclar && e.kullandigi_ilaclar.trim() !== "");
        if (latestExamWithDrugs && latestExamWithDrugs.kullandigi_ilaclar) {
            setFormData((prev: any) => ({
                ...prev,
                kullandigi_ilaclar: latestExamWithDrugs.kullandigi_ilaclar
            }));
            toast.success("Eski muayeneden ilaçlar kopyalandı.");
        } else {
            toast.warning("Kopyalanacak eski ilaç bulunmadı.");
        }
    }, [pastExaminations, setFormData]);

    return (
        <div className="flex h-full flex-col gap-6 p-6 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1 space-y-6 w-full min-w-0">
                    <PatientHeader patient={patient} moduleName="Tıbbi Muayene" />

                    <ExaminationToolbar
                        formData={formData} setFormData={setFormData}
                        isEditing={isEditing} setIsEditing={setIsEditing}
                        selectedExamId={selectedExamId}
                        doctors={definitions.doctors}
                        onSave={() => handlers.handleSave()}

                    />

                    <div className="space-y-6">
                        {/* Şikayet */}
                        <ClinicalCard title="Şikayet" icon={MessageCircle} iconClassName="text-orange-500">
                            <DebouncedTextarea
                                value={formData.sikayet || ""}
                                disabled={!isEditing}
                                onValueChange={handleSikayetChange}
                                rows={3}
                                className="min-h-[80px] border-0 focus-visible:ring-0 resize-none text-sm font-mono text-slate-700 p-0 bg-transparent placeholder:text-slate-300"
                                placeholder="Hastanın şikayetleri..."
                            />
                        </ClinicalCard>

                        {/* Öykü */}
                        <ClinicalCard
                            title="Öykü"
                            icon={FileText}
                            iconClassName="text-blue-600"
                            action={
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => peClinical.setIsOpen(true)}
                                        className={cn(
                                            "h-7 px-2 text-[10px] font-bold border flex items-center gap-1.5 uppercase transition-all shadow-sm",
                                            peClinical.filled
                                                ? "bg-pink-50 border-pink-300 text-pink-800 hover:bg-pink-100"
                                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        <Asterisk className="w-3.5 h-3.5" /> PE FORMU
                                    </Button>
                                    {examinationModules.edModule && <Button variant="outline" size="sm" onClick={() => dialogs.setIsEDCFormOpen(true)} className="h-7 px-2 text-[10px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1.5 uppercase transition-all shadow-sm"><Activity className="w-3.5 h-3.5" /> ED FORMU</Button>}
                                </div>
                            }
                        >
                            <DebouncedTextarea
                                value={formData.oyku || ""}
                                disabled={!isEditing}
                                onValueChange={handleOykuChange}
                                rows={16}
                                className="min-h-[400px] border-0 focus-visible:ring-0 resize-none font-mono text-sm leading-relaxed p-0 bg-transparent placeholder:text-slate-300"
                                placeholder="Hikayesi..."
                            />
                        </ClinicalCard>


                        {/* System Query */}
                        <ClinicalCard
                            title="Sistemlerin Sorgusu"
                            icon={Activity}
                            iconClassName="text-purple-500"
                            className="min-h-[500px]"
                            action={
                                <div className="flex items-center gap-2">
                                    <QuestionnaireScoreCard
                                        label="PEDT"
                                        total={pedt.total}
                                        maxScore={20}
                                        filled={pedt.filled}
                                        severity={pedt.severity}
                                        onClick={() => pedt.setIsOpen(true)}
                                    />
                                    <QuestionnaireScoreCard
                                        label="IIEF-EF"
                                        total={iiefTotal}
                                        maxScore={30}
                                        filled={iiefExport.filled}
                                        severity={iiefExport.severity}
                                        onClick={() => dialogs.setIiefDialogOpen(true)}
                                    />
                                    <QuestionnaireScoreCard
                                        label="MSHQ"
                                        total={parseInt(formData.mshq) || 0}
                                        maxScore={20}
                                        filled={!!formData.mshq}
                                        severity={{ color: "purple" }}
                                        onClick={() => dialogs.setMshqDialogOpen(true)}
                                    />
                                    <div onClick={() => dialogs.setIpssDialogOpen(true)} className={cn("cursor-pointer flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all hover:shadow-md", ipssTotal > 19 ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")}><span className="font-bold text-sm">IPSS</span><div className="h-6 w-px bg-current opacity-20"></div><div className="flex flex-col text-[10px] font-medium leading-tight"><span>İrritatif: {ipssIrritative}</span><span>Obstrüktif: {ipssObstructive}</span></div><div className="h-6 w-px bg-current opacity-20"></div><span className="font-bold text-sm whitespace-nowrap">Skor: {ipssTotal}</span></div>
                                </div>
                            }
                        >
                            <SystemQueryForm value={systemQueryValue} onChange={handleSystemQueryChange} readOnly={!isEditing} />
                        </ClinicalCard>

                        {/* Özgeçmiş */}
                        <ClinicalCard title="Özgeçmiş" icon={ClipboardList} iconClassName="text-indigo-500">
                            <PastHistorySection value={medicalHistoryValue} onChange={handleMedicalHistoryChange} readOnly={!isEditing} onOpenEDDrugs={handleOpenEDDrugs} />
                        </ClinicalCard>

                        {/* Tıbbi Geçmiş & Muayene Bulguları - Side by Side per Design */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ClinicalCard
                                title="Tıbbi Geçmiş"
                                icon={History}
                                iconClassName="text-slate-600"
                                className={cn("transition-colors duration-300", formData.kan_sulandirici ? "bg-yellow-50 border-yellow-200" : "bg-white")}
                                action={
                                    <Button variant="outline" size="sm" onClick={() => dialogs.setIsEDDrugsOpen(true)} className="h-7 px-2 text-[10px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1.5 uppercase transition-all shadow-sm bg-white"><Pill className="w-3.5 h-3.5" /> ED DRUGS</Button>
                                }
                            >
                                <MedicalHistorySection value={medicalHistoryValue} onChange={handleMedicalHistoryChange} readOnly={!isEditing} onCopyLastDrugs={handleCopyLastDrugs} />
                            </ClinicalCard>

                            <ClinicalCard
                                title="Muayene Bulguları"
                                icon={Eye}
                                iconClassName="text-teal-600"
                            >
                                <PhysicalExamForm value={physicalExamValue} onChange={handlePhysicalExamChange} readOnly={!isEditing} onOpenPEForm={examinationModules.peModule ? handleOpenPEForm : undefined} />
                            </ClinicalCard>
                        </div>

                        {/* Tanı ve Sonuç - DiagnosisForm handles its own layout */}
                        <DiagnosisForm
                            value={diagnosisValue}
                            onChange={handleDiagnosisChange}
                            readOnly={!isEditing}
                            patientId={patientId}
                            onOpenPrescription={handleOpenPrescription}
                        />

                        {/* Save Bar - Non-sticky */}
                        <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-6">
                            <div className="flex items-center gap-3">
                                {selectedExamId && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-9 px-6 font-bold text-xs uppercase shadow-md transition-all bg-red-600 hover:bg-red-700"
                                        onClick={(e) => handlers.handleDeleteExamination(e, selectedExamId)}
                                    >
                                        SİL
                                    </Button>
                                )}
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Otomatik kayıt aktif</span>
                            </div>
                            <Button
                                className={cn("h-9 text-white font-bold text-xs px-6 gap-2 shadow-md transition-all", !isEditing ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700")}
                                onClick={() => isEditing ? handlers.handleSave() : setIsEditing(true)}
                            >
                                {!isEditing ? "DÜZENLE" : "KAYDET"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-[240px] shrink-0 lg:sticky lg:top-6 self-start h-[calc(100vh-100px)] overflow-y-auto">
                    <PastExaminationsSidebar pastExaminations={pastExaminations} selectedExamId={selectedExamId} onSelectExamination={handlers.handleSelectExamination} onNewExamination={handlers.handleNewExamination} />
                </div>
            </div>

            <ExaminationDialogs
                formData={formData} setFormData={setFormData}
                isEditing={isEditing} dialogs={dialogs}
                patient={patient} pastExaminations={pastExaminations}
                definitions={definitions} ipssTotal={ipssTotal}
                iiefTotal={iiefTotal} iiefAnswers={iiefAnswers}
                setIiefAnswers={setIiefAnswers as any}
                pedtValues={{ open: pedt.isOpen, setOpen: pedt.setIsOpen, answers: pedt.answers as any, setAnswers: pedt.setAnswers as any, total: pedt.total, filled: pedt.filled, severity: pedt.severity, onExport: handlePEDTExport }}
                peFormValues={{ open: peClinical.isOpen, setOpen: peClinical.setIsOpen, answers: peClinical.answers as any, setAnswers: peClinical.setAnswers as any, filled: peClinical.filled, onExport: handlePEFormExport }}
                onIIEFExport={handleIIEFExport} iiefFilled={iiefExport.filled}
                onConfirmDelete={handlers.confirmDelete}
            />


            {/* Floating AI HPV Briefing Button & Popover */}
            {aiHpvBriefingEnabled && hasHPV && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                className={cn(
                                    "h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border",
                                    hpvBriefingError 
                                        ? "bg-red-600 hover:bg-red-500 text-white border-red-400/20" 
                                        : hpvBriefingLoading 
                                            ? "bg-purple-500 hover:bg-purple-500 text-white border-purple-400/20" 
                                            : "bg-purple-600 hover:bg-purple-500 text-white border-purple-400/20"
                                )}
                                title={hpvBriefingLoading ? "AI Analizi Yapılıyor..." : "AI HPV Briefing"}
                            >
                                {hpvBriefingLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-purple-100" />
                                ) : hpvBriefingError ? (
                                    <AlertTriangle className="h-5 w-5 text-white animate-bounce" />
                                ) : (
                                    <Dna className="h-6 w-6 animate-pulse" />
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" side="top" className="w-[500px] max-w-[calc(100vw-2rem)] p-0 border-0 bg-transparent shadow-2xl overflow-y-auto max-h-[80vh]">
                            <HPVBriefingPanel 
                                patientId={patientId}
                                briefing={hpvBriefing}
                                isLoading={hpvBriefingLoading}
                                isError={hpvBriefingError}
                                error={hpvBriefingErrorObj}
                                refetch={refetchHpvBriefing}
                                handleGenerate={handleHpvBriefingGenerate}
                                shouldFetch={hpvBriefingShouldFetch}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            )}
        </div >
    );
}
