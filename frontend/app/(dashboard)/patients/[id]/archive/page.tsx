"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { usePatientStore } from "@/stores/patient-store";
import { api, Patient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
    FileText, Plus, Save, Trash2, Download,
    Search, FolderOpen, File as FileIcon, Archive, Eye, Upload,
    ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, CheckSquare, Square
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PatientHeader } from "@/components/clinical/patient-header";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";



interface Document {
    id: number;
    hasta_id: string;
    tarih: string;
    kategori: string;
    dosya_tipi: string;
    dosya_adi: string;
    dosya_yolu: string;
    aciklama: string;
    etiketler?: string;
    arsiv_no: string;
    created_at: string;
}

export default function DocumentArchivePage() {
    const params = useParams();
    const patientId = String(params.id);
    const { activePatient, setActivePatient } = usePatientStore();
    const { token: authToken } = useAuthStore();
    const [patient, setPatient] = useState<Patient | null>(null);

    // Data State
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<string>("Epikriz");
    const [title, setTitle] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [tags, setTags] = useState<string>("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [isViewing, setIsViewing] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [fitMode, setFitMode] = useState<"contain" | "cover" | "none">("contain");

    // Drag & Drop State
    const [isDragging, setIsDragging] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            if (selectedDocId) {
                // If updating, only take the first one
                const file = files[0];
                setSelectedFiles([file]);
                const url = URL.createObjectURL(file);
                setFileUrl(url);
                if (!title) setTitle(file.name);
                toast.success("Değiştirilecek dosya: " + file.name);
            } else {
                setSelectedFiles(prev => [...prev, ...files]);
                if (selectedFiles.length === 0 && files.length > 0) {
                    const url = URL.createObjectURL(files[0]);
                    setFileUrl(url);
                    if (!title) setTitle(files[0].name);
                }
                toast.success(`${files.length} dosya eklendi.`);
            }
        }
    };

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            if (!patientId) return;
            try {
                // Load Patient
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

                // Load Documents
                const data = (await api.documents.list(patientId)) as unknown as Document[];
                // Sort by date desc
                data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
                setDocuments(data);

                if (data.length > 0) {
                    // Pre-fill form with latest doc but DO NOT open viewer automatically
                    const doc = data[0];
                    setSelectedDocId(doc.id);
                    setDate(doc.tarih || new Date().toISOString().split('T')[0]);
                    setCategory(doc.kategori || "Epikriz");
                    setTitle(doc.dosya_adi || "");
                    setNotes(doc.aciklama || "");
                    setTags(doc.etiketler || "");
                    setFileUrl(doc.dosya_yolu || "");
                    setIsViewing(false); // Don't auto-open
                } else {
                    handleNewDoc();
                }
            } catch (error) {
                console.error(error);
                toast.error("Veriler yüklenirken hata oluştu.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [patientId]);

    const handleNewDoc = useCallback(() => {
        setSelectedDocId(null);
        setDate(new Date().toISOString().split('T')[0]);
        setCategory("Epikriz");
        setTitle("");
        setNotes("");
        setTags("");
        setFileUrl("");
        setSelectedFiles([]);
        toast.info("Yeni belge formu.");
    }, []);

    const handleSelectDoc = useCallback((doc: Document) => {
        setSelectedDocId(doc.id);
        setDate(doc.tarih || new Date().toISOString().split('T')[0]);
        setCategory(doc.kategori || "Epikriz");
        setTitle(doc.dosya_adi || "");
        setNotes(doc.aciklama || "");
        setTags(doc.etiketler || "");
        setFileUrl(doc.dosya_yolu || "");
        setSelectedFiles([]);
        setIsViewing(true);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            if (selectedDocId) {
                const file = files[0];
                setSelectedFiles([file]);
                const url = URL.createObjectURL(file);
                setFileUrl(url);
                if (!title) setTitle(file.name);
                toast.success("Değiştirilecek dosya: " + file.name);
            } else {
                setSelectedFiles(prev => [...prev, ...files]);
                if (selectedFiles.length === 0 && files.length > 0) {
                    const url = URL.createObjectURL(files[0]);
                    setFileUrl(url);
                    if (!title) setTitle(files[0].name);
                }
                toast.success(`${files.length} dosya eklendi.`);
            }
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            newFiles.splice(index, 1);
            if (newFiles.length === 0) {
                setFileUrl("");
                if (!selectedDocId) setTitle("");
            } else if (index === 0) {
                setFileUrl(URL.createObjectURL(newFiles[0]));
                if (!selectedDocId) setTitle(newFiles[0].name);
            }
            return newFiles;
        });
    };

    const handleSave = async () => {
        if (!title && selectedFiles.length === 0) {
            toast.error("Lütfen belge başlığı giriniz veya dosya yükleyiniz.");
            return;
        }

        try {
            if (selectedDocId) {
                // SINGLE UPDATE
                let finalFileUrl = fileUrl;
                let fileType = documents.find(d => d.id === selectedDocId)?.dosya_tipi || "PDF";

                if (selectedFiles.length > 0) {
                    const uploadResp = await api.documents.upload(selectedFiles[0]);
                    if (uploadResp.url) finalFileUrl = uploadResp.url;
                    fileType = selectedFiles[0].type;
                }

                await api.documents.update(selectedDocId, {
                    patient_id: patientId,
                    tarih: date,
                    kategori: category,
                    dosya_adi: title,
                    dosya_tipi: fileType,
                    dosya_yolu: finalFileUrl,
                    aciklama: notes,
                    etiketler: tags
                });
                toast.success("Belge güncellendi.");
            } else {
                // NEW RECORDS
                if (selectedFiles.length === 0) {
                    toast.error("Lütfen en az bir dosya seçin.");
                    return;
                }

                toast.info(`${selectedFiles.length} belge kaydediliyor...`);

                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const uploadResp = await api.documents.upload(file);

                    if (uploadResp.url) {
                        await api.documents.create({
                            hasta_id: patientId,
                            tarih: date,
                            kategori: category,
                            dosya_adi: selectedFiles.length === 1 ? title : file.name,
                            dosya_tipi: file.type,
                            dosya_yolu: uploadResp.url,
                            aciklama: notes,
                            etiketler: tags,
                            arsiv_no: `DOC-${Date.now()}-${i}`
                        });
                    }
                }
                toast.success(`${selectedFiles.length} belge başarıyla kaydedildi.`);
            }

            // Refresh
            const data = (await api.documents.list(patientId)) as unknown as Document[];
            data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setDocuments(data);
            setSelectedFiles([]);

            if (data.length > 0) handleSelectDoc(data[0]);

        } catch (error) {
            console.error(error);
            toast.error("Kaydetme başarısız.");
        }
    };

    const handleDelete = async () => {
        if (!selectedDocId) return;
        try {
            await api.documents.delete(selectedDocId);
            toast.success("Belge silindi.");

            const data = (await api.documents.list(patientId)) as unknown as Document[];
            data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setDocuments(data);

            if (data.length > 0) handleSelectDoc(data[0]);
            else handleNewDoc();
        } catch (error) {
            console.error(error);
            toast.error("Silme başarısız.");
        }
    };

    const handleDownload = async (ids?: number[]) => {
        const targetIds = ids || (selectedDocIds.length > 0 ? selectedDocIds : (selectedDocId ? [selectedDocId] : []));

        if (targetIds.length === 0) {
            toast.error("Lütfen önce indirilecek belgeleri seçin.");
            return;
        }

        if (targetIds.length === 1) {
            const id = targetIds[0];
            const doc = documents.find(d => d.id === id);
            const url = (doc && doc.dosya_yolu.startsWith("blob:"))
                ? doc.dosya_yolu
                : `/api/v1/documents/download/${id}?token=${authToken}&download=1`;

            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            if (doc && doc.dosya_yolu.startsWith("blob:")) {
                link.download = doc.dosya_adi || "belge";
            }
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Belge indiriliyor...");
        } else {
            // Multiple Download Logic
            toast.info(`${targetIds.length} belge hazırlanıyor...`);
            try {
                // In a real scenario, we might want to ZIP them on client or server.
                // For now, let's trigger sequential downloads or a backend ZIP endpoint if available.
                // Since we don't have a backend bulk download, we'll do sequential.
                for (const id of targetIds) {
                    const doc = documents.find(d => d.id === id);
                    if (!doc) continue;

                    const url = doc.dosya_yolu.startsWith("blob:")
                        ? doc.dosya_yolu
                        : `/api/v1/documents/download/${id}?token=${authToken}&download=1`;

                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', doc.dosya_adi || `belge_${id}`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    // Small delay to prevent browser blocking
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                toast.success("Tüm belgeler indirildi.");
            } catch (error) {
                console.error("Bulk download error:", error);
                toast.error("Toplu indirme sırasında bir hata oluştu.");
            }
        }
    };

    const toggleDocSelection = useCallback((id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const selectAllDocs = useCallback(() => {
        if (selectedDocIds.length === documents.length) {
            setSelectedDocIds([]);
        } else {
            setSelectedDocIds(documents.map(d => d.id));
        }
    }, [documents, selectedDocIds.length]);

    const isPdf = React.useMemo(() =>
        (selectedFiles.length > 0 && selectedFiles[0].type === 'application/pdf') ||
        (fileUrl && fileUrl.toLowerCase().split('?')[0].split('#')[0].endsWith('.pdf')) ||
        (selectedDocId && (
            documents.find(d => d.id === selectedDocId)?.dosya_tipi?.toLowerCase().includes('pdf') ||
            documents.find(d => d.id === selectedDocId)?.dosya_adi?.toLowerCase().endsWith('.pdf')
        )), [selectedFiles, fileUrl, selectedDocId, documents]
    );

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">

            {/* Left Side: Main Content */}
            <div className="flex-1 space-y-6">

                {/* Patient Header */}
                <PatientHeader patient={patient} moduleName="Belge Arşivi" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Giriş Tarihi - moved to top bar */}
                        <div className="flex items-center gap-1.5 px-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">TARİH</Label>
                            <DatePicker date={date} setDate={setDate} className="bg-white font-bold border-slate-200 h-8 shadow-sm focus:ring-emerald-500 w-[140px] text-xs" />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        <Button
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={handleNewDoc}
                        >
                            <Plus className="h-3 w-3" />
                            YENİ BELGE
                        </Button>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>

                        <input
                            type="file"
                            id="top-file-upload"
                            className="hidden"
                            multiple
                            onChange={handleFileSelect}
                        />
                        <Label
                            htmlFor="top-file-upload"
                            className="flex items-center gap-2 cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 h-8 rounded-md px-3 text-xs font-bold uppercase tracking-wide transition-colors shadow-sm"
                        >
                            <Upload className="w-3 h-3" />
                            YÜKLE
                        </Label>

                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <Button
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={handleSave}
                        >
                            <Save className="h-3 w-3" />
                            KAYDET
                        </Button>

                        {selectedDocId && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm">
                                        <Trash2 className="h-3 w-3" />
                                        SİL
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Belgeyi silmek istediğinize emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Bu işlem geri alınamaz. Bu belge kalıcı olarak silinecektir.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            className={cn(
                                "h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all",
                                selectedDocIds.length > 0 && "text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 w-auto px-3"
                            )}
                            title="İndir"
                            onClick={() => handleDownload()}
                            disabled={!selectedDocId && selectedDocIds.length === 0}
                        >
                            <Download className="h-4 w-4" />
                            {selectedDocIds.length > 0 && (
                                <span className="ml-2 text-[10px] font-bold">
                                    {selectedDocIds.length}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Two-Column Layout: Left 30% (Form Fields) | Right 70% (Upload Area) */}
                <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: '500px' }}>
                    {/* Left Column - 30% - Form Fields */}
                    <div className="w-full md:w-[30%] space-y-4 shrink-0">

                        {/* Belge Başlığı */}
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">BELGE BAŞLIĞI</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Örn: Patoloji Sonucu 2023"
                                className="bg-white font-extrabold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500 w-full"
                            />
                        </div>

                        {/* Etiketler */}
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">ETİKETLER</Label>
                            <Input
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                placeholder="Örn: MR, 2023, Ameliyat"
                                className="bg-white font-bold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500"
                            />
                        </div>

                        {/* Belge Kategori */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">BELGE KATEGORİSİ</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    "Epikriz",
                                    "Operasyon",
                                    "Patoloji",
                                    "Lab",
                                    "Radyoloji",
                                    "Onam",
                                    "Diğer"
                                ].map((cat) => (
                                    <Button
                                        key={cat}
                                        type="button"
                                        variant={category === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCategory(cat)}
                                        className={cn(
                                            "h-9 px-4 text-[11px] font-black uppercase tracking-wider transition-all border-2 rounded-lg w-full justify-start",
                                            category === cat
                                                ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-600 shadow-none"
                                                : "bg-white text-slate-500 border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/50"
                                        )}
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Açıklama / Notlar */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">AÇIKLAMA / NOTLAR</Label>
                            <Textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="min-h-[120px] bg-white border-slate-200 resize-none font-sans shadow-sm focus:ring-cyan-500"
                                placeholder="Belge ile ilgili detaylı notlar..."
                            />
                        </div>
                    </div>

                    {/* Right Column - 70% - Preview Area */}
                    <div className="w-full md:w-[70%] flex flex-col">
                        <div
                            className={cn(
                                "rounded-xl border-2 border-dashed bg-white shadow-sm flex-1 flex flex-col p-4 relative overflow-hidden group transition-colors",
                                isDragging ? "border-blue-500 bg-blue-50/10" : "border-slate-200"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                {fileUrl ? (
                                    <div className="flex flex-col items-center gap-6 w-full h-full">
                                        <div 
                                            className="w-full aspect-[4/3] rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-200 hover:bg-blue-50/10 transition-colors p-6 group relative overflow-hidden"
                                            onClick={() => {
                                                setIsViewing(true);
                                            }}
                                            title="Önizlemek için tıklayın"
                                        >
                                            {isPdf ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center">
                                                        <FileIcon className="w-10 h-10 text-red-500" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-600">{title || "PDF Belgesi"}</p>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <img src={fileUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="default"
                                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                                                onClick={() => {
                                                    setIsViewing(true);
                                                }}
                                            >
                                                <Eye className="w-4 h-4" />
                                                ÖNİZLEME
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="w-10 h-10 p-0 rounded-xl"
                                                onClick={() => {
                                                    const url = fileUrl.startsWith("blob:")
                                                        ? fileUrl
                                                        : (selectedDocId
                                                            ? `/api/v1/documents/download/${selectedDocId}?token=${authToken}&download=1`
                                                            : `/api/v1/documents/download-path?path=${encodeURIComponent(fileUrl)}&token=${authToken}&download=1`);
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.download = title || "belge";
                                                    link.click();
                                                }}
                                                title="İndir"
                                            >
                                                <Download className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pointer-events-none">
                                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                                            <Upload className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">
                                            BELGE YÜKLE
                                        </h3>
                                        <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                                            Dosyanızı buraya sürükleyip bırakın veya yukarıdaki "YÜKLE" butonu ile seçin.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Sidebar */}
            <aside className="w-full lg:w-[280px] h-[calc(100vh-100px)] sticky top-4 shrink-0 flex flex-col pb-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm shrink-0 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="Belge ara..." className="pl-9 bg-slate-50 border-slate-200" />
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={selectAllDocs}
                                className="text-slate-400 hover:text-blue-500 transition-colors"
                            >
                                {selectedDocIds.length === documents.length && documents.length > 0 ? (
                                    <CheckSquare className="w-4 h-4 text-blue-500" />
                                ) : (
                                    <Square className="w-4 h-4" />
                                )}
                            </button>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">ARŞİV LİSTESİ</h3>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{documents.length}</span>
                    </div>

                    <ScrollArea className="flex-1 w-full h-full">
                        <div className="p-2 space-y-1">
                            {documents.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                    <Archive className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-xs">Arşivde belge yok.</span>
                                </div>
                            ) : (
                                documents.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => handleSelectDoc(doc)}
                                        className={cn(
                                            "w-full flex items-start p-3 pl-2 text-left rounded-lg border group cursor-pointer transition-all relative hover:shadow-sm",
                                            selectedDocId === doc.id
                                                ? "bg-blue-50/40 border-blue-500 shadow-sm"
                                                : "hover:bg-slate-50 border-transparent hover:border-slate-100",
                                            selectedDocIds.includes(doc.id) && "bg-blue-50/20 border-blue-200"
                                        )}
                                    >
                                        <div
                                            className="mr-2 mt-1 z-10"
                                            onClick={(e) => toggleDocSelection(doc.id, e)}
                                        >
                                            {selectedDocIds.includes(doc.id) ? (
                                                <CheckSquare className="w-4 h-4 text-blue-500 transition-all scale-110" />
                                            ) : (
                                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-400 transition-all" />
                                            )}
                                        </div>
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0",
                                            doc.dosya_tipi === 'PDF' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                                        )}>
                                            <FileIcon className="w-4 h-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <h4 className={cn(
                                                    "text-xs font-bold truncate",
                                                    selectedDocId === doc.id ? "text-blue-700" : "text-slate-700"
                                                )}>
                                                    {doc.dosya_adi || 'İsimsiz Belge'}
                                                </h4>
                                                <span className="text-[9px] text-slate-400 shrink-0">
                                                    {doc.tarih ? format(parseISO(doc.tarih), 'dd.MM.yyyy') : '-'}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                                {doc.kategori && (
                                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                                        {doc.kategori}
                                                    </span>
                                                )}
                                                {doc.etiketler && (
                                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium border border-blue-100 truncate max-w-[100px]">
                                                        {doc.etiketler}
                                                    </span>
                                                )}
                                            </div>

                                            {doc.aciklama && (
                                                <p className="text-[10px] text-slate-400 truncate leading-relaxed pl-1 border-l-2 border-slate-100">
                                                    {doc.aciklama}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </aside>

            {/* Document Preview Modal */}
            <Dialog open={isViewing} onOpenChange={(open) => {
                setIsViewing(open);
                if (!open) {
                    setZoom(1);
                    setFitMode("contain");
                }
            }}>
                <DialogContent className="max-w-[70vw] w-[70vw] h-[95vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 shadow-2xl sm:max-w-none sm:w-[70vw]">
                    {/* Top Bar / Header */}
                    <DialogHeader className="p-2 px-4 bg-slate-900 text-white border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                                <FileText className="w-4 h-4" />
                            </div>
                            <DialogTitle className="text-sm font-bold truncate max-w-[200px] md:max-w-md">
                                {title || 'Belge Önizleme'}
                            </DialogTitle>
                        </div>

                        {/* Zoom Controls (Images Only) */}
                        {(() => {
                            const isPdf =
                                (selectedFiles.length > 0 && selectedFiles[0].type === 'application/pdf') ||
                                (fileUrl && fileUrl.toLowerCase().split('?')[0].split('#')[0].endsWith('.pdf')) ||
                                (selectedDocId && (
                                    documents.find(d => d.id === selectedDocId)?.dosya_tipi?.toLowerCase().includes('pdf') ||
                                    documents.find(d => d.id === selectedDocId)?.dosya_adi?.toLowerCase().endsWith('.pdf')
                                ));

                            return !isPdf && (
                                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                                        onClick={() => setZoom(prev => Math.max(0.2, prev - 0.2))}
                                        title="Küçült"
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                    </Button>
                                    <div className="px-2 text-[10px] font-mono font-bold text-slate-300 min-w-[50px] text-center">
                                        {Math.round(zoom * 100)}%
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                                        onClick={() => setZoom(prev => Math.min(5, prev + 0.2))}
                                        title="Büyüt"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </Button>
                                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 hover:bg-slate-700",
                                            fitMode === 'contain' ? "text-blue-400" : "text-slate-400 hover:text-white"
                                        )}
                                        onClick={() => {
                                            setZoom(1);
                                            setFitMode(prev => prev === 'contain' ? 'none' : 'contain');
                                        }}
                                        title="Genişliğe Sığdır"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            );
                        })()}

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                                onClick={() => {
                                    const url = fileUrl.startsWith("blob:")
                                        ? fileUrl
                                        : (selectedDocId
                                            ? `/api/v1/documents/download/${selectedDocId}?token=${authToken}&download=1`
                                            : `/api/v1/documents/download-path?path=${encodeURIComponent(fileUrl)}&token=${authToken}&download=1`);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = title || "belge";
                                    link.click();
                                }}
                                title="İndir"
                            >
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-red-500/20 p-0"
                                onClick={() => setIsViewing(false)}
                            >
                                <span className="sr-only">Kapat</span>
                                <Plus className="w-5 h-5 rotate-45" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Main Content (Preview) */}
                    <div className="flex-1 w-full bg-slate-900 relative overflow-hidden flex flex-col items-center p-0">
                        {fileUrl ? (
                            isPdf ? (
                                <iframe
                                    src={fileUrl.startsWith("blob:")
                                        ? `${fileUrl}#view=FitH`
                                        : (selectedDocId
                                            ? `/api/v1/documents/download/${selectedDocId}?token=${authToken}#view=FitH`
                                            : `/api/v1/documents/download-path?path=${encodeURIComponent(fileUrl)}&token=${authToken}#view=FitH`)}
                                    className="w-full h-full border-0 bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div
                                    className="w-full h-full overflow-auto flex items-start justify-center select-none p-4 md:p-8"
                                    onWheel={(e) => {
                                        if (e.ctrlKey) {
                                            e.preventDefault();
                                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                                            setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
                                        }
                                    }}
                                >
                                    <img
                                        src={fileUrl.startsWith("blob:")
                                            ? fileUrl
                                            : (selectedDocId
                                                ? `/api/v1/documents/download/${selectedDocId}?token=${authToken}`
                                                : `/api/v1/documents/download-path?path=${encodeURIComponent(fileUrl)}&token=${authToken}`)}
                                        alt="Document Preview"
                                        style={{
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'top center',
                                            transition: zoom === 1 ? 'all 0.2s ease-in-out' : 'none',
                                            width: (zoom === 1 || fitMode === 'contain') ? '100%' : 'auto',
                                            maxWidth: (zoom === 1 || fitMode === 'contain') ? '100%' : 'none'
                                        }}
                                        className={cn(
                                            "shadow-2xl rounded-sm pointer-events-none",
                                            (zoom === 1 || fitMode === 'contain') ? "h-auto" : ""
                                        )}
                                    />
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                                <FileIcon className="w-12 h-12 opacity-20" />
                                <p className="text-xs uppercase tracking-widest font-bold opacity-40">Dosya Bulunamadı</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom Bar: Mini Thumbnails Navigation */}
                    <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center px-4 gap-4 overflow-hidden shadow-inner">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0 border-r border-slate-800 pr-4 h-8 flex items-center">
                            DİĞER
                        </div>
                        <ScrollArea className="flex-1 w-full pb-3">
                            <div className="flex items-center gap-1 py-1">
                                {documents.map((doc) => {
                                    const isDocPdf = doc.dosya_tipi?.toLowerCase().includes('pdf') || doc.dosya_adi?.toLowerCase().endsWith('.pdf');
                                    const thumbUrl = doc.dosya_yolu.startsWith("blob:")
                                        ? doc.dosya_yolu
                                        : `/api/v1/documents/download/${doc.id}?token=${authToken}`;

                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleSelectDoc(doc)}
                                            className={cn(
                                                "relative h-10 w-10 min-w-[40px] rounded border transition-all cursor-pointer overflow-hidden group/thumb flex items-center justify-center",
                                                selectedDocId === doc.id
                                                    ? "border-blue-500 scale-110 shadow-lg shadow-blue-500/40 z-10 bg-blue-500/10"
                                                    : "border-slate-800 hover:border-slate-600 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 bg-slate-800"
                                            )}
                                        >
                                            {isDocPdf ? (
                                                <FileIcon className={cn(
                                                    "w-5 h-5",
                                                    selectedDocId === doc.id ? "text-blue-400" : "text-red-400"
                                                )} />
                                            ) : (
                                                <img
                                                    src={thumbUrl}
                                                    className="w-full h-full object-cover"
                                                    alt="thumb"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-transparent transition-colors"></div>
                                        </div>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                        <div className="flex gap-1 shrink-0 ml-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                onClick={() => {
                                    const idx = documents.findIndex(d => d.id === selectedDocId);
                                    if (idx > 0) handleSelectDoc(documents[idx - 1]);
                                }}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                onClick={() => {
                                    const idx = documents.findIndex(d => d.id === selectedDocId);
                                    if (idx < documents.length - 1) handleSelectDoc(documents[idx + 1]);
                                }}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
