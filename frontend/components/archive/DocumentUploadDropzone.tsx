import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    File as FileIcon, Upload, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentUploadDropzoneProps {
    fileUrl: string;
    isPdf: boolean;
    title: string;
    isDragging: boolean;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setIsViewing: (val: boolean) => void;
}

export function DocumentUploadDropzone({
    fileUrl,
    isPdf,
    title,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    setIsViewing,
}: DocumentUploadDropzoneProps) {
    return (
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
                                onClick={() => setIsViewing(true)}
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
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                                        <Eye className="w-3.5 h-3.5" /> Büyütmek için tıklayın
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-bold text-xs"
                                    onClick={() => setIsViewing(true)}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    Görüntüle
                                </Button>
                                <input
                                    type="file"
                                    id="replace-file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <Label
                                    htmlFor="replace-file"
                                    className="cursor-pointer text-xs text-blue-600 hover:underline font-bold"
                                >
                                    Dosyayı Değiştir
                                </Label>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 text-sm">Dosyayı buraya sürükleyip bırakın</p>
                                <p className="text-xs text-slate-400 mt-1">veya bilgisayarınızdan seçin (PDF, JPG, PNG)</p>
                            </div>
                            <input
                                type="file"
                                id="body-file-upload"
                                className="hidden"
                                multiple
                                onChange={handleFileSelect}
                            />
                            <Label
                                htmlFor="body-file-upload"
                                className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-colors"
                            >
                                Dosya Seç
                            </Label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
