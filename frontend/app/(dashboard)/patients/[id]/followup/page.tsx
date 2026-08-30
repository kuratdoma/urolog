"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { api, FollowUp, Operation, MedicalReport } from "@/lib/api";
import { ExaminationPrintDialog } from "@/components/examination/ExaminationPrintDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAIScribeStore } from "@/stores/ai-scribe-store";
import { PatientHeader } from "@/components/clinical/patient-header";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// Modüler Alt Bileşenler
import { FollowUpTimelineList } from "@/components/followup/FollowUpTimelineList";
import { FollowUpActionBar } from "@/components/followup/FollowUpActionBar";
import { FollowUpFormCard } from "@/components/followup/FollowUpFormCard";

export default function FollowUpPage() {
    const params = useParams();
    const patientId = String(params.id);
    const queryClient = useQueryClient();

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState("TAKİP");
    const [status, setStatus] = useState("Normal");
    const [note, setNote] = useState("");
    const [tags, setTags] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [printExamId, setPrintExamId] = useState<string | null>(null);

    // Tag Helpers
    const tagsArray = useMemo(() => {
        return tags ? tags.split(',').map(t => t.trim()).filter(t => t !== "") : [];
    }, [tags]);

    const handleAddTag = (tag: string) => {
        const trimmed = tag.trim().toUpperCase();
        if (trimmed && !tagsArray.includes(trimmed)) {
            const newTags = [...tagsArray, trimmed].join(',');
            setTags(newTags);
        }
        setTagInput("");
    };

    const handleRemoveTag = (tag: string) => {
        const newTags = tagsArray.filter(t => t !== tag).join(',');
        setTags(newTags);
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && tagsArray.length > 0) {
            handleRemoveTag(tagsArray[tagsArray.length - 1]);
        }
    };

    // Mode States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [hasAutoSelected, setHasAutoSelected] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);

    // Fetch Patient Details
    const { data: patient } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => api.patients.get(patientId),
        enabled: !!patientId
    });

    // Fetch Followup Subject Definitions
    const { data: shardedSubjects = [] } = useQuery({
        queryKey: ['definitions', 'takip-konulari'],
        queryFn: () => api.definitions.takipKonulari.list(),
    });

    // Parse Followup Subjects
    const followupSubjects = useMemo(() => {
        if (shardedSubjects.length > 0) {
            return shardedSubjects.map(s => s.ad);
        }
        return [
            'BİYOPSİ (BX ve Trus dahil)',
            'CİNSEL SAĞLIK / TERAPİ',
            'ESWT',
            'EXOSOME - PRP',
            'GARDASİL (1/2/3. DOZ)',
            'GÖRÜŞME',
            'HPV TAKİP',
            'INTRAVEZIKAL TEDAVİ',
            'KONTROL',
            'KRİYOTERAPİ',
            'LAZER UYGULAMA',
            'LİPUS',
            'MÜDAHALE',
            'ONAM',
            'PATOLOJİ / HİSTOPATOLOJİ',
            'PLAN',
            'POST-OP KONTROL',
            'TAKİP',
            'TAVSİYE / ÖNERİLER',
            'TEDAVİ'
        ];
    }, [shardedSubjects]);

    // Fetch FollowUps
    const {
        data: followUps = [],
        isLoading: isLoadingFollowUps,
        isError: isErrorFollowUps
    } = useQuery({
        queryKey: ['followups', patientId],
        queryFn: () => api.clinical.getFollowUps(patientId),
        enabled: !!patientId
    });

    // Fetch Operations
    const { data: operations = [] } = useQuery({
        queryKey: ['operations', patientId],
        queryFn: () => api.clinical.getOperations(patientId),
        enabled: !!patientId
    });

    // Fetch Medical Reports
    const { data: medicalReports = [] } = useQuery({
        queryKey: ['medical-reports', patientId],
        queryFn: () => api.clinical.getMedicalReports(patientId),
        enabled: !!patientId
    });

    // Unified Timeline Items
    const timelineItems = useMemo(() => {
        let items: any[] = [];

        // Followups
        if (followUps && Array.isArray(followUps)) {
            items = items.concat(followUps.map((f: FollowUp) => ({
                ...f,
                id: `followup-${f.id}`,
                originalId: f.id,
                sourceType: 'followup',
                sortDate: f.tarih || '',
                displayDate: f.tarih,
                displayText: f.notlar,
                displayType: f.tur,
                displayTags: f.etiketler ? f.etiketler.split(',').filter((t: string) => t.trim() !== "") : [],
                canEdit: f.tur !== "Muayene"
            })));
        }

        // Operations
        if (operations && Array.isArray(operations)) {
            items = items.concat(operations.map((op: Operation) => ({
                id: `operation-${op.id}`,
                originalId: op.id,
                sourceType: 'operation',
                sortDate: op.tarih || '',
                displayDate: op.tarih,
                displayText: op.ameliyat,
                displayType: 'OPERASYON',
                displayTags: [op.ekip, op.anestezi_tur].filter(Boolean),
                durum: 'Normal',
                canEdit: false,
                originalData: op
            })));
        }

        // Medical Reports
        if (medicalReports && Array.isArray(medicalReports)) {
            items = items.concat(medicalReports.map((mr: MedicalReport) => ({
                id: `medical-${mr.id}`,
                originalId: mr.id,
                sourceType: 'medical_report',
                sortDate: mr.tarih || '',
                displayDate: mr.tarih,
                displayText: mr.islem_detayi || mr.yapilan_islem || mr.tani,
                displayType: 'TIBBİ MÜDAHALE',
                displayTags: [mr.islem_basligi].filter(Boolean),
                durum: 'Normal',
                canEdit: false,
                originalData: mr
            })));
        }

        return items.sort((a, b) => {
            return new Date(b.sortDate || 0).getTime() - new Date(a.sortDate || 0).getTime();
        });
    }, [followUps, operations, medicalReports]);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!date) throw new Error("Tarih gerekli");

            const payload = {
                hasta_id: patientId,
                tarih: format(date, 'yyyy-MM-dd'),
                tur: type,
                durum: status,
                notlar: note,
                etiketler: tags
            };

            if (editingId) {
                return await api.clinical.updateFollowUp(editingId, payload);
            } else {
                return await api.clinical.createFollowUp(payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['followups', patientId] });
            toast.success(editingId ? "Takip notu güncellendi." : "Takip notu kaydedildi.");
            setIsEditing(false);
        },
        onError: () => {
            toast.error("Takip notu kaydedilirken bir hata oluştu.");
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.clinical.deleteFollowUp(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['followups', patientId] });
            toast.success("Takip notu silindi.");
            setDeleteId(null);
            if (deleteId === editingId) {
                resetForm();
            }
        },
        onError: () => {
            toast.error("Takip notu silinirken bir hata oluştu.");
        }
    });

    const resetForm = useCallback(() => {
        setEditingId(null);
        setDate(new Date());
        setType("TAKİP");
        setStatus("Normal");
        setNote("");
        setTags("");
        setTagInput("");
        setIsEditing(true);
        setIsViewOnly(false);
    }, []);

    const handleEdit = useCallback((item: any) => {
        setEditingId(item.originalId);
        setDate(item.displayDate ? parseISO(item.displayDate) : undefined);
        setType(item.displayType || "TAKİP");
        setStatus(item.durum || "Normal");
        setNote(item.displayText || "");
        setTags(item.displayTags.join(',') || "");
        setTagInput("");

        if (!item.canEdit) {
            setIsEditing(false);
            setIsViewOnly(true);
        } else {
            setIsEditing(false);
            setIsViewOnly(false);
        }
    }, []);

    // Auto-select latest
    useEffect(() => {
        if (!hasAutoSelected && timelineItems.length > 0) {
            const firstEditable = timelineItems.find(i => i.canEdit);
            if (firstEditable) {
                handleEdit(firstEditable);
                setHasAutoSelected(true);
            }
        }
    }, [timelineItems, hasAutoSelected, handleEdit]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (timelineItems.length === 0) return;

                const currentIndex = timelineItems.findIndex(f => f.originalId === editingId && f.sourceType === 'followup');
                let nextIndex = 0;

                if (e.key === "ArrowDown") {
                    nextIndex = currentIndex + 1;
                } else if (e.key === "ArrowUp") {
                    nextIndex = currentIndex - 1;
                }

                if (nextIndex >= 0 && nextIndex < timelineItems.length) {
                    const nextItem = timelineItems[nextIndex];
                    if (nextItem) {
                        handleEdit(nextItem);
                        const element = document.getElementById(`followup-item-${nextItem.id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editingId, timelineItems, handleEdit]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onSave: () => {
            if (isEditing) {
                saveMutation.mutate();
            } else {
                setIsEditing(true);
                toast.info("Düzenleme modu açıldı.");
            }
        },
        onSearch: () => {
            const searchInput = document.querySelector('input[placeholder="Ara..."]') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
                toast.info("Arama kutusuna odaklandı.");
            }
        }
    });

    // AI Scribe Integration
    const { latestResult, setLatestResult } = useAIScribeStore();

    useEffect(() => {
        if (latestResult && isEditing) {
            if (latestResult.clinical_note) {
                setNote(prev => {
                    const newNote = prev ? prev + "\n\n" + latestResult.clinical_note : latestResult.clinical_note;
                    return newNote || "";
                });
                toast.success("AI analizi nota eklendi.");
                setLatestResult(null);
            }
        }
    }, [latestResult, isEditing, setLatestResult]);

    const handlePrint = () => {
        if (!editingId) return;
        const item = timelineItems.find(t => t.originalId === editingId);
        if (!item) return;

        if (item.sourceType === 'operation') {
            window.open(`/print/operation/${editingId}`, "_blank");
        } else if (item.sourceType === 'medical_report') {
            window.open(`/print/medical-report/${editingId}`, "_blank");
        } else if (item.displayType === 'Muayene') {
            setPrintExamId(editingId);
        } else {
            window.open(`/print/followup/${editingId}`, "_blank");
        }
    };

    return (
        <div className="flex h-full flex-col lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Main Content Area (Form) */}
            <div className="flex-1 flex flex-col min-w-0 p-6 gap-6">
                <PatientHeader patient={patient ?? null} moduleName="Takip Notları" />

                <FollowUpActionBar
                    isEditing={isEditing}
                    isViewOnly={isViewOnly}
                    editingId={editingId}
                    isPending={saveMutation.isPending}
                    onSave={() => saveMutation.mutate()}
                    onCancelEdit={() => setIsEditing(false)}
                    onStartEdit={() => setIsEditing(true)}
                    onDelete={() => setDeleteId(editingId)}
                    onPrint={handlePrint}
                />

                <FollowUpFormCard
                    editingId={editingId}
                    isEditing={isEditing}
                    date={date}
                    setDate={setDate}
                    type={type}
                    setType={setType}
                    followupSubjects={followupSubjects}
                    tagsArray={tagsArray}
                    tagInput={tagInput}
                    setTagInput={setTagInput}
                    handleTagKeyDown={handleTagKeyDown}
                    handleRemoveTag={handleRemoveTag}
                    status={status}
                    setStatus={setStatus}
                    note={note}
                    setNote={setNote}
                />
            </div>

            {/* Right Sidebar (List) */}
            <FollowUpTimelineList
                timelineItems={timelineItems}
                isLoadingFollowUps={isLoadingFollowUps}
                isErrorFollowUps={isErrorFollowUps}
                editingId={editingId}
                isViewOnly={isViewOnly}
                resetForm={resetForm}
                handleEdit={handleEdit}
                handleDeleteClick={(item) => setDeleteId(item.id)}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. Bu takip notu kalıcı olarak silinecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Examination Print Dialog */}
            {printExamId && (
                <ExaminationPrintDialog
                    isOpen={!!printExamId}
                    onClose={() => setPrintExamId(null)}
                    examId={printExamId}
                    patientId={patientId}
                    patientName={patient ? `${patient.ad} ${patient.soyad}` : undefined}
                />
            )}
        </div>
    );
}
