"use client";

import { IIEF_LABELS } from "@/components/examination/forms/iief/constants";
import { TrendingUp, Info, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LipusIIEFFormProps {
    formData: any;
    onOpenDialog: () => void;
}

export function LipusIIEFForm({ formData, onOpenDialog }: LipusIIEFFormProps) {
    
    const getScoreColor = (score: number) => {
        if (score >= 26) return "text-emerald-600 bg-emerald-50 border-emerald-100";
        if (score >= 22) return "text-teal-600 bg-teal-50 border-teal-100";
        if (score >= 17) return "text-amber-600 bg-amber-50 border-amber-100";
        if (score >= 11) return "text-orange-600 bg-orange-50 border-orange-100";
        if (score === 0 || score === null) return "text-slate-400 bg-slate-50 border-slate-100";
        return "text-rose-600 bg-rose-50 border-rose-100";
    };

    const getScoreLabel = (score: number) => {
        if (score === 0 || score === null) return "Henüz doldurulmadı";
        if (score >= 26) return "Erektil Fonksiyon Normal";
        if (score >= 22) return "Hafif Derece ED";
        if (score >= 17) return "Hafif-Orta Derece ED";
        if (score >= 11) return "Orta Derece ED";
        return "Ağır Derece ED";
    };

    const isFilled = formData.iief_s1 !== null && formData.iief_s1 !== undefined;

    return (
        <div className="space-y-4">
            <div className="relative overflow-hidden bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-sm group transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <TrendingUp className="w-24 h-24 text-indigo-900" />
                </div>
                
                <div className="relative z-10 text-center md:text-left">
                    <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">IIEF-EF Değerlendirmesi</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2 justify-center md:justify-start">
                        <Info className="w-3.5 h-3.5 text-indigo-500" /> {IIEF_LABELS.title} (6 Soru)
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                         <Button 
                            onClick={(e) => { e.preventDefault(); onOpenDialog(); }} 
                            variant={isFilled ? "outline" : "default"}
                            className={cn(
                                "h-9 font-bold text-xs uppercase gap-2 transition-all",
                                isFilled ? "border-indigo-200 text-indigo-700 hover:bg-indigo-50" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                            )}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            {isFilled ? "FORMU DÜZENLE" : "FORMU DOLDUR"}
                        </Button>
                    </div>
                </div>

                <div className={cn("relative z-10 mt-6 md:mt-0 flex items-center gap-4 px-8 py-4 rounded-3xl border transition-all duration-500 shadow-sm", getScoreColor(formData.iief_total || 0))}>
                    <div className="text-center">
                        <span className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5 whitespace-nowrap">TOPLAM SKOR</span>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-black leading-none">{formData.iief_total || 0}</span>
                            <span className="text-xs font-bold opacity-60">/30</span>
                        </div>
                        <div className="mt-1 text-[10px] font-bold opacity-80 uppercase tracking-tighter">
                            {getScoreLabel(formData.iief_total || 0)}
                        </div>
                    </div>
                </div>
            </div>

            {isFilled && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                        <div key={num} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-center">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Soru {num}</div>
                            <div className="text-sm font-black text-slate-700">{formData[`iief_s${num}`] ?? "-"}</div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="p-4 bg-slate-50/50 rounded-xl border border-dotted border-slate-200 italic text-[10px] text-slate-500 leading-relaxed text-center md:text-left">
                Değerlendirme (IIEF-EF): 26-30: Normal, 22-25: Hafif ED, 17-21: Hafif-Orta ED, 11-16: Orta ED, 0-10: Ağır ED.
            </div>
        </div>
    );
}

