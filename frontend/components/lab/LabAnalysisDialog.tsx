"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, CheckCircle2, RefreshCw, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Types matching backend LabAnalysisResponse
interface LabResultItem {
    test_name: string;
    result_value: string;
    unit?: string;
    reference_range?: string;
    is_abnormal: boolean;
    category?: string;
    report_date?: string;
}

interface LabAnalysisResponse {
    patient_name?: string;
    report_date?: string;
    results: LabResultItem[];
    raw_text?: string;
    confidence_score: number;
}

interface LabAnalysisDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (results: LabResultItem[], date?: string) => void;
}

export function LabAnalysisDialog({ open, onOpenChange, onApply }: LabAnalysisDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<LabAnalysisResponse | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.[0]) {
            setFile(acceptedFiles[0]);
            setAnalysisResult(null); // Reset previous result
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp']
        },
        maxFiles: 1
    });

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Use the new API method
            const response = await api.clinical.analyzeLab(file);

            const data = response as LabAnalysisResponse;
            setAnalysisResult(data);

            // Auto-select all results initially
            if (data.results) {
                setSelectedItems(new Set(data.results.map((_, i) => i)));
            }

            toast.success("Analiz tamamlandı.");
        } catch (error) {
            console.error("Analysis failed", error);
            toast.error("Analiz sırasında hata oluştu.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setAnalysisResult(null);
        setSelectedItems(new Set());
    };

    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedItems(newSet);
    };

    const handleApply = () => {
        if (!analysisResult) return;

        const itemsToApply = analysisResult.results.filter((_, i) => selectedItems.has(i));
        if (itemsToApply.length === 0) {
            toast.warning("Lütfen aktarılacak sonuçları seçiniz.");
            return;
        }

        onApply(itemsToApply, analysisResult.report_date);
        onOpenChange(false);
        handleReset(); // Cleanup after apply
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b border-slate-100 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileText className="h-6 w-6 text-indigo-600" />
                        Akıllı Laboratuvar Analizi
                    </DialogTitle>
                    <DialogDescription>
                        PDF veya resim formatındaki laboratuvar sonuçlarını yükleyerek otomatik analiz edin.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 bg-slate-50/50">
                    {!analysisResult ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            {!file ? (
                                <div
                                    {...getRootProps()}
                                    className={cn(
                                        "w-full max-w-lg aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-white",
                                        isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    <div className="p-4 rounded-full bg-slate-100 mb-4">
                                        <Upload className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-700">Dosyayı buraya sürükleyin</p>
                                    <p className="text-sm text-slate-400 mt-2">veya seçmek için tıklayın (PDF, JPG, PNG)</p>
                                </div>
                            ) : (
                                <div className="w-full max-w-lg bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                                    <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="h-8 w-8 text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">{file.name}</h3>
                                    <p className="text-sm text-slate-400 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                                    <div className="flex gap-3 justify-center">
                                        <Button variant="outline" onClick={handleReset} disabled={isAnalyzing}>
                                            <X className="mr-2 h-4 w-4" /> İptal
                                        </Button>
                                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                                            {isAnalyzing ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analiz Ediliyor...</>
                                            ) : (
                                                <><Zap className="mr-2 h-4 w-4" /> Analiz Et</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex gap-6 overflow-hidden">
                            {/* Results Preview */}
                            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-700">Analiz Sonuçları</h4>
                                        <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                                            {analysisResult.report_date && <span>Tarih: {analysisResult.report_date}</span>}
                                            {analysisResult.patient_name && <span>Hasta: {analysisResult.patient_name}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-slate-500">{selectedItems.size} seçili</span>
                                        <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-slate-400 hover:text-slate-600">
                                            <RefreshCw className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                                            <tr className="text-xs font-semibold text-slate-500 border-b border-slate-200">
                                                <th className="p-3 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.size === analysisResult.results.length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedItems(new Set(analysisResult.results.map((_, i) => i)));
                                                            else setSelectedItems(new Set());
                                                        }}
                                                        className="rounded border-slate-300"
                                                    />
                                                </th>
                                                <th className="p-3">Tetkik</th>
                                                <th className="p-3">Sonuç</th>
                                                <th className="p-3">Birim</th>
                                                <th className="p-3">Referans</th>
                                                <th className="p-3 text-right">Tarih</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {analysisResult.results.map((item, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={cn(
                                                        "border-b border-slate-50 hover:bg-indigo-50/30 transition-colors cursor-pointer",
                                                        selectedItems.has(idx) ? "bg-indigo-50/10" : "opacity-60 grayscale"
                                                    )}
                                                    onClick={() => toggleSelection(idx)}
                                                >
                                                    <td className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.has(idx)}
                                                            readOnly
                                                            className="rounded border-slate-300 pointer-events-none"
                                                        />
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-700">{item.test_name}</td>
                                                    <td className={cn("p-3 font-bold", item.is_abnormal ? "text-red-600" : "text-slate-700")}>{item.result_value}</td>
                                                    <td className="p-3 text-slate-500 text-xs">{item.unit || '-'}</td>
                                                    <td className="p-3 text-slate-400 text-xs">{item.reference_range || '-'}</td>
                                                    <td className="p-3 text-slate-400 text-xs text-right whitespace-nowrap">{item.report_date || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-slate-100 bg-white">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button>
                    {analysisResult && (
                        <Button onClick={handleApply} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Seçilenleri Aktar ({selectedItems.size})
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
