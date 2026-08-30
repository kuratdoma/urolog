"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { usePatientStore } from "@/stores/patient-store";
import { api, Photo, Patient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
    Image as ImageIcon, Plus, Save, Trash2, Download,
    ZoomIn, List as ImageOff, Upload,
    ChevronLeft, ChevronRight, X, CheckSquare, Square, Search, RefreshCw
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
// ... imports

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PatientHeader } from "@/components/clinical/patient-header";
import { toast } from "sonner";

export default function PhotoArchivePage() {
    // State Definitions
    const params = useParams();
    const patientId = String(params.id);
    const { activePatient, setActivePatient } = usePatientStore();
    const { token: authToken } = useAuthStore();
    const [patient, setPatient] = useState<Patient | null>(null);

    // Data State
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [stage, setStage] = useState<string>("HPV");
    const [title, setTitle] = useState<string>("");
    const [tags, setTags] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    // File State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [fileUrl, setFileUrl] = useState<string>(""); // For existing photo
    const [isDragging, setIsDragging] = useState(false);

    // Multi-Select State (New)
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

    // Lightbox State
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const filteredPhotos = useMemo(() => photos.filter(p =>
        (p.etiketler || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.asama || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.notlar || "").toLowerCase().includes(searchTerm.toLowerCase())
    ), [photos, searchTerm]);

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

                // Load Photos
                const data = await api.clinical.getPhotos(patientId);
                // Safe sort
                data.sort((a, b) => {
                    const d1 = a.tarih ? new Date(a.tarih).getTime() : 0;
                    const d2 = b.tarih ? new Date(b.tarih).getTime() : 0;
                    return d2 - d1;
                });
                setPhotos(data);

                if (data.length > 0) {
                    handleSelectPhoto(data[0]);
                } else {
                    handleNewPhoto();
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

    // Helpers
    const getPhotoUrl = useCallback((photo: Photo | null) => {
        if (!photo || !photo.dosya_yolu) return "";
        if (photo.dosya_yolu.startsWith("blob:") || photo.dosya_yolu.startsWith("http")) return photo.dosya_yolu;
        if (photo.id) {
            return `/api/v1/clinical/photos/${photo.id}/download?token=${authToken}`;
        }
        return `/api/v1/documents/download-path?path=${encodeURIComponent(photo.dosya_yolu)}&token=${authToken}`;
    }, [authToken]);

    // Actions
    // Actions
    const handleNewPhoto = useCallback(() => {
        setSelectedPhotoId(null);
        setDate(new Date().toISOString().split('T')[0]);
        setStage("HPV");
        setTitle("");
        setTags("");
        setNotes("");
        setFileUrl("");
        setSelectedFiles([]);
        setPreviewUrls([]);
        toast.info("Yeni fotoğraf formu.");
    }, []);

    const handleSelectPhoto = useCallback((photo: Photo) => {
        setSelectedPhotoId(photo.id);
        setDate(photo.tarih || new Date().toISOString().split('T')[0]);
        setStage(photo.asama || "Diğer");
        setTitle(photo.baslik || "");
        setTags(photo.etiketler || "");
        setNotes(photo.notlar || "");
        setFileUrl(photo.dosya_yolu || "");
        setSelectedFiles([]);
        setPreviewUrls([]);
    }, []);

    const togglePhotoSelection = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPhotoIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const selectAllPhotos = useCallback(() => {
        if (selectedPhotoIds.length === filteredPhotos.length) {
            setSelectedPhotoIds([]);
        } else {
            setSelectedPhotoIds(filteredPhotos.map(p => p.id));
        }
    }, [filteredPhotos, selectedPhotoIds.length]);

    // Drag & Drop
    // Drag & Drop
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

    const processFiles = useCallback((files: File[]) => {
        if (selectedPhotoId) {
            // Edit Mode - Single Replace
            const file = files[0];
            setSelectedFiles([file]);
            const url = URL.createObjectURL(file);
            setPreviewUrls([url]);
            setFileUrl(url);
            toast.success("Fotoğraf değiştirilecek: " + file.name);
        } else {
            // New Mode - Multiple Append
            setSelectedFiles(prev => [...prev, ...files]);
            const newUrls = files.map(f => URL.createObjectURL(f));
            setPreviewUrls(prev => [...prev, ...newUrls]);
            if (!title && files.length === 1) setTitle(files[0].name.split('.')[0]);
            toast.success(`${files.length} fotoğraf eklendi.`);
        }
    }, [selectedPhotoId, tags]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            processFiles(files);
        }
    }, [processFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
    }, [processFiles]);

    const handleRemoveFile = useCallback((index: number) => {
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            newFiles.splice(index, 1);
            return newFiles;
        });
        setPreviewUrls(prev => {
            const newUrls = [...prev];
            newUrls.splice(index, 1);
            return newUrls;
        });
    }, []);

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            if (selectedPhotoId) {
                // UPDATE SINGLE
                let finalFileUrl = fileUrl;
                if (selectedFiles.length > 0) {
                    const uploadResp = await api.documents.upload(selectedFiles[0]);
                    if (uploadResp.url) finalFileUrl = uploadResp.url;
                }

                await api.clinical.updatePhoto(selectedPhotoId, {
                    hasta_id: patientId,
                    tarih: date,
                    asama: stage,
                    baslik: title,
                    etiketler: tags,
                    notlar: notes,
                    dosya_yolu: finalFileUrl,
                    dosya_adi: selectedFiles.length > 0 ? selectedFiles[0].name : (tags || "image.jpg")
                });
                toast.success("Fotoğraf güncellendi.");
            } else {
                // CREATE NEW (MULTIPLE)
                if (selectedFiles.length === 0 && !fileUrl) {
                    toast.error("Lütfen en az bir fotoğraf seçin.");
                    setIsSaving(false);
                    return;
                }

                if (selectedFiles.length > 0) {
                    let successCount = 0;

                    for (const file of selectedFiles) {
                        try {
                            const uploadResp = await api.documents.upload(file);

                            if (uploadResp.url) {
                                await api.clinical.createPhoto({
                                    hasta_id: patientId,
                                    tarih: date,
                                    asama: stage,
                                    baslik: title || file.name.split('.')[0],
                                    etiketler: tags,
                                    notlar: notes,
                                    dosya_yolu: uploadResp.url,
                                    dosya_adi: file.name
                                });
                                successCount++;
                            } else {
                                toast.error(`Yükleme hatası: URL eksik (${file.name})`);
                            }
                        } catch (e) {
                            console.error("Upload failed for", file.name, e);
                            toast.error(`Yükleme başarısız: ${file.name}`);
                        }
                    }
                    if (successCount > 0) toast.success(`${successCount} fotoğraf kaydedildi.`);
                } else {
                    // Manual URL case
                    await api.clinical.createPhoto({
                        hasta_id: patientId,
                        tarih: date,
                        asama: stage,
                        baslik: title,
                        etiketler: tags,
                        notlar: notes,
                        dosya_yolu: fileUrl,
                        dosya_adi: "image.jpg"
                    });
                    toast.success("Fotoğraf kaydedildi.");
                }
            }

            // Refresh
            const data = await api.clinical.getPhotos(patientId);
            data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setPhotos(data);
            setSelectedFiles([]);
            setPreviewUrls([]);
            if (data.length > 0) handleSelectPhoto(data[0]);

        } catch (error) {
            console.error(error);
            toast.error("Kaydetme başarısız.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        const targetIds = selectedPhotoIds.length > 0 ? selectedPhotoIds : (selectedPhotoId ? [selectedPhotoId] : []);
        if (targetIds.length === 0) return;

        try {
            for (const id of targetIds) {
                await api.clinical.deletePhoto(id);
            }
            toast.success(`${targetIds.length} fotoğraf silindi.`);

            // Refresh
            const data = await api.clinical.getPhotos(patientId);
            data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setPhotos(data);
            setSelectedPhotoIds([]);

            if (data.length > 0) handleSelectPhoto(data[0]);
            else handleNewPhoto();

        } catch (error) {
            console.error(error);
            toast.error("Silme başarısız.");
        }
    };

    const handleDownload = async (ids?: string[]) => {
        const targetIds = ids || (selectedPhotoIds.length > 0 ? selectedPhotoIds : (selectedPhotoId ? [selectedPhotoId] : []));
        if (targetIds.length === 0) {
            toast.error("Lütfen önce indirilecek fotoğrafları seçin.");
            return;
        }

        toast.info(`${targetIds.length} fotoğraf indiriliyor...`);
        for (const id of targetIds) {
            const url = `/api/v1/clinical/photos/${id}/download?token=${authToken}&download=1`;
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    };

    // Lightbox Logic
    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
        setIsLightboxOpen(true);
    }, []);
    const nextPhoto = useCallback(() => { if (filteredPhotos.length) setLightboxIndex((prev) => (prev + 1) % filteredPhotos.length); }, [filteredPhotos.length]);
    const prevPhoto = useCallback(() => { if (filteredPhotos.length) setLightboxIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length); }, [filteredPhotos.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isLightboxOpen) return;
            if (e.key === "ArrowRight") nextPhoto();
            if (e.key === "ArrowLeft") prevPhoto();
            if (e.key === "Escape") setIsLightboxOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isLightboxOpen, filteredPhotos.length]);

    useKeyboardShortcuts({
        onSave: handleSave,
        onSearch: () => {
            const el = document.querySelector('input[placeholder="Fotoğraf ara..."]') as HTMLInputElement;
            if (el) el.focus();
        }
    });

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Left Side: Main Content */}
            <div className="flex-1 space-y-6">
                <PatientHeader patient={patient} moduleName="Fotoğraf Arşivi" />

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Giriş Tarihi - moved to action bar */}
                        <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">TARİH</Label>
                            <DatePicker date={date} setDate={setDate} className="bg-white font-bold border-slate-200 h-8 shadow-sm focus:ring-emerald-500 w-[140px] text-xs" />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <Button
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={handleNewPhoto}
                        >
                            <Plus className="h-3 w-3" />
                            YENİ FOTOĞRAF
                        </Button>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <input
                            type="file"
                            id="top-photo-upload"
                            className="hidden"
                            accept="image/*"
                            multiple={!selectedPhotoId}
                            onChange={handleFileSelect}
                        />
                        <Label
                            htmlFor="top-photo-upload"
                            className="flex items-center gap-2 cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 h-8 rounded-md px-3 text-xs font-bold uppercase tracking-wide transition-colors shadow-sm"
                        >
                            <Upload className="w-3 h-3" />
                            YÜKLE
                        </Label>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <Button
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm disabled:opacity-50"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <Save className="h-3 w-3" />
                            )}
                            {isSaving ? "KAYDEDİLİYOR..." : "KAYDET"}
                        </Button>

                        {(selectedPhotoId || selectedPhotoIds.length > 0) && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm">
                                        <Trash2 className="h-3 w-3" />
                                        SİL ({selectedPhotoIds.length || 1})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Seçili fotoğrafları silmek istediğinize emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        className={cn(
                            "h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all",
                            selectedPhotoIds.length > 0 && "text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 w-auto px-3"
                        )}
                        title="İndir"
                        onClick={() => handleDownload()}
                        disabled={!selectedPhotoId && selectedPhotoIds.length === 0}
                    >
                        <Download className="h-4 w-4" />
                        {selectedPhotoIds.length > 0 && <span className="ml-2 text-[10px] font-bold">{selectedPhotoIds.length}</span>}
                    </Button>
                </div>

                {/* Two-Column Layout: Left 30% (Form Fields) | Right 70% (Upload Area) */}
                <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: '500px' }}>
                    {/* Left Column - 30% - Form Fields */}
                    <div className="w-full md:w-[30%] space-y-4 shrink-0">
                        {/* Fotoğraf Başlığı */}
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">FOTOĞRAF BAŞLIĞI</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Örn: Sol Böbrek Taşı"
                                className="bg-white font-extrabold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500 w-full"
                            />
                        </div>

                        {/* Etiketler */}
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">ETİKETLER</Label>
                            <Input
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                placeholder="Örn: ameliyat, tümör, preop"
                                className="bg-white font-bold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500"
                            />
                        </div>

                        {/* Fotoğraf Kategori */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">FOTOĞRAF KATEGORİ</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {["HPV", "Lezyon", "Per-op", "Radyoloji", "Diğer"].map((s) => (
                                    <Button
                                        key={s}
                                        type="button"
                                        variant={stage === s ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setStage(s)}
                                        className={cn(
                                            "h-9 px-4 text-[11px] font-black uppercase tracking-wider transition-all border-2 rounded-lg w-full justify-start",
                                            stage === s
                                                ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-600 shadow-none"
                                                : "bg-white text-slate-500 border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/50"
                                        )}
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Notlar */}
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">NOTLAR</Label>
                            <Textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="min-h-[120px] bg-white border-slate-200 resize-none font-sans shadow-sm"
                                placeholder="Fotoğraf ile ilgili notlar..."
                            />
                        </div>
                    </div>

                    {/* Right Column - 70% - Upload / Preview Area */}
                    <div className="w-full md:w-[70%] flex flex-col">
                        <div
                            className={cn(
                                "rounded-xl border-2 border-dashed bg-white shadow-sm flex-1 flex flex-col p-4 relative overflow-hidden group transition-colors",
                                isDragging ? "border-blue-500 bg-blue-50/10" : "border-slate-300"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                {(previewUrls.length > 0 || fileUrl) ? (
                                    <div className="flex flex-col items-center gap-6 w-full h-full">
                                        <div className={cn(
                                            "flex-1 w-full bg-slate-50 rounded-xl border border-slate-200 mb-4 overflow-hidden p-4 relative",
                                            previewUrls.length > 1 ? "grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto content-start" : "flex items-center justify-center"
                                        )}>
                                            {previewUrls.length > 1 ? (
                                                previewUrls.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/20 shadow-sm group/item">
                                                        <img src={url} className="w-full h-full object-cover" />
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }}
                                                                className="bg-black/50 text-white rounded-full p-1 hover:bg-red-500"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                                                            {selectedFiles[idx]?.name}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <img
                                                    src={previewUrls[0] || (fileUrl.startsWith("blob:")
                                                        ? fileUrl
                                                        : (selectedPhotoId
                                                            ? `/api/v1/clinical/photos/${selectedPhotoId}/download?token=${authToken}`
                                                            : (fileUrl.startsWith("http") ? fileUrl : `/api/v1/documents/download-path?path=${encodeURIComponent(fileUrl)}&token=${authToken}`)))}
                                                    alt="Fotoğraf Önizleme"
                                                    className="max-w-full max-h-full object-contain shadow-sm cursor-zoom-in hover:scale-[1.01] transition-transform"
                                                    onClick={() => {
                                                        const idx = filteredPhotos.findIndex(p => p.id === selectedPhotoId);
                                                        if (idx !== -1) openLightbox(idx);
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {(previewUrls.length <= 1 && fileUrl && !previewUrls.length) && (
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="default"
                                                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => {
                                                        const idx = filteredPhotos.findIndex(p => p.id === selectedPhotoId);
                                                        if (idx !== -1) openLightbox(idx);
                                                    }}
                                                >
                                                    <ZoomIn className="w-4 h-4" />
                                                    TAM EKRAN
                                                </Button>
                                            </div>
                                        )}

                                        {selectedFiles.length > 0 && (
                                            <div className="w-full space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                                                    Yüklenecek Dosyalar ({selectedFiles.length})
                                                    <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => { setSelectedFiles([]); setPreviewUrls([]); }}>TÜMÜNÜ TEMİZLE</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="pointer-events-none">
                                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                                            <Upload className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">
                                            {selectedPhotoId ? "Fotoğrafı Değiştir" : "Çoklu Fotoğraf Yükle"}
                                        </h3>
                                        <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                                            Görsel dosyalarınızı buraya sürükleyip bırakın veya yukarıdaki &quot;YÜKLE&quot; butonu ile seçin.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Sidebar */}
            <aside className="w-full lg:w-[280px] h-[calc(100vh-64px)] sticky top-0 shrink-0 flex flex-col bg-white border-l border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            FOTOĞRAFLAR
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-slate-200 text-slate-500"
                            onClick={() => {
                                const load = async () => {
                                    try {
                                        toast.loading("Listeyi yenileniyor...", { id: "refresh-photos" });
                                        const data = await api.clinical.getPhotos(patientId);
                                        data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
                                        setPhotos(data);
                                        toast.success(`Yenilendi: ${data.length} fotoğraf`, { id: "refresh-photos" });
                                        console.log("Refreshed photos:", data);
                                    } catch (e) {
                                        toast.error("Yenileme hatası", { id: "refresh-photos" });
                                        console.error(e);
                                    }
                                };
                                load();
                            }}
                            title="Listeyi Yenile"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Fotoğraf ara..."
                            className="pl-9 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={selectAllPhotos}
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                        >
                            {selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-blue-500" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            TÜMÜNÜ SEÇ
                        </button>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{filteredPhotos.length}</span>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                        {filteredPhotos.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs">{searchTerm ? "Arama sonucu bulunamadı." : "Fotoğraf bulunamadı."}</span>
                            </div>
                        ) : (
                            filteredPhotos.map((photo, idx) => (
                                <div
                                    key={photo.id}
                                    onClick={() => handleSelectPhoto(photo)}
                                    className={cn(
                                        "w-full flex items-start p-3 text-left rounded-lg border group cursor-pointer relative overflow-hidden transition-all hover:shadow-md",
                                        selectedPhotoId === photo.id
                                            ? "bg-blue-50 border-blue-500 shadow-sm"
                                            : "bg-white border-slate-100 hover:border-blue-200",
                                        selectedPhotoIds.includes(photo.id) && "bg-blue-50/50 ring-1 ring-blue-200"
                                    )}
                                >
                                    <div
                                        className="mr-3 mt-1 shrink-0"
                                        onClick={(e) => togglePhotoSelection(photo.id, e)}
                                    >
                                        {selectedPhotoIds.includes(photo.id) ? (
                                            <CheckSquare className="w-4 h-4 text-blue-500 transition-all scale-110" />
                                        ) : (
                                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-400 transition-all" />
                                        )}
                                    </div>

                                    <div
                                        className="mr-3 w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-sm relative group/thumb"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openLightbox(idx);
                                        }}
                                    >
                                        {photo.dosya_yolu ? (
                                            <img
                                                src={getPhotoUrl(photo)}
                                                className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // Fallback for broken images
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-[10px] text-slate-400">ERR</span>';
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400"><ImageIcon className="w-6 h-6" /></div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                            <ZoomIn className="w-5 h-5 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                                <span className={cn(
                                                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase truncate max-w-[100px]",
                                                    (photo.asama || '') === 'HPV' ? "bg-purple-100 text-purple-700" :
                                                        (photo.asama || '') === 'Lezyon' ? "bg-rose-100 text-rose-700" :
                                                            (photo.asama || '') === 'Per-op' ? "bg-orange-100 text-orange-700" :
                                                                ((photo.asama || '') === 'Radyoloji' || (photo.asama || '') === 'Radyo.') ? "bg-blue-100 text-blue-700" :
                                                                    "bg-slate-100 text-slate-700"
                                                )}>
                                                    {(photo.asama || 'Diğer').split(' ')[0]}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {photo.tarih ? format(parseISO(photo.tarih), 'dd.MM.yy') : ''}
                                                </span>
                                            </div>
                                            <h4 className={cn(
                                                "text-xs font-bold truncate leading-tight",
                                                selectedPhotoId === photo.id ? "text-blue-700" : "text-slate-700"
                                            )}>{photo.baslik || photo.etiketler || 'Başlıksız'}</h4>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="p-2 border-t bg-slate-50 text-[10px] text-center text-slate-400 flex flex-col gap-0.5">
                    <span>Toplam {filteredPhotos.length} fotoğraf</span>
                    <span className="opacity-50 text-[9px] font-mono">PID: {patientId?.substring(0, 8)}... / Raw: {photos.length}</span>
                </div>
            </aside>

            {/* Lightbox Modal */}
            <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
                <DialogContent className="max-w-screen-2xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-black/95 border-none flex flex-col items-center justify-center">
                    <DialogHeader className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10 text-white flex flex-row items-center justify-between pointer-events-none">
                        <div className="pointer-events-auto">
                            <DialogTitle className="text-lg font-bold">
                                {filteredPhotos[lightboxIndex]?.etiketler || "Fotoğraf"}
                            </DialogTitle>
                            <p className="text-xs opacity-80">
                                {filteredPhotos[lightboxIndex]?.tarih ? format(parseISO(filteredPhotos[lightboxIndex].tarih), 'dd MMMM yyyy', { locale: tr }) : ''} - {filteredPhotos[lightboxIndex]?.asama}
                            </p>
                        </div>
                    </DialogHeader>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4 text-white hover:bg-white/20 z-20 pointer-events-auto"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        <X className="w-6 h-6" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-16 top-4 text-white hover:bg-white/20 z-20 pointer-events-auto"
                        onClick={() => handleDownload(filteredPhotos[lightboxIndex]?.id ? [filteredPhotos[lightboxIndex].id!] : undefined)}
                        title="İndir"
                    >
                        <Download className="w-6 h-6" />
                    </Button>

                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img
                            src={getPhotoUrl(filteredPhotos[lightboxIndex])}
                            alt="Full View"
                            className="max-w-full max-h-full object-contain animate-in fade-in zoom-in duration-300"
                        />
                    </div>

                    {/* Navigation Gallery at the bottom */}
                    <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 z-20 pointer-events-none">
                        <div className="flex items-center justify-center gap-6 pointer-events-auto">
                            <Button
                                variant="secondary"
                                size="icon"
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xl backdrop-blur-md shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    prevPhoto();
                                }}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>

                            <div className="px-4 py-1 bg-black/40 backdrop-blur-md rounded-full text-white text-[10px] font-bold border border-white/10 tracking-widest uppercase">
                                {lightboxIndex + 1} / {filteredPhotos.length}
                            </div>

                            <Button
                                variant="secondary"
                                size="icon"
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xl backdrop-blur-md shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    nextPhoto();
                                }}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </Button>
                        </div>

                        {/* Thumbnail Scroll Area */}
                        <div className="w-full max-w-4xl px-8 pointer-events-auto">
                            <ScrollArea className="w-full whitespace-nowrap bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl">
                                <div className="flex gap-2">
                                    {filteredPhotos.map((photo, idx) => (
                                        <div
                                            key={photo.id}
                                            onClick={() => setLightboxIndex(idx)}
                                            className={cn(
                                                "relative h-14 w-14 min-w-[56px] rounded-lg border-2 transition-all cursor-pointer overflow-hidden group/thumb",
                                                lightboxIndex === idx
                                                    ? "border-blue-500 scale-110 shadow-lg shadow-blue-500/20 z-10"
                                                    : "border-transparent opacity-40 hover:opacity-100 hover:border-white/20"
                                            )}
                                        >
                                            <img
                                                src={getPhotoUrl(photo)}
                                                className="w-full h-full object-cover"
                                                alt={`thumb-${idx}`}
                                            />
                                            {lightboxIndex === idx && (
                                                <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <ScrollBar orientation="horizontal" className="bg-white/10" />
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Keyboard Support */}
                    <div className="hidden">
                        <button onClick={prevPhoto} accessKey="," />
                        <button onClick={nextPhoto} accessKey="." />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
