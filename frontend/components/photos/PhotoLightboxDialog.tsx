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
    X, Download, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Photo } from "@/lib/api";

interface PhotoLightboxDialogProps {
    isLightboxOpen: boolean;
    setIsLightboxOpen: (val: boolean) => void;
    filteredPhotos: Photo[];
    lightboxIndex: number;
    setLightboxIndex: (idx: number) => void;
    getPhotoUrl: (photo?: Photo) => string;
    handleDownload: (ids?: string[]) => void;
    prevPhoto: () => void;
    nextPhoto: () => void;
}

export function PhotoLightboxDialog({
    isLightboxOpen,
    setIsLightboxOpen,
    filteredPhotos,
    lightboxIndex,
    setLightboxIndex,
    getPhotoUrl,
    handleDownload,
    prevPhoto,
    nextPhoto,
}: PhotoLightboxDialogProps) {
    const currentPhoto = filteredPhotos[lightboxIndex];

    return (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
            <DialogContent className="max-w-screen-2xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-black/95 border-none flex flex-col items-center justify-center">
                <DialogHeader className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10 text-white flex flex-row items-center justify-between pointer-events-none">
                    <div className="pointer-events-auto">
                        <DialogTitle className="text-lg font-bold">
                            {currentPhoto?.etiketler || "Fotoğraf"}
                        </DialogTitle>
                        <p className="text-xs opacity-80">
                            {currentPhoto?.tarih ? format(parseISO(currentPhoto.tarih), 'dd MMMM yyyy', { locale: tr }) : ''} - {currentPhoto?.asama}
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
                    onClick={() => handleDownload(currentPhoto?.id ? [currentPhoto.id] : undefined)}
                    title="İndir"
                >
                    <Download className="w-6 h-6" />
                </Button>

                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img
                        src={getPhotoUrl(currentPhoto)}
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
            </DialogContent>
        </Dialog>
    );
}
