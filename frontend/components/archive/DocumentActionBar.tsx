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

interface DocumentActionBarProps {
    date: string;
    setDate: (date: string) => void;
    handleNewDoc: () => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSave: () => void;
    handleDelete: () => void;
    handleDownload: () => void;
    selectedDocId: number | null;
    selectedDocIds: number[];
}

export function DocumentActionBar({
    date,
    setDate,
    handleNewDoc,
    handleFileSelect,
    handleSave,
    handleDelete,
    handleDownload,
    selectedDocId,
    selectedDocIds,
}: DocumentActionBarProps) {
    return (
        <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
    );
}
