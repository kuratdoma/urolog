"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { api, FollowUp, Operation, MedicalReport } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    Plus,
    Save,
    Search,
    AlertCircle,
    FileText,
    Activity,
    Stethoscope,
    Phone,
    Star,
    MoreVertical,
    Pencil,
    Trash2,
    Printer,
    X,
    Scissors,
    FileHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExaminationPrintDialog } from "@/components/examination/ExaminationPrintDialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAIScribeStore } from "@/stores/ai-scribe-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientHeader } from "@/components/clinical/patient-header";

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
    const [searchQuery, setSearchQuery] = useState("");
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

    // Edit/Delete State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(true);
    const [isViewOnly, setIsViewOnly] = useState(false); // New state for readonly view
    const [hasAutoSelected, setHasAutoSelected] = useState(false);

    // Fetch Patient
    const { data: patient } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => api.patients.get(patientId),
    });

    // --- API: Sharded Definitions ---
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
    const { data: followUps = [], isLoading: isLoadingFollowUps, isError: isErrorFollowUps } = useQuery({
        queryKey: ['followups', patientId],
        queryFn: () => api.clinical.getFollowUps(patientId),
    });

    const { data: operations = [] } = useQuery({
        queryKey: ['operations', patientId],
        queryFn: () => api.clinical.getOperations(patientId),
    });

    const { data: medicalReports = [] } = useQuery({
        queryKey: ['medical-reports', patientId],
        queryFn: () => api.clinical.getMedicalReports(patientId),
    });

    const timelineItems = useMemo(() => {
        let items: any[] = [];

        // Followups
        if (followUps && Array.isArray(followUps)) {
            items = items.concat(followUps.map(f => ({
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
                displayText: op.ameliyat, // Using 'ameliyat' as main text
                displayType: 'OPERASYON',
                displayTags: [op.ekip, op.anestezi_tur].filter(Boolean),
                durum: 'Normal', // Default
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

        const query = searchQuery.toLowerCase().trim();
        const filtered = items.filter(item => {
            if (!query) return true;
            const textMatch = (item.displayText || '').toLowerCase().includes(query);
            const typeMatch = (item.displayType || '').toLowerCase().includes(query);
            const tagMatch = item.displayTags.some((t: string) => t.toLowerCase().includes(query));
            return textMatch || typeMatch || tagMatch;
        });

        // Sort descending
        return filtered.sort((a, b) => {
            return new Date(b.sortDate || 0).getTime() - new Date(a.sortDate || 0).getTime();
        });
    }, [followUps, operations, medicalReports, searchQuery]);

    // Mutations
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
                return api.clinical.updateFollowUp(editingId, payload);
            } else {
                return api.clinical.createFollowUp(payload);
            }
        },
        onSuccess: () => {
            toast.success(editingId ? "Not güncellendi" : "Not kaydedildi");
            queryClient.invalidateQueries({ queryKey: ['followups', patientId] });
            resetForm();
        },
        onError: () => {
            toast.error("İşlem sırasında bir hata oluştu");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.clinical.deleteFollowUp(id);
        },
        onSuccess: () => {
            toast.success("Not silindi");
            queryClient.invalidateQueries({ queryKey: ['followups', patientId] });
            setDeleteId(null);
        },
        onError: () => {
            toast.error("Silme işlemi başarısız");
        }
    });

    const resetForm = () => {
        setEditingId(null);
        setDate(new Date());
        setType("TAKİP");
        setStatus("Normal");
        setNote("");
        setTags("");
        setTagInput("");
        setIsEditing(true);
        setIsViewOnly(false);
    };

    const handleEdit = (item: any) => {
        // Allow viewing details even if readonly found

        setEditingId(item.originalId);
        setDate(item.displayDate ? parseISO(item.displayDate) : new Date());
        setType(item.displayType || "TAKİP");
        setStatus(item.durum || "Normal");
        setNote(item.displayText || "");
        setTags(item.displayTags.join(',') || "");
        setTagInput("");

        // If item cannot be edited, force readonly view
        if (!item.canEdit) {
            setIsEditing(false);
            setIsViewOnly(true);
        } else {
            setIsEditing(false);
            setIsViewOnly(false);
        }
    };

    // Auto-select latest (moved after handleEdit declaration)
    useEffect(() => {
        if (!hasAutoSelected && timelineItems.length > 0) {
            // Find first editable item to auto-select, or just don't select anything if top is readonly
            const firstEditable = timelineItems.find(i => i.canEdit);
            if (firstEditable) {
                handleEdit(firstEditable);
                setHasAutoSelected(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timelineItems, hasAutoSelected]);

    const handleDeleteClick = (item: FollowUp) => {
        setDeleteId(item.id);
    };

    // Helpers
    const getTypeIcon = (t: string) => {
        switch (t) {
            case "Telefon Görüşmesi": return <Phone className="h-4 w-4" />;
            case "Muayene": return <Stethoscope className="h-4 w-4" />;
            case "Patoloji Sonucu": return <Activity className="h-4 w-4" />;
            case "OPERASYON": return <Scissors className="h-4 w-4" />;
            case "TIBBİ MÜDAHALE": return <FileHeart className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getTypeColor = (t: string) => {
        switch (t) {
            case "Muayene": return "bg-blue-50 text-blue-700 border-blue-200";
            case "Acil": return "bg-red-50 text-red-700 border-red-200";
            case "Telefon Görüşmesi": return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "OPERASYON": return "bg-purple-50 text-purple-700 border-purple-200";
            case "TIBBİ MÜDAHALE": return "bg-indigo-50 text-indigo-700 border-indigo-200";
            default: return "bg-slate-50 text-slate-700 border-slate-200";
        }
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only navigate if we're not typing in an input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();

                if (timelineItems.length === 0) return;

                const currentIndex = timelineItems.findIndex(f => f.originalId === editingId && f.sourceType === 'followup');
                let nextIndex = 0;

                // Simple navigation logic might need adjustment if mixed items
                // This is a basic implementation
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
    }, [editingId, timelineItems]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onSave: () => {
            // If clicking update (pencil) toggles editing, keyboard save should trigger save if editing
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
            // If we have a result from AI Scribe, add it to the note
            if (latestResult.clinical_note) {
                setNote(prev => {
                    const newNote = prev ? prev + "\n\n" + latestResult.clinical_note : latestResult.clinical_note;
                    return newNote || "";
                });
                toast.success("AI analizi nota eklendi.");
                // Store results but clear the trigger
                setLatestResult(null);
            }
        }
    }, [latestResult, isEditing, setLatestResult]);

    return (
        <div className="flex h-full flex-col lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Main Content Area (Form) */}
            <div className="flex-1 flex flex-col min-w-0 p-6 gap-6">

                {/* Header Card */}
                <PatientHeader patient={patient ?? null} moduleName="Takip Notları" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <Button
                                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                                    onClick={() => saveMutation.mutate()}
                                    disabled={saveMutation.isPending}
                                >
                                    <Save className="h-3 w-3" />
                                    {saveMutation.isPending ? "KAYDEDİLİYOR..." : "KAYDET"}
                                </Button>
                                {editingId && (
                                    <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-slate-500 h-8 px-3 text-xs font-bold">
                                        İPTAL
                                    </Button>
                                )}
                            </>
                        ) : (
                            !isViewOnly && (
                                <Button
                                    className="h-8 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Pencil className="h-3 w-3" />
                                    GÜNCELLE
                                </Button>
                            )
                        )}

                        {editingId && !isViewOnly && (
                            <Button
                                className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                                onClick={() => setDeleteId(editingId)}
                            >
                                <Trash2 className="h-3 w-3" />
                                SİL
                            </Button>
                        )}
                    </div>

                    {editingId && (
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                            onClick={() => {
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
                            }}
                            title="Yazdır"
                        >
                            <Printer className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Form Card */}
                <Card className={cn(
                    "flex-1 border-slate-200 shadow-sm transition-all duration-300",
                    editingId ? "ring-2 ring-amber-100 border-amber-200" : ""
                )}>
                    <CardContent className="p-6 h-full flex flex-col gap-4">
                        {/* Inputs Row */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Date */}
                            <DatePicker
                                date={date ? format(date, 'yyyy-MM-dd') : ''}
                                setDate={val => setDate(val ? parseISO(val) : undefined)}
                                disabled={!isEditing}
                                className="w-[170px] bg-white border-slate-200 h-9 text-xs"
                            />

                            {/* Type */}
                            <div className="flex items-center">
                                <Select value={type} onValueChange={setType} disabled={!isEditing}>
                                    <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200 text-xs font-bold uppercase">
                                        <SelectValue placeholder="KONU" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {followupSubjects.map(subject => (
                                            <SelectItem key={subject} value={subject} className="text-xs uppercase">{subject}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* TAGs */}
                            <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-slate-200 rounded-md px-2 h-9 overflow-hidden focus-within:ring-1 focus-within:ring-blue-500">
                                <span className="text-[10px] font-bold text-slate-400 shrink-0">TAGs:</span>
                                <div className="flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar flex-1 max-h-7">
                                    {tagsArray.map(tag => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="text-[9px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 shrink-0 font-bold uppercase"
                                        >
                                            {tag}
                                            {isEditing && (
                                                <X
                                                    className="h-2.5 w-2.5 cursor-pointer hover:text-blue-900"
                                                    onClick={() => handleRemoveTag(tag)}
                                                />
                                            )}
                                        </Badge>
                                    ))}
                                    <input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder={tagsArray.length === 0 ? "Örn: ACİL, LAB..." : ""}
                                        disabled={!isEditing}
                                        className="outline-none bg-transparent text-xs uppercase flex-1 min-w-[60px]"
                                    />
                                </div>
                            </div>

                            {/* Status Icons Selection */}
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-sm">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={!isEditing}
                                    title="Dikkat"
                                    className={cn(
                                        "h-9 w-9 transition-all rounded-md",
                                        status === "Acil"
                                            ? "bg-red-500 text-white hover:bg-red-600 shadow-sm"
                                            : "text-slate-300 hover:text-red-400 hover:bg-red-50"
                                    )}
                                    onClick={() => setStatus(status === "Acil" ? "Normal" : "Acil")}
                                >
                                    <AlertCircle className={cn("h-5 w-5", status === "Acil" ? "stroke-[3.5px]" : "stroke-2")} />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={!isEditing}
                                    title="Önemli"
                                    className={cn(
                                        "h-9 w-9 transition-all rounded-md",
                                        status === "Önemli"
                                            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                                            : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"
                                    )}
                                    onClick={() => setStatus(status === "Önemli" ? "Normal" : "Önemli")}
                                >
                                    <Star className={cn("h-5 w-5", status === "Önemli" ? "fill-white" : "")} />
                                </Button>
                            </div>
                        </div>

                        {/* Text Area */}
                        <Textarea
                            className="flex-1 resize-none border-0 focus-visible:ring-0 p-4 text-sm md:text-base font-mono text-slate-700 placeholder:text-slate-300 bg-slate-50/30 rounded-lg disabled:cursor-auto disabled:opacity-80"
                            placeholder="Hastanın durumu, şikayetleri ve yapılan işlemler hakkında detaylı notlarınızı buraya yazın..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={!isEditing}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Right Sidebar (List) */}
            <div className="w-full lg:w-[240px] space-y-4 shrink-0 p-6 lg:pl-0">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    size="lg"
                    onClick={resetForm}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Not
                </Button>

                <div className="rounded-xl border border-white bg-white shadow-sm flex flex-col h-[calc(100vh-100px)] sticky top-6 overflow-hidden">
                    <div className="p-3 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                        <span>GEÇMİŞ KAYITLAR</span>
                        <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {timelineItems.length}
                        </span>
                    </div>

                    <ScrollArea className="flex-1 bg-white min-h-0">
                        <div className="divide-y divide-slate-100">
                            {isLoadingFollowUps ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    Yükleniyor...
                                </div>
                            ) : isErrorFollowUps ? (
                                <div className="p-8 text-center text-red-400 text-sm">
                                    Takip notları yüklenirken bir hata oluştu.
                                </div>
                            ) : timelineItems.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    Kayıt bulunamadı.
                                </div>
                            ) : (
                                timelineItems.map((item, index) => (
                                    <div
                                        key={`${item.id}-${index}`}
                                        id={`followup-item-${item.id}`}
                                        className={cn(
                                            "group p-3 hover:bg-slate-50 transition-colors relative cursor-pointer border-l-4",
                                            editingId === item.originalId && ((item.sourceType === 'followup' && !isViewOnly) || ((item.sourceType === 'operation' || item.sourceType === 'medical_report') && isViewOnly)) ? "bg-amber-50/50 border-amber-500" :
                                                "border-transparent"
                                        )}
                                        onClick={() => handleEdit(item)}
                                    >
                                        <div className="flex items-start justify-between mb-1.5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {item.displayDate ? format(parseISO(item.displayDate), 'dd.MM.yyyy') : '-'}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase border-l-2 pl-2",
                                                            item.sourceType === 'operation' ? "text-purple-600 border-purple-200" :
                                                                item.sourceType === 'medical_report' ? "text-indigo-600 border-indigo-200" :
                                                                    "text-blue-600 border-blue-200"
                                                        )}>
                                                            {item.displayType}
                                                        </span>
                                                        {item.displayTags.map((tag: any) => (
                                                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium border border-slate-200 uppercase whitespace-nowrap">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {/* Status Icons */}
                                                    {item.durum === 'Acil' ? (
                                                        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 stroke-[3px]" />
                                                    ) : item.durum === 'Önemli' ? (
                                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {/* Actions Menu - Only for editable items */}
                                                {item.canEdit && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={(e) => { e.stopPropagation(); }}
                                                            >
                                                                <MoreVertical className="h-3 w-3 text-slate-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-32">
                                                            <DropdownMenuItem
                                                                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                                                className="text-xs"
                                                            >
                                                                <Pencil className="mr-2 h-3 w-3" /> Düzenle
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                                                                className="text-xs text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-3 w-3" /> Sil
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-600 line-clamp-2 leading-snug break-words">
                                            {item.displayText || "Not girilmemiş."}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

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
