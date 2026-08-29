import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Printer, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateProstatVolume } from "@/lib/lab-utils";
import { LabTrusBiopsy } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProstateMapWidget, PiradsLesion } from "@/components/clinical/prostate-map";

interface TrusBiopsySectionProps {
    patientId: string;
    values: Partial<LabTrusBiopsy>;
    onChange: (values: Partial<LabTrusBiopsy>) => void;
    biopsyDate: Date | undefined;
    onBiopsyDateChange: (date: Date | undefined) => void;
    pathologyChecks: string[];
    onPathologyChecksChange: (checks: string[]) => void;
    tumorChecks: string[];
    onTumorChecksChange: (checks: string[]) => void;
    historyData: any[];
    sortConfig: any;
    onToggleSort: (key: string) => void;
    trusTemplates: any[];
    selectedHistoryIds: number[];
    onToggleHistorySelection: (id: number) => void;
    onToggleSelectAllHistory: () => void;
}

export const TrusBiopsySection = React.memo(({
    patientId,
    values,
    onChange,
    biopsyDate,
    onBiopsyDateChange,
    pathologyChecks,
    onPathologyChecksChange,
    tumorChecks,
    onTumorChecksChange,
    historyData,
    sortConfig,
    onToggleSort,
    trusTemplates,
    selectedHistoryIds,
    onToggleHistorySelection,
    onToggleSelectAllHistory
}: TrusBiopsySectionProps) => {
    const [localBulgu, setLocalBulgu] = useState(values.trus_bulgu || '');
    useEffect(() => { setLocalBulgu(values.trus_bulgu || ''); }, [values.trus_bulgu]);

    // PI-RADS lezyon haritası state'i — pirads_lezyon_lokasyon alanından JSON parse
    const piradsLesions = useMemo((): PiradsLesion[] => {
        const raw = values.pirads_lezyon_lokasyon || '';
        if (raw.startsWith('[')) {
            try {
                return JSON.parse(raw) as PiradsLesion[];
            } catch {
                return [];
            }
        }
        return [];
    }, [values.pirads_lezyon_lokasyon]);

    const handleLesionsChange = useCallback((lesions: PiradsLesion[]) => {
        // Lezyonları JSON olarak pirads_lezyon_lokasyon alanına kaydet
        const jsonStr = lesions.length > 0 ? JSON.stringify(lesions) : '';
        onChange({ ...values, pirads_lezyon_lokasyon: jsonStr });
    }, [values, onChange]);

    return (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-xl border-t-4 border-t-indigo-500 shadow-sm p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">TRUS (Transrektal Ultrasonografi)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Label className="w-32 text-xs font-bold text-slate-600">Prostat Boyutları</Label>
                            <div className="flex gap-2 flex-1">
                                <Input className="h-8 text-xs text-center bg-slate-50" placeholder="mm" value={values.prostat_boyut_w || ''} onChange={e => {
                                    const w = e.target.value;
                                    const h = values.prostat_boyut_h || '';
                                    const l = values.prostat_boyut_l || '';
                                    const vol = calculateProstatVolume(w, h, l);
                                    onChange({ ...values, prostat_boyut_w: w, prostat_volum: vol });
                                }} />
                                <Input className="h-8 text-xs text-center bg-slate-50" placeholder="mm" value={values.prostat_boyut_h || ''} onChange={e => {
                                    const h = e.target.value;
                                    const w = values.prostat_boyut_w || '';
                                    const l = values.prostat_boyut_l || '';
                                    const vol = calculateProstatVolume(w, h, l);
                                    onChange({ ...values, prostat_boyut_h: h, prostat_volum: vol });
                                }} />
                                <Input className="h-8 text-xs text-center bg-slate-50" placeholder="mm" value={values.prostat_boyut_l || ''} onChange={e => {
                                    const l = e.target.value;
                                    const w = values.prostat_boyut_w || '';
                                    const h = values.prostat_boyut_h || '';
                                    const vol = calculateProstatVolume(w, h, l);
                                    onChange({ ...values, prostat_boyut_l: l, prostat_volum: vol });
                                }} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="w-32 text-xs font-bold text-slate-600">Prostat Volüm</Label>
                            <div className="relative flex-1">
                                <Input className="h-8 text-xs pr-8 bg-slate-50" value={values.prostat_volum || ''} onChange={e => onChange({ ...values, prostat_volum: e.target.value })} />
                                <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-medium">cc</span>
                            </div>
                            <Label className="w-20 text-xs font-bold text-slate-600 text-right">TZ Volüm</Label>
                            <div className="relative flex-1">
                                <Input className="h-8 text-xs pr-8 bg-slate-50" value={values.tz_volum || ''} onChange={e => onChange({ ...values, tz_volum: e.target.value })} />
                                <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-medium">cc</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">TRUS Bulguları</Label>
                        <Textarea
                            value={localBulgu}
                            onChange={e => setLocalBulgu(e.target.value)}
                            onBlur={() => onChange({ ...values, trus_bulgu: localBulgu })}
                            className="h-[80px] text-xs bg-slate-50 border-slate-200 resize-none"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase mb-2 block">TRUS Tanısı</Label>
                    <Input value={values.trus_tani || ''} onChange={e => onChange({ ...values, trus_tani: e.target.value })} className="h-8 text-xs bg-slate-50 border-slate-200" />
                </div>

                {/* MRI / PIRADS Section */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">MRI Füzyon / PIRADS Verileri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="mri_var"
                                checked={values.mri_var || false}
                                onCheckedChange={(c) => onChange({ ...values, mri_var: c as boolean })}
                            />
                            <Label htmlFor="mri_var" className="text-xs font-bold text-slate-600">MRI Mevcut</Label>
                        </div>
                        {values.mri_var && (
                            <>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">MRI Tarihi</Label>
                                    <DatePicker
                                        date={values.mri_tarih ? (typeof values.mri_tarih === 'string' ? values.mri_tarih : format(values.mri_tarih as any, 'yyyy-MM-dd')) : ''}
                                        setDate={val => onChange({ ...values, mri_tarih: val as any })}
                                        className="h-8 text-xs bg-slate-50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">PIRADS Skoru</Label>
                                    <Input
                                        className="h-8 text-xs bg-slate-50"
                                        placeholder="Örn: PIRADS 4"
                                        value={values.mri_ozet || ''}
                                        onChange={e => onChange({ ...values, mri_ozet: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">Lezyon Boyutu</Label>
                                    <Input
                                        className="h-8 text-xs bg-slate-50"
                                        placeholder="Örn: 12x8 mm"
                                        value={values.pirads_lezyon_boyut || ''}
                                        onChange={e => onChange({ ...values, pirads_lezyon_boyut: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-3">
                                    <ProstateMapWidget
                                        lesions={piradsLesions}
                                        onLesionsChange={handleLesionsChange}
                                        compact
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border-t-4 border-t-pink-500 shadow-sm p-6">
                <div className="flex items-center gap-6 mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prostat Biyopsisi</h3>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold text-slate-600">Biyopsi Tarihi</Label>
                        <DatePicker
                            date={biopsyDate ? format(biopsyDate, 'yyyy-MM-dd') : ''}
                            setDate={val => onBiopsyDateChange(val ? parseISO(val) : undefined)}
                            className="h-8 w-[130px] text-xs bg-slate-50 border-slate-200"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold text-slate-600">Biyopsi Sayısı</Label>
                        <Input className="h-8 w-20 text-xs bg-slate-50" value={values.biopsi_sayi || ''} onChange={e => onChange({ ...values, biopsi_sayi: e.target.value })} />
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto gap-2 bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 h-8"
                        disabled={!values.biopsi_sayi || parseInt(values.biopsi_sayi) <= 0}
                        onClick={() => {
                            const count = parseInt(values.biopsi_sayi || '12') || 12;
                            const dateStr = biopsyDate ? format(biopsyDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                            const params = new URLSearchParams({
                                patientId: patientId,
                                count: String(count),
                                date: dateStr,
                                pirads: values.mri_ozet || '',
                                lezyonYeri: values.pirads_lezyon_lokasyon || '',
                                lezyonBoyut: values.pirads_lezyon_boyut || '',
                                mriVar: values.mri_var ? 'true' : 'false',
                                prostatW: values.prostat_boyut_w || '',
                                prostatH: values.prostat_boyut_h || '',
                                prostatL: values.prostat_boyut_l || '',
                                prostatVolum: values.prostat_volum || ''
                            });
                            window.open(`/print/pathology-form?${params.toString()}`, '_blank');
                        }}
                        title={!values.biopsi_sayi ? "Önce biyopsi sayısını girin" : "Patoloji Formu Yazdır"}
                    >
                        <Printer className="w-4 h-4" />
                        Patoloji Formu
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="rounded-lg border border-slate-100 p-4 bg-slate-50/50">
                        <Label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Patoloji Sonucu</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {['BPH', 'BPH + Kr.Prostatit', 'High Grade PIN', 'ASAP', 'Adeno Ca', 'Diğer'].map(item => (
                                <div key={item} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`path-${item}`}
                                        checked={pathologyChecks.includes(item)}
                                        onCheckedChange={(checked) => {
                                            if (checked) onPathologyChecksChange([...pathologyChecks, item]);
                                            else onPathologyChecksChange(pathologyChecks.filter(x => x !== item));
                                        }}
                                    />
                                    <label htmlFor={`path-${item}`} className="text-xs font-medium text-slate-700">{item}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-4 bg-slate-50/50">
                        <Label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Tümörlü Biyopsi Alanları</Label>
                        <ScrollArea className="h-[200px] pr-2">
                            <div className="space-y-2">
                                {trusTemplates.length > 0 ? trusTemplates.map((tpl: string, index: number) => {
                                    const parts = tpl.split('|');
                                    const num = parts[0]?.trim();
                                    const loc = parts[1]?.trim();
                                    return (
                                        <div key={index} className="flex items-center space-x-2 border-b border-slate-100 pb-1 last:border-0">
                                            <Checkbox
                                                id={`tumor-tpl-${index}`}
                                                checked={tumorChecks.includes(num)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) onTumorChecksChange([...tumorChecks, num]);
                                                    else onTumorChecksChange(tumorChecks.filter(x => x !== num));
                                                }}
                                            />
                                            <label htmlFor={`tumor-tpl-${index}`} className="text-xs font-medium text-slate-700 flex-1">
                                                <span className="font-bold mr-2 text-slate-400">#{num}</span>
                                                {loc}
                                            </label>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-xs text-slate-400 italic">
                                        Şablon bulunamadı. Lütfen Ayarlar {'>'} Tanım Listeleri {'>'} TRUS Biyopsi Şablonu alanından tanımlama yapınız.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-6">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                    <span>Geçmiş TRUS ve Biyopsi Sonuçları</span>
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
                            {historyData.length === 0 ? (
                                <tr><td colSpan={3} className="p-4 text-center text-slate-400">Kayıt yok.</td></tr>
                            ) : (
                                historyData.map((lab: any) => (
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
                                        <td className="py-2 px-4 font-bold text-blue-600 font-mono whitespace-pre-wrap">{lab.prosedur_notu || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

TrusBiopsySection.displayName = 'TrusBiopsySection';
