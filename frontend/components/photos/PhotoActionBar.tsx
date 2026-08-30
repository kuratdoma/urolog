import React from 'react';
import {
    Plus, Save, Trash2, Download, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
import { cn } from "@/lib/utils";

interface PhotoActionBarProps {
    date: string;
    setDate: (date: string) => void;
    handleNewPhoto: () => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSave: () => void;
    handleDelete: () => void;
    handleDownload: () => void;
    selectedPhotoId: string | null;
    selectedPhotoIds: string[];
    isSaving: boolean;
}

export function PhotoActionBar({
    date,
    setDate,
    handleNewPhoto,
    handleFileSelect,
    handleSave,
    handleDelete,
    handleDownload,
    selectedPhotoId,
    selectedPhotoIds,
    isSaving,
}: PhotoActionBarProps) {
    return (
        <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {/* Giriş Tarihi */}
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
    );
}
