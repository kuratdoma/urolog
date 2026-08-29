import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardList, Droplets, Microscope, Zap, Activity, FileText, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeTestName } from "@/lib/lab-utils";
import { LabSpermiogram } from "@/lib/api/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SpermiogramSectionProps {
    values: Partial<LabSpermiogram>;
    onChange: (values: Partial<LabSpermiogram>) => void;
    historyData: any[];
    sortConfig: any;
    onToggleSort: (key: string) => void;
    selectedHistoryIds: number[];
    onToggleHistorySelection: (id: number) => void;
    onToggleSelectAllHistory: () => void;
}

export const SpermiogramSection = React.memo(({ values, onChange, historyData, sortConfig, onToggleSort, selectedHistoryIds, onToggleHistorySelection, onToggleSelectAllHistory }: SpermiogramSectionProps) => {

    // --- HELPER COMPONENT FOR INPUTS ---
    const InputField = ({ label, value, field, suffix, placeholder = "", type = "text", options }: { label: string, value: any, field: keyof LabSpermiogram, suffix?: string, placeholder?: string, type?: string, options?: string[] }) => {
        const [localVal, setLocalVal] = useState(value || '');

        useEffect(() => { setLocalVal(value || ''); }, [value]);

        const handleBlur = () => {
            if (localVal !== (values[field] || '')) {
                onChange({ ...values, [field]: localVal });
            }
        };

        return (
            <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase truncate">{label}</Label>
                <div className="relative">
                    {options ? (
                        <select
                            value={localVal}
                            onChange={(e) => {
                                setLocalVal(e.target.value);
                                onChange({ ...values, [field]: e.target.value });
                            }}
                            className="w-full h-9 p-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100 text-xs font-medium appearance-none"
                        >
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                        <Input
                            type={type}
                            value={localVal}
                            onChange={(e) => setLocalVal(e.target.value)}
                            onBlur={handleBlur}
                            placeholder={placeholder}
                            className="w-full h-9 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-slate-50 focus:bg-white text-xs font-medium pr-8"
                        />
                    )}
                    {suffix && <span className="absolute right-3 top-2.5 text-slate-400 text-[10px] font-bold pointer-events-none">{suffix}</span>}
                </div>
            </div>
        );
    };

    const SectionTitle = ({ icon: Icon, title, colorClass = "text-blue-600" }: any) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Icon className={`w-4 h-4 ${colorClass}`} />
            <h3 className="font-bold text-xs text-slate-600 uppercase tracking-wide">{title}</h3>
        </div>
    );

    // Local State for Notes (TextArea)
    const [localNotes, setLocalNotes] = useState(values.notlar || '');
    useEffect(() => { setLocalNotes(values.notlar || ''); }, [values.notlar]);

    return (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-blue-400" />
                            Semen Analiz Rapor Formu
                        </h1>
                        <p className="text-slate-400 text-[10px] mt-0.5">Hibrit Hareketlilik Değerlendirme Paneli</p>
                    </div>
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] opacity-60 italic">Tarih: {values.tarih || format(new Date(), 'dd.MM.yyyy')}</p>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Makroskobik İnceleme */}
                        <section className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm relative group hover:border-blue-200 transition-colors">
                            <SectionTitle icon={Droplets} title="Makroskobik İnceleme" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField label="Volüm (Hacim)" field="volum" value={values.volum} suffix="mL" type="number" placeholder="≥ 1.4" />
                                <InputField label="pH" field="ph" value={values.ph} type="number" placeholder="≥ 7.2" />
                                <InputField label="Vizkozite" field="viskozite" value={values.viskozite || 'Normal'} options={['Normal', 'Artmış (+)', 'Çok Artmış (++)']} />
                                <InputField label="Likefaksiyon" field="likefaksiyon" value={values.likefaksiyon || 'Normal (30 dk)'} options={['Normal (30 dk)', 'Uzamış (> 60 dk)', 'Eksik']} />
                            </div>
                        </section>

                        {/* Sperm Sayımı */}
                        <section className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm relative group hover:border-emerald-200 transition-colors">
                            <SectionTitle icon={Microscope} title="Sperm Sayımı" colorClass="text-emerald-600" />
                            <div className="grid grid-cols-1 gap-4">
                                <InputField label="Sperm Konsantrasyonu" field="konsantrasyon" value={values.konsantrasyon} suffix="mil/mL" type="number" placeholder="≥ 16" />
                                <InputField label="Toplam Sperm Sayısı" field="total_sperm_sayisi" value={values.total_sperm_sayisi} suffix="milyon" type="number" placeholder="≥ 39" />
                            </div>
                        </section>
                    </div>

                    {/* Hareketlilik Alanları */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Yeni Sistem Hareketlilik (WHO) */}
                        <section className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 shadow-sm hover:border-indigo-300 transition-colors">
                            <SectionTitle icon={Zap} title="Yeni Sistem Hareketlilik (WHO)" colorClass="text-indigo-600" />
                            <div className="grid grid-cols-3 gap-4">
                                <InputField label="Progresif (PR)" field="motilite_pr" value={values.motilite_pr} suffix="%" type="number" placeholder="≥ 30" />
                                <InputField label="Yerinde (NP)" field="motilite_np" value={values.motilite_np} suffix="%" type="number" />
                                <InputField label="Hareketsiz (IM)" field="motilite_im" value={values.motilite_im} suffix="%" type="number" />
                            </div>
                        </section>

                        {/* Eski Sistem Hareketlilik */}
                        <section className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm hover:border-blue-300 transition-colors">
                            <SectionTitle icon={Activity} title="Eski Sistem Hareketlilik" colorClass="text-blue-600" />
                            <div className="grid grid-cols-4 gap-2">
                                <InputField label="+4" field="motilite_4" value={values.motilite_4} suffix="%" type="number" />
                                <InputField label="+3" field="motilite_3" value={values.motilite_3} suffix="%" type="number" />
                                <InputField label="+2" field="motilite_2" value={values.motilite_2} suffix="%" type="number" />
                                <InputField label="+1" field="motilite_1" value={values.motilite_1} suffix="%" type="number" />
                            </div>
                        </section>
                    </div>

                    {/* Morfoloji */}
                    <section className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                        <SectionTitle icon={Activity} title="Morfoloji Değerlendirmesi" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="flex flex-col gap-1">
                                <Label className="text-[11px] font-bold text-blue-700 italic uppercase">Normal Morfoloji</Label>
                                <select
                                    className="w-full h-9 p-2 border-2 border-blue-200 rounded-lg bg-blue-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-blue-800"
                                    value={values.morfoloji || '4'}
                                    onChange={(e) => onChange({ ...values, morfoloji: e.target.value })}
                                >
                                    {['0', '1', '2', '3', '4', '>4'].map(val => (
                                        <option key={val} value={val}>{val === '>4' ? '>%4' : `%${val}`}</option>
                                    ))}
                                </select>
                            </div>
                            <InputField label="Baş Defektleri" field="morfoloji_bas" value={values.morfoloji_bas} suffix="%" type="number" />
                            <InputField label="Boyun/Ara Parça Def." field="morfoloji_boyun" value={values.morfoloji_boyun} suffix="%" type="number" />
                            <InputField label="Kuyruk Defektleri" field="morfoloji_kuyruk" value={values.morfoloji_kuyruk} suffix="%" type="number" />
                        </div>
                    </section>

                    {/* Notlar */}
                    <section>
                        <SectionTitle icon={FileText} title="Laboratuvar Notları" />
                        <Textarea
                            value={localNotes}
                            onChange={e => setLocalNotes(e.target.value)}
                            onBlur={() => onChange({ ...values, notlar: localNotes })}
                            placeholder="Ek gözlemler, agregasyon veya aglütinasyon durumu..."
                            className="h-24 text-xs bg-slate-50 border-slate-200 resize-none rounded-xl focus:bg-white transition-colors p-4"
                        />
                    </section>
                </div>

                <div className="bg-slate-50 p-3 px-6 text-[10px] text-slate-400 flex justify-between border-t border-slate-200">
                    <span>* PR: Progresif Hareket, NP: Yerinde Hareket, IM: Hareketsiz</span>
                    <span>WHO 6. Edisyon & Klasik Klasifikasyon</span>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-6">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                    <span>Geçmiş Semen Analizi Sonuçları</span>
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
                                <th className="py-2 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onToggleSort('tetkik_adi')}>
                                    <div className="flex items-center gap-1">
                                        Tetkik
                                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'tetkik_adi' ? "text-blue-600" : "text-slate-300")} />
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
                                    <td className="py-2 px-4 font-bold text-slate-700">{normalizeTestName(lab.tetkik_adi).toUpperCase()}</td>
                                    <td className="py-2 px-4 font-bold text-blue-600 font-mono whitespace-pre-wrap">{lab.sonuc}</td>
                                </tr>
                            ))}
                            {historyData.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-400">Kayıt yok.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

SpermiogramSection.displayName = 'SpermiogramSection';
