"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { usePatientStore } from "@/stores/patient-store";
import { api, Operation, Patient } from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
    Calendar as Plus, Save, Trash2, Printer, Activity, Scissors,
    Layout,
    Check,
    Search,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAIScribeStore } from "@/stores/ai-scribe-store";

import { PatientHeader } from "@/components/clinical/patient-header";
import { SystemQueryCombobox } from "@/components/clinical/system-query-combobox";

export default function OperationPage() {
    const params = useParams();
    const patientId = String(params.id);
    const { activePatient, setActivePatient } = usePatientStore();

    // Patient State
    const [patient, setPatient] = useState<Patient | null>(null);

    // Operation Form State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [surgeryName, setSurgeryName] = useState("");
    const [team, setTeam] = useState("");
    const [preOpDiagnosis, setPreOpDiagnosis] = useState("");
    const [postOpDiagnosis, setPostOpDiagnosis] = useState("");
    const [anesthesiaType, setAnesthesiaType] = useState("");
    const [notes, setNotes] = useState("");
    const [pathology, setPathology] = useState("");
    const [status, setStatus] = useState("completed");
    const [preOpChecklist, setPreOpChecklist] = useState("");

    // History State
    const [pastOperations, setPastOperations] = useState<Operation[]>([]);
    const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState("");

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            if (!patientId) return;

            try {
                // Fetch Patient
                const patientData = await api.patients.get(patientId);
                setPatient(patientData);

                if (!activePatient || activePatient.id !== patientId) {
                    setActivePatient({
                        id: patientData.id,
                        ad: patientData.ad,
                        soyad: patientData.soyad,
                        tc_kimlik: patientData.tc_kimlik,
                    });
                }

                const ops = await api.clinical.getOperations(patientId);
                ops.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
                setPastOperations(ops);

                // Auto-select latest op if exists
                if (ops.length > 0) {
                    handleSelectOperation(ops[0]);
                }

            } catch (error) {
                console.error("Failed to load data", error);
                toast.error("Veriler yüklenirken bir hata oluştu.");
            }
        };

        loadData();
    }, [patientId]);

    // --- API: Sharded Definitions ---
    const { data: shardedTemplates = [] } = useQuery({
        queryKey: ['definitions', 'sablonlar', 'operation_note'],
        queryFn: () => api.definitions.sablonlar.list('operation_note'),
    });

    const { data: anesteziTipleri = [] } = useQuery({
        queryKey: ['definitions', 'anestezi-tipleri'],
        queryFn: () => api.definitions.anesteziTipleri.list(),
    });

    const { data: shardedHospitals = [] } = useQuery({
        queryKey: ['definitions', 'hastaneler'],
        queryFn: () => api.definitions.hastaneler.list(),
    });

    const { data: shardedSurgeons = [] } = useQuery({
        queryKey: ['definitions', 'cerrahlar'],
        queryFn: () => api.definitions.cerrahlar.list(),
    });

    const { data: shardedAnesthesiaStaff = [] } = useQuery({
        queryKey: ['definitions', 'anestezi-personelleri'],
        queryFn: () => api.definitions.anesteziPersonelleri.list(),
    });

    const { data: shardedNurses = [] } = useQuery({
        queryKey: ['definitions', 'hemsireler'],
        queryFn: () => api.definitions.hemsireler.list(),
    });

    const { data: shardedDoctors = [] } = useQuery({
        queryKey: ['definitions', 'doktorlar'],
        queryFn: () => api.definitions.doktorlar.list(),
    });

    // Re-calculating templates when sharded data changes
    const templates = useMemo(() => {
        if (shardedTemplates.length > 0) {
            return shardedTemplates.map(t => {
                const parts = t.icerik.split('|');
                return {
                    name: t.kod || parts[0] || "Başlıksız",
                    note: parts[1] || t.icerik
                };
            });
        }
        return [];
    }, [shardedTemplates]);

    // Dynamic Team Definitions
    const teamDefinitions = useMemo(() => {
        const team: any[] = [];

        shardedSurgeons.forEach(s => {
            team.push({ role: 'Cerrah', name: s.ad, full: `Cerrah|${s.ad}` });
        });

        shardedAnesthesiaStaff.forEach(a => {
            team.push({ role: 'Anestezi', name: a.ad, full: `Anestezi|${a.ad}` });
        });

        shardedNurses.forEach(n => {
            team.push({ role: 'Hemşire', name: n.ad, full: `Hemşire|${n.ad}` });
        });

        // Add doctors as Asistans
        shardedDoctors.forEach(d => {
            team.push({ role: 'Asistan', name: d.ad_soyad, full: `Asistan|${d.ad_soyad}` });
        });

        return team;
    }, [shardedSurgeons, shardedAnesthesiaStaff, shardedNurses, shardedDoctors]);

    // Anesthesia Types
    const anesthesiaDefinitions = useMemo(() => {
        return anesteziTipleri.map(a => a.ad);
    }, [anesteziTipleri]);

    // Hastane
    const [hastaneId, setHastaneId] = useState("");

    // Surgery Names from Templates
    const surgeryNames = useMemo(() => {
        return templates.map((t: { name: string }) => t.name);
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        if (!templateSearch) return templates;
        const search = templateSearch.toLowerCase();
        return templates.filter(t =>
            t.name.toLowerCase().includes(search) ||
            t.note.toLowerCase().includes(search)
        );
    }, [templates, templateSearch]);

    const handleToggleTeamMember = (member: string) => {
        setTeam(prev => {
            const currentMembers = prev ? prev.split(',').map(m => m.trim()) : [];
            if (currentMembers.includes(member)) {
                return currentMembers.filter(m => m !== member).join(', ');
            } else {
                return [...currentMembers, member].join(', ');
            }
        });
    };

    const handleNewOperation = () => {
        setSelectedOpId(null);
        setDate(new Date());
        setSurgeryName("");
        setTeam("");
        setPreOpDiagnosis("");
        setPostOpDiagnosis("");
        setAnesthesiaType("");
        setHastaneId("");
        setNotes("");
        setPathology("");
        setStatus("completed");
        setPreOpChecklist("");
        toast.info("Yeni operasyon formu açıldı.");
    };

    const handleSelectOperation = (op: Operation) => {
        setSelectedOpId(op.id);
        setDate(op.tarih ? parseISO(op.tarih) : new Date());
        setSurgeryName(op.ameliyat || "");
        setTeam(op.ekip || "");
        setPreOpDiagnosis(op.pre_op_tani || "");
        setPostOpDiagnosis(op.post_op_tani || "");
        setAnesthesiaType(op.anestezi_tur || "");
        setHastaneId(op.hastane_id || "");
        setNotes(op.notlar || "");
        setPathology(op.patoloji || "");
        setStatus(op.status || "completed");
        setPreOpChecklist(op.pre_op_checklist || "");
    };

    const handleApplyTemplate = (template: { name: string, note: string }) => {
        setSurgeryName(template.name);
        setNotes(template.note);
        setTemplateDialogOpen(false);
        toast.success("Şablon uygulandı.");
    };

    const handleSave = async () => {
        if (!patientId || !date) {
            toast.error("Lütfen tarih seçiniz.");
            return;
        }

        const payload = {
            hasta_id: patientId,
            tarih: format(date, 'yyyy-MM-dd'),
            ameliyat: surgeryName,
            ekip: team,
            pre_op_tani: preOpDiagnosis,
            post_op_tani: postOpDiagnosis,
            anestezi_tur: anesthesiaType,
            hastane_id: hastaneId,
            notlar: notes,
            patoloji: pathology,
            status: status,
            pre_op_checklist: preOpChecklist
        };

        try {
            if (selectedOpId) {
                await api.clinical.updateOperation(selectedOpId, payload);
                toast.success("Operasyon güncellendi.");
            } else {
                await api.clinical.createOperation(payload);
                toast.success("Operasyon kaydedildi.");
            }

            // Refresh List
            const ops = await api.clinical.getOperations(patientId);
            ops.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setPastOperations(ops);

        } catch (error) {
            console.error(error);
            toast.error("İşlem başarısız.");
        }
    };

    const confirmDelete = async () => {
        if (selectedOpId === null) return;

        try {
            await api.clinical.deleteOperation(selectedOpId);
            toast.success("Operasyon silindi.");
            setDeleteDialogOpen(false);

            // Refresh List & Reset Form
            const ops = await api.clinical.getOperations(patientId);
            ops.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setPastOperations(ops);
            handleNewOperation();

        } catch (error) {
            console.error(error);
            toast.error("Silme işlemi başarısız.");
        }
    };

    const handlePrint = () => {
        // Format Team for Print: "Cerrah Name, Anestezi Name..."
        let formattedTeam = team;
        if (team && teamDefinitions.length > 0) {
            const currentNames = team.split(',').map(t => t.trim()).filter(Boolean);
            const groupedArgs: Record<string, string[]> = {};

            // Group by Role
            currentNames.forEach(name => {
                const def = teamDefinitions.find((d: any) => d.name === name);
                const role = def ? def.role : 'Diğer';
                if (!groupedArgs[role]) groupedArgs[role] = [];
                groupedArgs[role].push(name);
            });

            // Reconstruct with specific order
            const order = ['Cerrah', 'Anestezi', 'Hemşire', 'Asistan'];
            const parts: string[] = [];

            order.forEach(role => {
                if (groupedArgs[role]) {
                    parts.push(`${role} ${groupedArgs[role].join(', ')}`);
                    delete groupedArgs[role];
                }
            });

            // Add remaining
            Object.keys(groupedArgs).forEach(role => {
                if (role !== 'Diğer') {
                    parts.push(`${role} ${groupedArgs[role].join(', ')}`);
                } else {
                    parts.push(groupedArgs[role].join(', '));
                }
            });

            if (parts.length > 0) formattedTeam = parts.join(', ');
        }

        const printData = {
            patient,
            operation: {
                tarih: format(date || new Date(), 'yyyy-MM-dd'),
                ameliyat: surgeryName,
                ekip: formattedTeam,
                pre_op_tani: preOpDiagnosis,
                post_op_tani: postOpDiagnosis,
                anestezi_tur: anesthesiaType,
                notlar: notes,
                patoloji: pathology
            }
        };
        localStorage.setItem('temp_print_operation', JSON.stringify(printData));
        window.open(`/print/operation/preview`, "_blank");
    };

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onSave: handleSave
    });

    // AI Scribe Integration
    const { latestResult, setLatestResult } = useAIScribeStore();

    useEffect(() => {
        if (latestResult) {
            // Apply AI clinical note to operation notes field
            if (latestResult.clinical_note) {
                setNotes(prev => {
                    const newNotes = prev ? prev + "\n\n" + latestResult.clinical_note : latestResult.clinical_note;
                    return newNotes || "";
                });
                toast.success("AI analizi ameliyat notuna eklendi.");
                setLatestResult(null);
            }
        }
    }, [latestResult, setLatestResult]);

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Left Side: Main Content */}
            <div className="flex-1 space-y-6">

                {/* Patient Header Card */}
                <PatientHeader patient={patient} moduleName="Operasyon & Cerrahi" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                        <Button
                            className={cn(
                                "h-8 font-bold gap-2 uppercase text-xs tracking-wide shadow-sm transition-all",
                                selectedOpId
                                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                            onClick={handleSave}
                        >
                            <Save className="h-3 w-3" />
                            {selectedOpId ? "GÜNCELLE" : "KAYDET"}
                        </Button>

                        <Button
                            variant="outline"
                            className="h-8 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={() => setTemplateDialogOpen(true)}
                        >
                            <Layout className="h-3 w-3" />
                            ŞABLON
                        </Button>

                        {selectedOpId && (
                            <Button
                                className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-3 w-3" />
                                SİL
                            </Button>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                        title="Yazdır"
                        onClick={handlePrint}
                    >
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>

                {/* Form Content */}
                <div className="space-y-6">
                    {/* Main Info Card */}
                    {/* Main Info Card (Compact) */}
                    {/* Row 1: Date and Surgery Name */}
                    <div className="rounded-xl border border-white bg-white shadow-sm p-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {/* Date: Col 3 */}
                            <div className="md:col-span-3 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TARİH</Label>
                                <DatePicker
                                    date={date ? format(date, 'yyyy-MM-dd') : ''}
                                    setDate={val => setDate(val ? parseISO(val) : undefined)}
                                    className="w-full h-8 bg-slate-50 border-slate-200 text-xs px-2"
                                />
                            </div>

                            {/* Surgery Name: Col 6 */}
                            <div className="md:col-span-6">
                                <SystemQueryCombobox
                                    label="AMELİYAT ADI"
                                    value={surgeryName}
                                    onChange={(val) => {
                                        setSurgeryName(val);
                                        // Auto-apply template if name matches
                                        const tpl = templates.find((t: { name: string, note: string }) => t.name.toLowerCase() === val.toLowerCase());
                                        if (tpl && !notes) {
                                            setNotes(tpl.note);
                                            toast.info("Şablon notu uygulandı.");
                                        }
                                    }}
                                    options={surgeryNames}
                                    placeholder="Seç veya yaz..."
                                    className="flex-col items-start gap-1 w-full"
                                    inputClassName="h-8 bg-slate-50 border-slate-200 font-medium text-xs"
                                />
                            </div>

                            {/* Anesthesia Type: Col 2 */}
                            <div className="md:col-span-2">
                                <SystemQueryCombobox
                                    label="ANESTEZİ TÜRÜ"
                                    value={anesthesiaType}
                                    onChange={setAnesthesiaType}
                                    options={anesthesiaDefinitions}
                                    placeholder="Seçiniz..."
                                    className="flex-col items-start gap-1 w-full"
                                    inputClassName="h-8 bg-slate-50 border-slate-200 font-medium text-xs text-purple-700"
                                />
                            </div>

                            {/* Hastane: Col 3 */}
                            <div className="md:col-span-3">
                                <SystemQueryCombobox
                                    label="HASTANE"
                                    value={hastaneId}
                                    onChange={setHastaneId}
                                    options={shardedHospitals.map(h => h.ad)}
                                    placeholder="Seçiniz..."
                                    className="flex-col items-start gap-1 w-full"
                                    inputClassName="h-8 bg-slate-50 border-slate-200 font-medium text-xs text-emerald-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Team, PreOp and PostOp */}
                    <div className="rounded-xl border border-white bg-white shadow-sm p-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {/* Team: Col 6 */}
                            <div className="md:col-span-6 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">EKİP</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="relative group cursor-pointer">
                                            <Input
                                                value={team}
                                                readOnly
                                                placeholder="Seçmek için tıklayın..."
                                                className="bg-slate-50 border-slate-200 h-8 text-xs cursor-pointer pr-8 truncate font-medium"
                                            />
                                            <Users className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <div className="p-2 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">EKİP ÜYESİ SEÇİN</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                                                onClick={() => setTeam("")}
                                            >TEMİZLE</Button>
                                        </div>
                                        <ScrollArea className="h-[300px]">
                                            <div className="p-2 space-y-4">
                                                {['Cerrah', 'Asistan', 'Hemşire', 'Anestezi'].map((role) => (
                                                    <div key={role} className="space-y-1">
                                                        <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 rounded">{role}</div>
                                                        <div className="space-y-0.5">
                                                            {teamDefinitions.filter((d: any) => d.role === role).map((member: any, idx: number) => {
                                                                const isSelected = team.split(',').map(m => m.trim()).includes(member.name);
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => handleToggleTeamMember(member.name)}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-all",
                                                                            isSelected
                                                                                ? "bg-blue-50 text-blue-700 font-bold shadow-sm"
                                                                                : "hover:bg-slate-50 text-slate-600"
                                                                        )}
                                                                    >
                                                                        <span>{member.name}</span>
                                                                        {isSelected && <Check className="h-3 w-3" />}
                                                                    </button>
                                                                );
                                                            })}
                                                            {teamDefinitions.filter((d: any) => d.role === role).length === 0 && (
                                                                <div className="px-2 py-1 text-[10px] text-slate-400 italic">Tanım bulunamadı</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                        <div className="p-2 border-t border-slate-50 bg-slate-50/50">
                                            <p className="text-[9px] text-slate-400 italic">Ayarlar &gt; Tanımlar &gt; Ameliyat Ekibi kısmından yeni isimler ekleyebilirsiniz.</p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* PreOp: Col 3 */}
                            <div className="md:col-span-3 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PRE-OP TANI</Label>
                                <Input
                                    value={preOpDiagnosis}
                                    onChange={(e) => setPreOpDiagnosis(e.target.value)}
                                    className="bg-slate-50 border-slate-200 h-8 text-xs"
                                />
                            </div>

                            {/* PostOp: Col 3 */}
                            <div className="md:col-span-3 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">POST-OP TANI</Label>
                                <Input
                                    value={postOpDiagnosis}
                                    onChange={(e) => setPostOpDiagnosis(e.target.value)}
                                    className="bg-slate-50 border-slate-200 h-8 text-xs"
                                />
                            </div>

                        </div>
                    </div>



                    {/* Operation Note */}
                    <div className="rounded-xl border border-white bg-white shadow-sm flex flex-col min-h-[300px]">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                            <Scissors className="h-4 w-4 text-blue-500" />
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">AMELİYAT NOTU</h3>
                        </div>
                        <div className="p-4 flex-1">
                            <Textarea
                                value={notes}
                                onChange={(e) => {
                                    setNotes(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                rows={16}
                                placeholder="Operasyon detayları..."
                                className="w-full border-0 resize-none focus-visible:ring-0 text-sm md:text-base text-slate-700 placeholder:text-slate-300 font-mono overflow-hidden min-h-[384px]"
                            />
                        </div>
                    </div>

                    {/* Pathology */}
                    <div className="rounded-xl border border-white bg-white shadow-sm flex flex-col min-h-[150px]">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                            <Activity className="h-4 w-4 text-pink-500" />
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">PATOLOJİ SONUCU</h3>
                        </div>
                        <div className="p-4 flex-1">
                            <Textarea
                                value={pathology}
                                onChange={(e) => setPathology(e.target.value)}
                                placeholder="Varsa patoloji sonucu..."
                                className="min-h-full border-0 resize-none focus-visible:ring-0 text-sm text-slate-600 placeholder:text-slate-300 bg-slate-50/30"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Right Side: Sidebar */}
            <div className="w-full lg:w-[240px] space-y-4 shrink-0">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg" onClick={handleNewOperation}>
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Operasyon
                </Button>

                <div className="rounded-xl border border-white bg-white shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)] sticky top-6">
                    <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">GEÇMİŞ OPERASYONLAR</h3>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-slate-50">
                            {pastOperations.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center text-slate-400">
                                    <Activity className="h-8 w-8 mb-2 opacity-20" />
                                    <span className="text-sm">Kayıt bulunamadı.</span>
                                </div>
                            ) : (
                                pastOperations.map((op) => (
                                    <button
                                        key={op.id}
                                        onClick={() => handleSelectOperation(op)}
                                        className={cn(
                                            "w-full flex items-start p-4 text-left transition-all hover:bg-slate-50 border-l-4 border-transparent group gap-4",
                                            selectedOpId === op.id
                                                ? "bg-blue-50/40 border-l-blue-500"
                                                : "border-l-transparent"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-xs font-bold whitespace-nowrap min-w-[70px]",
                                            selectedOpId === op.id ? "text-blue-700" : "text-slate-500"
                                        )}>
                                            {op.tarih ? format(parseISO(op.tarih), 'dd.MM.yyyy') : '-'}
                                        </span>
                                        <span className={cn(
                                            "text-xs line-clamp-2 font-medium capitalize",
                                            selectedOpId === op.id ? "text-slate-900" : "text-slate-700"
                                        )}>
                                            {(op.ameliyat || 'İsimsiz Ameliyat').toLowerCase()}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                    {/* Delete Dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Silmek istediğinize emin misiniz?</DialogTitle>
                                <DialogDescription>
                                    Bu operasyon kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                                <Button variant="destructive" onClick={confirmDelete}>Evet, Sil</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Template Selection Dialog */}
                    <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Ameliyat Notu Şablonları</DialogTitle>
                                <DialogDescription>
                                    Aşağıdaki listeden bir şablon seçerek ameliyat adını ve notunu doldurabilirsiniz.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Şablon ara (Ameliyat adı veya not içeriği)..."
                                    value={templateSearch}
                                    onChange={(e) => setTemplateSearch(e.target.value)}
                                    className="pl-10 h-10 bg-slate-50 border-slate-200"
                                />
                            </div>

                            <ScrollArea className="max-h-[400px] mt-4">
                                <div className="space-y-3 pr-4">
                                    {filteredTemplates.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">Aradığınız kriterlere uygun şablon bulunamadı.</p>
                                            {templates.length === 0 && (
                                                <p className="text-xs mt-1">Ayarlar &gt; Tanımlar &gt; Ameliyat Not Şablonları kısmından ekleyebilirsiniz.</p>
                                            )}
                                        </div>
                                    ) : (
                                        filteredTemplates.map((tpl: any, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => handleApplyTemplate(tpl)}
                                                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group relative"
                                            >
                                                <div className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                                                    {tpl.name}
                                                    <Check className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="text-xs text-slate-500 line-clamp-3 font-mono bg-slate-100/50 p-2 rounded-lg mt-2">
                                                    {tpl.note}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Kapat</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
