"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, FileSignature, Save, Check, History, Printer } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
// Popover imports removed as we switched to absolute div for better focus management
// Command imports removed as we switched to a custom div list for focus stability

import { toast } from "sonner";
import { api } from "@/lib/api";

interface DrugItem {
    name: string;
    boxQty: string;
    dose: string;
    period: string;
    usage: string;
    description: string;
}

interface PrescriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient: any;
    doctors: any[];
    templates: any[];
    onCommit: (text: string) => void;
    onSaveTemplate: (name: string, drugs: any[]) => void;
    pastPrescriptions?: { date: string; content: string; doctorName?: string }[];
    initialDoctorName?: string;
}

export function PrescriptionDialog({
    open,
    onOpenChange,
    patient,
    doctors,
    templates,
    onCommit,
    onSaveTemplate,
    initialDoctorName,
    pastPrescriptions = []
}: PrescriptionDialogProps) {
    // Form State
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [drugList, setDrugList] = useState<DrugItem[]>([]);

    // Drug Input State
    const [currentDrug, setCurrentDrug] = useState<DrugItem>({
        name: "",
        boxQty: "1",
        dose: "1x1",
        period: "",
        usage: "Tok",
        description: ""
    });

    const [dose1, setDose1] = useState("1");
    const [dose2, setDose2] = useState("1");

    // Period helper state
    const [periodValue, setPeriodValue] = useState("1");
    const [periodUnit, setPeriodUnit] = useState("Gün");

    // Meta State
    const [prescriptionNote, setPrescriptionNote] = useState("");
    const [receteTarihi, setReceteTarihi] = useState(new Date().toISOString().split('T')[0]);

    // Template Saving State
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    // Drug Search
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredDrugs, setFilteredDrugs] = useState<any[]>([]);

    // Initialize doctor
    useEffect(() => {
        if (open && doctors.length > 0) {
            const currentUser = useAuthStore.getState().user;
            const fullName = currentUser?.full_name;

            // Try to find matching doctor by name or pick first
            let found = doctors.find(d => d.adSoyad === initialDoctorName);
            if (!found && fullName) {
                found = doctors.find(d => (d?.adSoyad || "").toLowerCase().includes(fullName.toLowerCase()));
            }
            if (!found && doctors.length > 0) found = doctors[0];

            if (found) setSelectedDoctorId(JSON.stringify(found)); // Use content as ID since no UUID
        }
    }, [open, doctors, initialDoctorName]);

    // Sync dose
    useEffect(() => {
        setCurrentDrug(prev => ({ ...prev, dose: `${dose1}x${dose2}` }));
    }, [dose1, dose2]);

    const handleAddDrug = () => {
        if (!currentDrug.name) {
            toast.error("İlaç adı girmelisiniz.");
            return;
        }

        const finalPeriod = `${periodValue} ${periodUnit}`;
        setDrugList([...drugList, { ...currentDrug, period: finalPeriod }]);

        // Reset inputs
        setCurrentDrug({
            name: "",
            boxQty: "1",
            dose: `${dose1}x${dose2}`,
            period: "",
            usage: "", // Usage removed from UI but kept in interface for compatibility
            description: ""
        });
        setDose1("1");
        setDose2("1");
        setPeriodValue("1");
    };

    const handleRemoveDrug = (index: number) => {
        setDrugList(drugList.filter((_, i) => i !== index));
    };

    const handleLoadTemplate = (templateId: string) => {
        // templateId is stringified index or content
        try {
            const template = templates[parseInt(templateId, 10)];
            if (template && template.drugs) {
                setDrugList(prev => [...prev, ...template.drugs]);
                toast.success(`${template.templateName} yüklendi.`);
            }
        } catch (e) { console.error(e); }
    };

    const handleComplete = () => {
        if (drugList.length === 0) {
            toast.error("İlaç listesi boş.");
            return;
        }

        // Save Template if requested
        if (saveAsTemplate && newTemplateName) {
            onSaveTemplate(newTemplateName, drugList);
        }

        // Generate Text for Muayene Form (ONLY Drug Names as requested)
        const commitText = drugList.map((drug, index) => `${index + 1}. ${drug.name.toUpperCase()}`).join("\n");

        onCommit(commitText);
        onOpenChange(false);

        // Cleanup
        setDrugList([]);
        setPrescriptionNote("");
        setSaveAsTemplate(false);
        setNewTemplateName("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-[80vw] h-[95vh] flex p-0 gap-0 overflow-hidden">
                {/* Left Side: Main Form */}
                <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
                    <DialogHeader className="p-6 pb-2 border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                            <FileSignature className="w-6 h-6 text-emerald-600" />
                            Reçete Hazırla
                        </DialogTitle>
                        <DialogDescription>
                            Hasta için e-Reçete formatında ilaç listesi oluşturun.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">

                        {/* Simplified Header: Date & Doctor & Patient Name Display */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-bold text-slate-500 whitespace-nowrap">HASTA</Label>
                                <div className="h-9 px-3 flex items-center bg-slate-100 border border-slate-200 rounded text-sm font-bold text-slate-700 min-w-[200px]">
                                    {patient.ad} {patient.soyad}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-bold text-slate-500 whitespace-nowrap">TARİH</Label>
                                <Input type="date" value={receteTarihi} onChange={e => setReceteTarihi(e.target.value)} className="h-9 w-40 bg-white border-slate-300" />
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <Label className="text-xs font-bold text-slate-500 whitespace-nowrap">DOKTOR</Label>
                                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                    <SelectTrigger className="h-9 bg-white border-slate-300 w-full max-w-sm font-bold">
                                        <SelectValue placeholder="Doktor Seçiniz" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {doctors.map((doc, idx) => (
                                            <SelectItem key={idx} value={JSON.stringify(doc)}>{doc.adSoyad}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* 2. İlaç Ekleme Formu */}
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> İlaç Ekle
                                </h4>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-slate-500">Şablon Yükle:</Label>
                                    <Select onValueChange={handleLoadTemplate}>
                                        <SelectTrigger className="h-7 w-[200px] text-xs bg-white">
                                            <SelectValue placeholder="Şablon Seç..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((t, idx) => (
                                                <SelectItem key={idx} value={idx.toString()}>
                                                    {t.templateName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-5">
                                {/* Row 1: Drug Name */}
                                <div className="space-y-1 relative">
                                    <Label className="text-sm font-bold text-emerald-800">İlaç Adı</Label>

                                    <div className="relative">
                                        <Input
                                            key="drug-name-input"
                                            value={currentDrug.name}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setCurrentDrug(prev => ({ ...prev, name: val }));
                                                if (val.length >= 1) {
                                                    api.system.get_drugs(val).then(filtered => {
                                                        const results = filtered || [];
                                                        setFilteredDrugs(results);
                                                        setShowSuggestions(results.length > 0);
                                                    }).catch(err => {
                                                        console.error("Drug search error", err);
                                                        setShowSuggestions(false);
                                                    });
                                                } else {
                                                    setShowSuggestions(false);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (currentDrug.name.length >= 1 && filteredDrugs.length > 0) {
                                                    setShowSuggestions(true);
                                                }
                                            }}
                                            placeholder="İlaç ismini giriniz (Min 2 harf)..."
                                            className="h-11 text-lg font-medium bg-white border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 shadow-sm relative z-[60]"
                                            autoComplete="off"
                                        />

                                        {showSuggestions && (
                                            <div className="absolute top-full left-0 mt-1 w-full max-h-[300px] overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-2xl z-[70] py-1 border-t-emerald-500 border-t-2">
                                                {filteredDrugs.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-slate-500 italic">Sonuç bulunamadı.</div>
                                                ) : (
                                                    filteredDrugs.map((drug, i) => (
                                                        <div
                                                            key={i}
                                                            onMouseDown={(e) => {
                                                                // Use onMouseDown + e.preventDefault() to select without losing focus from input
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setCurrentDrug(prev => ({ ...prev, name: drug.name }));
                                                                setShowSuggestions(false);
                                                            }}
                                                            className="flex flex-col px-4 py-3 cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-slate-700">{drug.name}</span>
                                                                {currentDrug.name === drug.name && <Check className="h-4 w-4 text-emerald-500" />}
                                                            </div>
                                                            {drug.barcode && <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{drug.barcode}</span>}
                                                            {drug.etkin_madde && <span className="text-[10px] text-emerald-600 truncate font-semibold">{drug.etkin_madde}</span>}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Row 2: Details */}
                                <div className="grid grid-cols-12 gap-4 items-end bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-xs font-bold uppercase text-slate-500 text-center w-full block">Doz (Sabah x Akşam)</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={dose1}
                                                onChange={e => setDose1(e.target.value)}
                                                className="h-10 text-center text-lg font-bold bg-white border-emerald-200"
                                            />
                                            <span className="text-sm font-bold text-slate-400">X</span>
                                            <Input
                                                value={dose2}
                                                onChange={e => setDose2(e.target.value)}
                                                className="h-10 text-center text-lg font-bold bg-white border-emerald-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <Label className="text-xs font-bold uppercase text-slate-500">Periyod</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={periodValue}
                                                onChange={e => setPeriodValue(e.target.value)}
                                                className="h-10 w-20 text-center font-bold bg-white border-emerald-200"
                                            />
                                            <Select value={periodUnit} onValueChange={setPeriodUnit}>
                                                <SelectTrigger className="h-10 flex-1 bg-white border-emerald-200 font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Gün">Gün</SelectItem>
                                                    <SelectItem value="Hafta">Hafta</SelectItem>
                                                    <SelectItem value="Ay">Ay</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs font-bold uppercase text-slate-500 text-center w-full block">Kutu</Label>
                                        <Input
                                            value={currentDrug.boxQty}
                                            onChange={e => setCurrentDrug({ ...currentDrug, boxQty: e.target.value })}
                                            className="h-10 text-center font-bold bg-white border-emerald-200"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Button onClick={handleAddDrug} className="h-10 w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 font-bold tracking-wide">
                                            EKLE
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <Input
                                        value={currentDrug.description}
                                        onChange={e => setCurrentDrug({ ...currentDrug, description: e.target.value })}
                                        placeholder="İlaç için özel açıklama (Opsiyonel)"
                                        className="h-10 text-xs bg-white/50 border-emerald-100 placeholder:text-emerald-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. İlaç Listesi */}
                        <div className="min-h-[200px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>İlaç Adı</TableHead>
                                        <TableHead className="text-center">Doz</TableHead>
                                        <TableHead>Periyod</TableHead>
                                        <TableHead className="text-center">Kutu</TableHead>
                                        <TableHead>Kullanım</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drugList.map((drug, index) => (
                                        <TableRow key={index} className="group hover:bg-slate-50">
                                            <TableCell className="font-mono text-slate-400 text-xs">{index + 1}</TableCell>
                                            <TableCell className="font-bold text-slate-700">{drug.name}</TableCell>
                                            <TableCell className="text-center font-mono bg-slate-50/50 rounded-lg mx-1">{drug.dose}</TableCell>
                                            <TableCell>{drug.period}</TableCell>
                                            <TableCell className="text-center font-mono">{drug.boxQty}</TableCell>
                                            <TableCell className="text-slate-600">{drug.usage}</TableCell>
                                            <TableCell className="text-xs text-slate-500 italic max-w-[200px] truncate">{drug.description}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveDrug(index)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {drugList.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-slate-300 italic">
                                                Listeye henüz ilaç eklenmedi.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* 4. Not ve Kaydetme */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="space-y-2">
                                <Label>Reçete Notu</Label>
                                <Textarea
                                    value={prescriptionNote}
                                    onChange={e => setPrescriptionNote(e.target.value)}
                                    placeholder="Reçete altına eklenecek genel notlar..."
                                    className="h-20"
                                />
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                <Checkbox
                                    id="saveTemplate"
                                    checked={saveAsTemplate}
                                    onCheckedChange={(c) => setSaveAsTemplate(!!c)}
                                />
                                <div className="flex-1 flex items-center gap-4">
                                    <Label htmlFor="saveTemplate" className="cursor-pointer text-slate-700 font-medium">Bu reçeteyi şablon olarak kaydet</Label>
                                    {saveAsTemplate && (
                                        <Input
                                            value={newTemplateName}
                                            onChange={e => setNewTemplateName(e.target.value)}
                                            placeholder="Şablon Adı (Örn: Standart Sistit Tedavisi)"
                                            className="h-8 max-w-[300px] bg-white"
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between sm:justify-between">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    const doctorObj = selectedDoctorId ? JSON.parse(selectedDoctorId) : {};
                                    const printData = {
                                        patient: patient,
                                        doctor: doctorObj,
                                        drugs: drugList,
                                        date: receteTarihi,
                                        note: prescriptionNote
                                    };
                                    localStorage.setItem("print_prescription_draft", JSON.stringify(printData));
                                    window.open("/print/prescription", "_blank");
                                }}
                                variant="outline"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Yazdır
                            </Button>
                            <Button onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                                <Save className="w-4 h-4 mr-2" />
                                Reçeteyi Tamamla ve Aktar
                            </Button>
                        </div>
                    </DialogFooter>
                </div>

                {/* Right Side: Past Prescriptions */}
                <div className="w-[400px] bg-slate-50/50 flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-white/50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-500" />
                            Geçmiş Reçeteler
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {pastPrescriptions && pastPrescriptions.length > 0 ? (
                            pastPrescriptions.map((rec, i) => (
                                <PastPrescriptionItem
                                    key={i}
                                    rec={rec}
                                    patient={patient}
                                    selectedDoctorId={selectedDoctorId}
                                    onLoadToForm={(date, content) => {
                                        // Set date
                                        setReceteTarihi(date);
                                        // Parse content and add to drugList
                                        // Content format: "1. İLAÇ ADI\n2. İLAÇ ADI\n..."
                                        const lines = content.split('\n').filter(l => l.trim());
                                        const parsedDrugs: DrugItem[] = lines.map(line => {
                                            // Remove numbering like "1. " or "- "
                                            const drugName = line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim();
                                            return {
                                                name: drugName,
                                                boxQty: "1",
                                                dose: "1x1",
                                                period: "1 Hafta",
                                                usage: "",
                                                description: ""
                                            };
                                        }).filter(d => d.name);

                                        if (parsedDrugs.length > 0) {
                                            setDrugList(parsedDrugs);
                                            toast.success(`${parsedDrugs.length} ilaç sisteme yüklendi.`);
                                        } else {
                                            // If parsing fails, just add as note
                                            setPrescriptionNote(content);
                                            toast.info("Reçete içeriği nota eklendi.");
                                        }
                                    }}
                                />
                            ))
                        ) : (
                            <div className="text-center text-slate-400 text-sm py-10">
                                Geçmiş reçete bulunamadı.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent >
        </Dialog >
    );
}

function PastPrescriptionItem({ rec, patient, selectedDoctorId, onLoadToForm }: {
    rec: any,
    patient: any,
    selectedDoctorId: string,
    onLoadToForm?: (date: string, content: string) => void
}) {
    const [overrideDate, setOverrideDate] = useState(rec.date.split('.').reverse().join('-'));

    return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-200 transition-colors group">
            <div className="flex items-center justify-between mb-2">
                <Input
                    type="date"
                    value={overrideDate}
                    onChange={e => setOverrideDate(e.target.value)}
                    className="h-6 w-28 text-[10px] bg-slate-50 border-none p-1 font-bold"
                />
                {rec.doctorName && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{rec.doctorName}</span>}
            </div>
            <div
                className="text-xs text-slate-600 font-mono whitespace-pre-wrap max-h-[100px] overflow-y-auto custom-scrollbar border-t border-slate-50 pt-2 cursor-pointer hover:bg-slate-50 rounded p-1 transition-colors"
                onClick={() => onLoadToForm?.(overrideDate, rec.content)}
                title="Tıklayarak sisteme aktar"
            >
                {rec.content}
            </div>
            <div className="flex gap-2 mt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-indigo-600 h-7 text-[10px] bg-indigo-50 hover:bg-indigo-100 font-bold"
                    onClick={() => onLoadToForm?.(overrideDate, rec.content)}
                >
                    <FileSignature className="w-3 h-3 mr-1" />
                    Sisteme Aktar
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 h-7 text-[10px] bg-emerald-50 hover:bg-emerald-100 px-3 flex items-center gap-1 font-bold"
                    onClick={() => {
                        const doctorObj = selectedDoctorId ? JSON.parse(selectedDoctorId) : {};
                        const printData = {
                            patient: patient,
                            doctor: doctorObj,
                            drugs: [],
                            content: rec.content,
                            date: overrideDate,
                            note: ""
                        };
                        localStorage.setItem("print_prescription_draft", JSON.stringify(printData));
                        window.open("/print/prescription", "_blank");
                    }}
                >
                    <Printer className="w-3 h-3" />
                    Yazdır
                </Button>
            </div>
        </div>
    );
}
