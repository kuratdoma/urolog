"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, FlaskConical, Loader2, Calendar, ScanLine, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { normalizeTurkish, formatLabDecimal, formatRefRange } from "@/lib/lab-utils";

interface ExaminationPrintDialogProps {
    isOpen: boolean;
    onClose: () => void;
    examId: string;
    patientId: string;
    patientName?: string;
    examDate?: string;
}

export function ExaminationPrintDialog({
    isOpen,
    onClose,
    examId,
    patientId,
    patientName,
    examDate
}: ExaminationPrintDialogProps) {
    const [labs, setLabs] = useState<any[]>([]);
    const [imagings, setImagings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [includeLabs, setIncludeLabs] = useState(true);
    const [selectedLabIds, setSelectedLabIds] = useState<string[]>([]);
    const [onlyPsa, setOnlyPsa] = useState(false);
    const [onlyKreatinin, setOnlyKreatinin] = useState(false);
    const [expandedDates, setExpandedDates] = useState<string[]>([]);

    const [includeImaging, setIncludeImaging] = useState(true);
    const [selectedImagingIds, setSelectedImagingIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen || !patientId) return;

        setOnlyPsa(false);
        setOnlyKreatinin(false);
        setExpandedDates([]);

        const fetchData = async () => {
            setLoading(true);
            try {
                const [labsData, imagingsData] = await Promise.all([
                    api.clinical.getLabs(patientId, "all").catch(() => []),
                    api.clinical.getImagings(patientId).catch(() => [])
                ]);

                const sortedLabs = (labsData || []).sort((a: any, b: any) => 
                    new Date(b.tarih || 0).getTime() - new Date(a.tarih || 0).getTime()
                );
                const sortedImagings = (imagingsData || []).sort((a: any, b: any) => 
                    new Date(b.tarih || 0).getTime() - new Date(a.tarih || 0).getTime()
                );

                setLabs(sortedLabs);
                setImagings(sortedImagings);

                // Default: select all labs and imagings
                setSelectedLabIds(sortedLabs.map((l: any) => l.id));
                setSelectedImagingIds(sortedImagings.map((i: any) => i.id));
            } catch (err) {
                console.error("Print dialog fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, patientId]);

    const isPsaTest = (l: any) => {
        const name = normalizeTurkish((l.tetkik_adi || l.test_adi || "").toLowerCase());
        return name.includes('psa') || name.includes('prostat');
    };

    const isKreatininTest = (l: any) => {
        const name = normalizeTurkish((l.tetkik_adi || l.test_adi || "").toLowerCase());
        return name.includes('kreatinin') || name.includes('creatinine') || name.includes('crea');
    };

    const applySpecificFilters = (psaActive: boolean, kreatininActive: boolean) => {
        if (!psaActive && !kreatininActive) {
            setSelectedLabIds(labs.map((l: any) => l.id));
            return;
        }

        const filteredIds = labs
            .filter((l: any) => {
                const isPsa = isPsaTest(l);
                const isKreat = isKreatininTest(l);
                if (psaActive && isPsa) return true;
                if (kreatininActive && isKreat) return true;
                return false;
            })
            .map((l: any) => l.id);

        setSelectedLabIds(filteredIds);
    };

    const togglePsaFilter = (checked: boolean) => {
        setOnlyPsa(checked);
        applySpecificFilters(checked, onlyKreatinin);
    };

    const toggleKreatininFilter = (checked: boolean) => {
        setOnlyKreatinin(checked);
        applySpecificFilters(onlyPsa, checked);
    };

    const toggleExpandDate = (dateStr: string) => {
        setExpandedDates(prev =>
            prev.includes(dateStr)
                ? prev.filter(d => d !== dateStr)
                : [...prev, dateStr]
        );
    };

    // Group labs by Date (YYYY-MM-DD)
    const groupedLabs = useMemo(() => {
        const map = new Map<string, any[]>();
        labs.forEach((lab: any) => {
            const rawDate = lab.tarih ? lab.tarih.split("T")[0] : "Tarihsiz";
            if (!map.has(rawDate)) {
                map.set(rawDate, []);
            }
            map.get(rawDate)!.push(lab);
        });

        return Array.from(map.entries()).map(([dateStr, items]) => {
            let formatted = "Tarihsiz";
            if (dateStr !== "Tarihsiz") {
                try {
                    formatted = format(parseISO(dateStr), "dd MMMM yyyy", { locale: tr });
                } catch {
                    formatted = dateStr;
                }
            }
            return {
                dateStr,
                formattedDate: formatted,
                items
            };
        });
    }, [labs]);

    const toggleSelectAllLabs = () => {
        setOnlyPsa(false);
        setOnlyKreatinin(false);
        if (selectedLabIds.length === labs.length) {
            setSelectedLabIds([]);
        } else {
            setSelectedLabIds(labs.map((l: any) => l.id));
        }
    };

    const toggleSelectAllImagings = () => {
        if (selectedImagingIds.length === imagings.length) {
            setSelectedImagingIds([]);
        } else {
            setSelectedImagingIds(imagings.map((i: any) => i.id));
        }
    };

    const toggleDateGroupLabs = (items: any[]) => {
        const groupIds = items.map((i: any) => i.id);
        const isGroupAllSelected = groupIds.every((id: string) => selectedLabIds.includes(id));

        if (isGroupAllSelected) {
            setSelectedLabIds(prev => prev.filter(id => !groupIds.includes(id)));
        } else {
            setSelectedLabIds(prev => Array.from(new Set([...prev, ...groupIds])));
        }
    };

    const filterLabsByDays = (days: number) => {
        const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
        const filteredIds = labs
            .filter((l: any) => l.tarih && new Date(l.tarih).getTime() >= cutoff)
            .map((l: any) => l.id);
        setSelectedLabIds(filteredIds);
    };

    const handleLabCheck = (id: string) => {
        setSelectedLabIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleImagingCheck = (id: string) => {
        setSelectedImagingIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handlePrint = () => {
        const queryParams = new URLSearchParams();

        if (includeLabs && selectedLabIds.length > 0) {
            queryParams.set("labs", selectedLabIds.join(","));
        }
        if (includeImaging && selectedImagingIds.length > 0) {
            queryParams.set("imaging", selectedImagingIds.join(","));
        }

        const queryString = queryParams.toString();
        const url = `/print/examination/${examId}${queryString ? `?${queryString}` : ""}`;
        
        window.open(url, "_blank");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl bg-white p-0 gap-0 border-none shadow-2xl rounded-3xl overflow-hidden">
                {/* Header */}
                <DialogHeader className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                            <Printer className="w-5 h-5 text-white" />
                        </div>
                        Muayene Notu Yazdırma Seçenekleri
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 text-xs mt-1 font-medium">
                        {patientName ? `${patientName} — ` : ""}{examDate ? format(parseISO(examDate), "dd MMMM yyyy", { locale: tr }) : "Muayene Notu"}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold">Laboratuvar ve görüntüleme kayıtları yükleniyor...</span>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[65vh] p-6 space-y-6 bg-slate-50/50">
                        
                        {/* 1. LABORATUVAR SONUÇLARI (TARİH BAZLI GRUPLAMA VE SEÇİM) */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                                        <FlaskConical className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">Laboratuvar Sonuçları</h4>
                                        <p className="text-[11px] text-slate-400">Tarih bazlı toplu veya tek tek test seçimi yapabilirsiniz</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {labs.length > 0 && includeLabs && (
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[10px] font-medium text-slate-600 border-slate-200 hover:bg-slate-50 px-2"
                                                onClick={() => filterLabsByDays(30)}
                                            >
                                                Son 30 Gün
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[10px] font-medium text-slate-600 border-slate-200 hover:bg-slate-50 px-2"
                                                onClick={() => filterLabsByDays(90)}
                                            >
                                                Son 90 Gün
                                            </Button>
                                        </div>
                                    )}

                                    {labs.length > 0 && includeLabs && (
                                        <div className="flex flex-col items-start gap-1.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-700 hover:text-slate-900 select-none">
                                                <Checkbox
                                                    checked={selectedLabIds.length === labs.length}
                                                    onCheckedChange={toggleSelectAllLabs}
                                                    className="w-3.5 h-3.5"
                                                />
                                                <span>{selectedLabIds.length === labs.length ? "Tümünü Temizle" : "Tümünü Seç"}</span>
                                            </label>

                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-600 hover:text-slate-900 select-none">
                                                    <Checkbox
                                                        checked={onlyPsa}
                                                        onCheckedChange={(c) => togglePsaFilter(!!c)}
                                                        className="w-3.5 h-3.5"
                                                    />
                                                    <span>PSA</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-600 hover:text-slate-900 select-none">
                                                    <Checkbox
                                                        checked={onlyKreatinin}
                                                        onCheckedChange={(c) => toggleKreatininFilter(!!c)}
                                                        className="w-3.5 h-3.5"
                                                    />
                                                    <span>Kreatinin</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center border-l border-slate-200 pl-3">
                                        <Checkbox
                                            id="inc-labs"
                                            checked={includeLabs}
                                            onCheckedChange={(c) => setIncludeLabs(!!c)}
                                            className="scale-110"
                                        />
                                    </div>
                                </div>
                            </div>

                            {includeLabs && (
                                labs.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">Hastaya ait laboratuvar sonucu bulunamadı.</p>
                                ) : (
                                    <div className="space-y-3 pt-1">
                                        {groupedLabs.map((group) => {
                                            const groupItemIds = group.items.map((i: any) => i.id);
                                            const selectedCountInGroup = groupItemIds.filter((id: string) => selectedLabIds.includes(id)).length;
                                            const isGroupAllSelected = selectedCountInGroup === groupItemIds.length;
                                            const isGroupPartialSelected = selectedCountInGroup > 0 && !isGroupAllSelected;
                                            const isExpanded = expandedDates.includes(group.dateStr);

                                            return (
                                                <div key={group.dateStr} className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/30">
                                                    {/* Date Group Header */}
                                                    <div
                                                        onClick={() => toggleExpandDate(group.dateStr)}
                                                        className="bg-slate-100/70 px-3.5 py-2 flex items-center justify-between border-b border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-4 h-4 text-slate-500" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4 text-slate-500" />
                                                            )}
                                                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                            <span className="font-bold text-xs text-slate-800">{group.formattedDate}</span>
                                                            <Badge variant="outline" className="bg-white text-slate-500 font-bold text-[10px] px-1.5 py-0">
                                                                {selectedCountInGroup}/{group.items.length} Seçili
                                                            </Badge>
                                                        </div>

                                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleDateGroupLabs(group.items)}
                                                                className="text-[11px] font-bold text-cyan-700 hover:underline px-2 py-0.5 rounded"
                                                            >
                                                                {isGroupAllSelected ? "Tümünü Kaldır" : "Bu Tarihtekileri Seç"}
                                                            </button>
                                                            <Checkbox
                                                                checked={isGroupAllSelected ? true : isGroupPartialSelected ? "indeterminate" : false}
                                                                onCheckedChange={() => toggleDateGroupLabs(group.items)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Individual Tests under this Date (Collapsible) */}
                                                    {isExpanded && (
                                                        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border-t border-slate-100">
                                                            {group.items.map((lab: any) => {
                                                                const isSelected = selectedLabIds.includes(lab.id);
                                                                const testTitle = lab.tetkik_adi || lab.test_adi || "Laboratuvar Testi";
                                                                const resultVal = formatLabDecimal(lab.sonuc || lab.val || "");

                                                                return (
                                                                    <div
                                                                        key={lab.id}
                                                                        onClick={() => handleLabCheck(lab.id)}
                                                                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                                                                            isSelected
                                                                                ? "bg-cyan-50/70 border-cyan-300 text-cyan-950 font-medium"
                                                                                : "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                        }`}
                                                                    >
                                                                        <Checkbox
                                                                            checked={isSelected}
                                                                            onCheckedChange={() => handleLabCheck(lab.id)}
                                                                            className="mt-0.5"
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex justify-between items-center gap-1">
                                                                                <span className="font-bold line-clamp-1 text-slate-800">{testTitle}</span>
                                                                            </div>
                                                                            {resultVal && (
                                                                                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1 font-mono">
                                                                                    {resultVal} {lab.birim || ""}
                                                                                    {lab.referans_degeri || lab.referans_araligi ? <span className="text-slate-400 font-sans text-[10px] ml-1.5">{formatRefRange(lab.referans_degeri || lab.referans_araligi, lab.birim)}</span> : null}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>

                        {/* 2. GÖRÜNTÜLEME VE RADYOLOJİ RAPORLARI */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 mt-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                                        <ScanLine className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">Görüntüleme & Radyoloji Raporları</h4>
                                        <p className="text-[11px] text-slate-400">PDF çıktısına dahil edilecek USG, MR, BT vb. raporları seçin</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {imagings.length > 0 && includeImaging && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[10px] font-bold text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                            onClick={toggleSelectAllImagings}
                                        >
                                            {selectedImagingIds.length === imagings.length ? "Seçimi Temizle" : "Tümünü Seç"}
                                        </Button>
                                    )}
                                    <Checkbox
                                        id="inc-img"
                                        checked={includeImaging}
                                        onCheckedChange={(c) => setIncludeImaging(!!c)}
                                        className="scale-110"
                                    />
                                </div>
                            </div>

                            {includeImaging && (
                                imagings.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">Hastaya ait görüntüleme kaydı bulunamadı.</p>
                                ) : (
                                    <div className="space-y-2 pt-1">
                                        {imagings.map((img: any) => {
                                            const isSelected = selectedImagingIds.includes(img.id);
                                            const imgDate = img.tarih ? format(parseISO(img.tarih), "dd.MM.yyyy") : "-";
                                            const title = img.tetkik_adi || "Görüntüleme Raporu";

                                            return (
                                                <div
                                                    key={img.id}
                                                    onClick={() => handleImagingCheck(img.id)}
                                                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                                                        isSelected
                                                            ? "bg-violet-50/60 border-violet-300 text-violet-950 font-medium"
                                                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-white"
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => handleImagingCheck(img.id)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center gap-2">
                                                            <span className="font-bold text-slate-800 text-xs">{title}</span>
                                                            <Badge variant="outline" className="bg-white text-slate-500 font-bold text-[10px]">
                                                                {imgDate}
                                                            </Badge>
                                                        </div>
                                                        {img.sonuc && (
                                                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 italic leading-relaxed">
                                                                "{img.sonuc}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>

                    </ScrollArea>
                )}

                {/* Footer */}
                <DialogFooter className="p-4 bg-white border-t border-slate-100 flex items-center justify-between sm:justify-between">
                    <Button variant="outline" onClick={onClose} className="h-11 font-bold rounded-xl border-slate-200 text-slate-600">
                        İPTAL
                    </Button>

                    <Button
                        onClick={handlePrint}
                        className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 rounded-xl shadow-lg shadow-indigo-100 gap-2"
                        disabled={loading}
                    >
                        <Printer className="w-4 h-4" /> PDF OLUŞTUR VE YAZDIR
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
