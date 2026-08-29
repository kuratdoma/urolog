import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabUroflowmetriCreate } from "@/lib/api/types";
import { LabInput } from "../LabInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UroflowmetriSectionProps {
    values: Partial<LabUroflowmetriCreate>;
    onChange: (values: Partial<LabUroflowmetriCreate>) => void;
    onFileChange: (file: File | null) => void;
    historyData: any[];
    sortConfig: any;
    onToggleSort: (key: string) => void;
    selectedHistoryIds: number[];
    onToggleHistorySelection: (id: number) => void;
    onToggleSelectAllHistory: () => void;
    patientId?: string;
}

export const UroflowmetriSection = React.memo(({ values, onChange, onFileChange, historyData, sortConfig, onToggleSort, selectedHistoryIds, onToggleHistorySelection, onToggleSelectAllHistory, patientId }: UroflowmetriSectionProps) => {
    const [localComment, setLocalComment] = useState(values.comment || '');
    useEffect(() => { setLocalComment(values.comment || ''); }, [values.comment]);

    return (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-xl border-t-4 border-t-cyan-500 shadow-sm p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Üroflowmetri Analizi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <LabInput label="QMax" unit="ml/s" value={values.qmax} onFieldChange={(v: string) => onChange({ ...values, qmax: v as any })} />
                    <LabInput label="Ortalama" unit="ml/s" value={values.average_flow} onFieldChange={(v: string) => onChange({ ...values, average_flow: v as any })} />
                    <LabInput label="Hacim" unit="ml" value={values.volume} onFieldChange={(v: string) => onChange({ ...values, volume: v as any })} />
                    <LabInput label="Rezidüel" unit="ml" value={values.residual_urine} onFieldChange={(v: string) => onChange({ ...values, residual_urine: v as any })} />
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Yorum</Label>
                        <Textarea
                            value={localComment}
                            onChange={e => setLocalComment(e.target.value)}
                            onBlur={() => onChange({ ...values, comment: localComment })}
                            className="h-[80px] text-xs bg-slate-50 border-slate-200 resize-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">PDF Sonuç Yükle</Label>
                        <Input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                            className="text-xs bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-6">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                    <span>Geçmiş Üroflowmetri Sonuçları</span>
                    {patientId && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 text-xs text-slate-500 hover:text-blue-600"
                            onClick={() => {
                                const ids = selectedHistoryIds.length > 0
                                    ? selectedHistoryIds
                                    : historyData.map((l: any) => l.id);
                                window.open(`/print/lab/uroflowmetri?patientId=${patientId}&ids=${ids.join(',')}`, '_blank');
                            }}
                        >
                            <Printer className="h-3.5 w-3.5" />
                            {selectedHistoryIds.length > 0 ? `${selectedHistoryIds.length} Kaydı Yazdır` : 'Tümünü Yazdır'}
                        </Button>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="py-2 px-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={historyData.length > 0 && historyData.every((l: any) => selectedHistoryIds.includes(l.id))}
                                        onChange={onToggleSelectAllHistory}
                                    />
                                </th>
                                <th className="py-2 px-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onToggleSort('tarih')}>
                                    <div className="flex items-center gap-1">
                                        Tarih
                                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'tarih' ? "text-blue-600" : "text-slate-300")} />
                                    </div>
                                </th>
                                <th className="py-2 px-4">Sonuç</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {historyData.map((lab: any) => (
                                <tr key={lab.id} className={cn("border-b border-slate-50 transition-all", selectedHistoryIds.includes(lab.id) ? "bg-blue-50/50" : "hover:bg-slate-50")}>
                                    <td className="py-2 px-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedHistoryIds.includes(lab.id)}
                                            onChange={() => onToggleHistorySelection(lab.id)}
                                        />
                                    </td>
                                    <td className="py-2 px-4 font-mono text-slate-500">{lab.tarih ? format(parseISO(lab.tarih), 'dd.MM.yyyy') : '-'}</td>
                                    <td className="py-2 px-4 font-bold text-blue-600 font-mono whitespace-pre-wrap leading-relaxed">
                                        {lab.sonuc ? String(lab.sonuc).replace(/\n+/g, '   ') : '-'}
                                    </td>
                                </tr>
                            ))}
                            {historyData.length === 0 && (
                                <tr><td colSpan={3} className="p-4 text-center text-slate-400">Kayıt yok.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

UroflowmetriSection.displayName = 'UroflowmetriSection';
