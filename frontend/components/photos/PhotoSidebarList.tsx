import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search, RefreshCw, CheckSquare, Square, ZoomIn,
    Image as ImageIcon, List as ImageOff
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Photo } from "@/lib/api";

interface PhotoSidebarListProps {
    photos: Photo[];
    filteredPhotos: Photo[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedPhotoId: string | null;
    selectedPhotoIds: string[];
    patientId: string;
    handleSelectPhoto: (photo: Photo) => void;
    togglePhotoSelection: (id: string, e: React.MouseEvent) => void;
    selectAllPhotos: () => void;
    openLightbox: (idx: number) => void;
    getPhotoUrl: (photo?: Photo) => string;
    onRefresh: () => void;
}

export function PhotoSidebarList({
    photos,
    filteredPhotos,
    searchTerm,
    setSearchTerm,
    selectedPhotoId,
    selectedPhotoIds,
    patientId,
    handleSelectPhoto,
    togglePhotoSelection,
    selectAllPhotos,
    openLightbox,
    getPhotoUrl,
    onRefresh,
}: PhotoSidebarListProps) {
    return (
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
                        onClick={onRefresh}
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
                                            alt={photo.baslik || 'Fotoğraf'}
                                            onError={(e) => {
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
    );
}
