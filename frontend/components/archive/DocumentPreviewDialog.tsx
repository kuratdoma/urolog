import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    FileText, Download, ZoomIn, ZoomOut, Maximize2,
    ChevronLeft, ChevronRight, Plus, File as FileIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentItem {
    id: number;
    dosya_adi: string;
    dosya_tipi: string;
    dosya_yolu: string;
    tarih: string;
    kategori: string;
    aciklama: string;
    etiketler?: string;
}

interface DocumentPreviewDialogProps {
    isViewing: boolean;
    setIsViewing: (val: boolean) => void;
    title: string;
    fileUrl: string;
    selectedDocId: number | null;
    authToken: string | null;
    documents: DocumentItem[];
    selectedFiles: File[];
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    fitMode: "contain" | "cover" | "none";
    setFitMode: React.Dispatch<React.SetStateAction<"contain" | "cover" | "none">>;
    handleSelectDoc: (doc: any) => void;
}

export function DocumentPreviewDialog({
    isViewing,
    setIsViewing,
    title,
    fileUrl,
    selectedDocId,
    authToken,
    documents,
    selectedFiles,
    zoom,
    setZoom,
    fitMode,
    setFitMode,
    handleSelectDoc,
}: DocumentPreviewDialogProps) {
    const isPdf =
        (selectedFiles.length > 0 && selectedFiles[0].type === 'application/pdf') ||
        (fileUrl && fileUrl.toLowerCase().split('?')[0].split('#')[0].endsWith('.pdf')) ||
        (selectedDocId && (
            documents.find(d => d.id === selectedDocId)?.dosya_tipi?.toLowerCase().includes('pdf') ||
            documents.find(d => d.id === selectedDocId)?.dosya_adi?.toLowerCase().endsWith('.pdf')
        ));

    return (
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
                    {!isPdf && (
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
                    )}

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
    );
}
