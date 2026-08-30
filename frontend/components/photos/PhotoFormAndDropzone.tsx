import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    ZoomIn, Upload, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoFormAndDropzoneProps {
    title: string;
    setTitle: (val: string) => void;
    tags: string;
    setTags: (val: string) => void;
    stage: string;
    setStage: (val: string) => void;
    notes: string;
    setNotes: (val: string) => void;
    isDragging: boolean;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    previewUrls: string[];
    fileUrl: string;
    selectedFiles: File[];
    selectedPhotoId: string | null;
    authToken: string | null;
    handleRemoveFile: (idx: number) => void;
    openLightbox: (idx: number) => void;
    filteredPhotos: any[];
    setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
    setPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
}

export function PhotoFormAndDropzone({
    title,
    setTitle,
    tags,
    setTags,
    stage,
    setStage,
    notes,
    setNotes,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    previewUrls,
    fileUrl,
    selectedFiles,
    selectedPhotoId,
    authToken,
    handleRemoveFile,
    openLightbox,
    filteredPhotos,
    setSelectedFiles,
    setPreviewUrls,
}: PhotoFormAndDropzoneProps) {
    const stages = ["HPV", "Lezyon", "Per-op", "Radyoloji", "Diğer"];

    return (
        <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: '500px' }}>
            {/* Left Column - 30% - Form Fields */}
            <div className="w-full md:w-[30%] space-y-4 shrink-0">
                <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">FOTOĞRAF BAŞLIĞI</Label>
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Örn: Sol Böbrek Taşı"
                        className="bg-white font-extrabold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500 w-full"
                    />
                </div>

                <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">ETİKETLER</Label>
                    <Input
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="Örn: ameliyat, tümör, preop"
                        className="bg-white font-bold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">FOTOĞRAF KATEGORİ</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {stages.map((s) => (
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
                                                <img src={url} className="w-full h-full object-cover" alt="Preview" />
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
    );
}
