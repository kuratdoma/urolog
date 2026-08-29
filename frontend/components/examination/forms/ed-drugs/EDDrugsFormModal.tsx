import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Pill, ChevronDown, ChevronRight, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { ED_DRUG_DATABASE } from "./constants";

interface EDDrugsFormModalProps {
    onExport: (text: string) => void;
    onDrugsSelected?: (drugs: string[]) => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const EDDrugsFormModal = ({ onExport, onDrugsSelected, isOpen, onOpenChange }: EDDrugsFormModalProps) => {
    const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    const toggleDrug = (drug: string) => {
        setSelectedDrugs(prev => prev.includes(drug) ? prev.filter(d => d !== drug) : [...prev, drug]);
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    const handleExport = () => {
        if (selectedDrugs.length === 0) {
            toast.error("İlaç seçilmedi.");
            return;
        }
        const text = `\nED Riski Taşıyan İlaç Kullanımı: ${selectedDrugs.join(", ")}.\n`;
        onExport(text);
        if (onDrugsSelected) {
            onDrugsSelected(selectedDrugs);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[500px] !w-[500px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
                <DialogHeader className="p-5 border-b border-slate-100 shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                            <Pill className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight">ED-Drugs</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Riskli İlaç Değerlendirme</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-4 overflow-y-auto" type="always">
                    <div className="space-y-3">
                        {ED_DRUG_DATABASE.map((cat) => (
                            <div key={cat.category} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white hover:border-slate-200 transition-all">
                                <button
                                    onClick={() => toggleCategory(cat.category)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 transition-colors text-left",
                                        cat.bg, expandedCategories.includes(cat.category) ? "border-b border-slate-100" : ""
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg bg-white shadow-sm border border-slate-100", cat.color)}>
                                            <cat.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{cat.category}</span>
                                    </div>
                                    {expandedCategories.includes(cat.category) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>

                                {expandedCategories.includes(cat.category) && (
                                    <div className="p-2 grid grid-cols-2 gap-1.5 animation-in slide-in-from-top-1 duration-200">
                                        {cat.drugs.map(drug => (
                                            <Popover key={drug.generic}>
                                                <PopoverTrigger asChild>
                                                    <div
                                                        onClick={() => toggleDrug(drug.generic)}
                                                        className={cn(
                                                            "relative flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer group",
                                                            selectedDrugs.includes(drug.generic)
                                                                ? "bg-blue-600 border-blue-600 text-white shadow-md z-10"
                                                                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            {selectedDrugs.includes(drug.generic) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                            <span className="text-[11px] font-bold truncate leading-tight">{drug.generic}</span>
                                                        </div>
                                                        <Info className={cn("w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity", selectedDrugs.includes(drug.generic) ? "text-white" : "text-slate-400")} />
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent side="top" className="p-2 w-auto bg-slate-900 border-0 text-white shadow-2xl rounded-lg">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">TİCARİ İSİMLER</span>
                                                        <span className="text-[11px] font-bold text-slate-50 leading-relaxed max-w-[200px]">{drug.brands}</span>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                    <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex-1">
                            {selectedDrugs.length > 0 && (
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                    {selectedDrugs.length} İlaç Seçildi
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9 px-6 font-bold text-slate-500">Kapat</Button>
                            <Button onClick={handleExport} className="h-9 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-100">Öyküye Aktar</Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
