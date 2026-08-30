import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { FlaskConical, Microscope, Beaker, FileText, Activity, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeTestName } from "@/lib/lab-utils";
import { LabUrine } from "@/lib/api/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UrineSectionProps {
    values: Partial<LabUrine>;
    onChange: (values: Partial<LabUrine>) => void;
    historyData: any[];
    sortConfig: any;
    onToggleSort: (key: string) => void;
    selectedHistoryIds: number[];
    onToggleHistorySelection: (id: number) => void;
    onToggleSelectAllHistory: () => void;
}

const COMMON_ANTIBIOTICS = [
    "Ampisilin", "Amoksisilin-Klavulanat", "Sefazolin", "Sefuroksim", 
    "Seftriakson", "Sefepim", "Sefiksim", "Meropenem", "İmipenem", 
    "Ertapenem", "Amikasin", "Gentamisin", "Siprofloksasin", 
    "Levofloksasin", "Trimetoprim-Sülfametoksazol", "Nitrofurantoin", 
    "Fosfomisin", "Kolistin", "Penisilin", "Eritromisin", "Klindamisin", "Vankomisin"
];

export const UrineSection = React.memo(({ values, onChange, historyData, sortConfig, onToggleSort, selectedHistoryIds, onToggleHistorySelection, onToggleSelectAllHistory }: UrineSectionProps) => {
    
    // Helper components localized to UrineSection
    const InputField = ({ label, value, field, suffix = "", placeholder = "" }: { label: string, value: any, field: keyof LabUrine, suffix?: string, placeholder?: string }) => {
        const [localVal, setLocalVal] = useState(value || '');
        useEffect(() => { setLocalVal(value || ''); }, [value]);

        const handleBlur = () => {
            if (localVal !== (values[field] || '')) {
                onChange({ ...values, [field]: localVal });
            }
        };

        return (
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <div className="relative">
                    <input
                        type="text"
                        value={localVal}
                        onChange={(e) => setLocalVal(e.target.value)}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        className="w-full h-8 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all bg-slate-50 focus:bg-white text-[11px] font-medium"
                    />
                    {suffix && <span className="absolute right-2 top-1.5 text-slate-400 text-[10px] font-bold">{suffix}</span>}
                </div>
            </div>
        );
    };

    const QuickSelectField = ({ label, value, field, options }: { label: string, value: any, field: keyof LabUrine, options: string[] }) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onChange({ ...values, [field]: opt })}
                        className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-md border transition-all uppercase tracking-tight",
                            value === opt
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                        )}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );

    const InternalSelectField = ({ label, value, field, options }: { label: string, value: any, field: keyof LabUrine, options: string[] }) => (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <select
                value={value || ''}
                onChange={(e) => onChange({ ...values, [field]: e.target.value })}
                className="w-full h-8 p-1.5 border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-yellow-400 text-[11px] font-medium"
            >
                <option value="">Seçiniz</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );

    const SectionHeader = ({ icon: Icon, title, colorClass = "text-yellow-600" }: any) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-yellow-100">
            <Icon className={cn("w-4 h-4", colorClass)} />
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">{title}</h3>
        </div>
    );

    // Fetch dynamic antibiogram list from definitions API
    const { data: dynamicAntibiograms = [] } = useQuery({
        queryKey: ['definitions', 'tetkikTanimlari', 'IDRAR_ANTIBIYOGRAM'],
        queryFn: () => api.definitions.tetkikTanimlari.list('IDRAR_ANTIBIYOGRAM')
    });

    const activeAntibiotics = dynamicAntibiograms.length > 0
        ? dynamicAntibiograms.map((d: any) => d.ad)
        : COMMON_ANTIBIOTICS;

    // Local states for large text areas
    const [localSediment, setLocalSediment] = useState(values.sediment || '');
    const [localNotes, setLocalNotes] = useState(values.notlar || '');
    const [localAntibiotic, setLocalAntibiotic] = useState(values.antibiyotik || '');
    const [antibiogramState, setAntibiogramState] = useState<Record<string, string>>({});

    useEffect(() => { setLocalSediment(values.sediment || ''); }, [values.sediment]);
    useEffect(() => { setLocalNotes(values.notlar || ''); }, [values.notlar]);
    useEffect(() => { setLocalAntibiotic(values.antibiyotik || ''); }, [values.antibiyotik]);

    const handleAntibiogramChange = (abx: string, status: string) => {
        const newState = { ...antibiogramState };
        if (newState[abx] === status) {
            delete newState[abx]; // toggle off
        } else {
            newState[abx] = status;
        }
        setAntibiogramState(newState);
        
        // Build the text
        const sList = Object.entries(newState).filter(([_, st]) => st === 'S').map(([a]) => a);
        const iList = Object.entries(newState).filter(([_, st]) => st === 'I').map(([a]) => a);
        const rList = Object.entries(newState).filter(([_, st]) => st === 'R').map(([a]) => a);

        let textParts = [];
        if (sList.length > 0) textParts.push(`Duyarlı: ${sList.join(', ')}`);
        if (iList.length > 0) textParts.push(`Orta: ${iList.join(', ')}`);
        if (rList.length > 0) textParts.push(`Dirençli: ${rList.join(', ')}`);
        
        const finalString = textParts.join(' | ');
        setLocalAntibiotic(finalString);
        onChange({ ...values, antibiyotik: finalString });
    };

    return (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            {/* Kimyasal İnceleme */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <SectionHeader icon={FlaskConical} title="Kimyasal İnceleme (Strip)" colorClass="text-emerald-600" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    <div className="grid grid-cols-2 gap-2">
                        <InputField label="Dansite (SG)" value={values.dansite} field="dansite" placeholder="1.020" />
                        <InternalSelectField label="pH" value={values.ph} field="ph" options={['5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0']} />
                    </div>

                    <QuickSelectField label="Protein" value={values.protein} field="protein" options={['Negatif', 'Eser', '+1', '+2', '+3', '+4']} />
                    <QuickSelectField label="Glukoz" value={values.glukoz} field="glukoz" options={['Negatif', 'Normal', '+1', '+2', '+3', '+4']} />
                    <QuickSelectField label="Keton" value={values.keton} field="keton" options={['Negatif', 'Eser', '+1', '+2', '+3', '+4']} />
                    <QuickSelectField label="Bilirubin" value={values.bilirubin} field="bilirubin" options={['Negatif', '+1', '+2', '+3']} />
                    <QuickSelectField label="Ürobilinojen" value={values.urobilinojen} field="urobilinojen" options={['Normal', '+1', '+2', '+3']} />
                    <QuickSelectField label="Nitrit" value={values.nitrit} field="nitrit" options={['Negatif', 'Pozitif']} />
                    <QuickSelectField label="Lökosit Esteraz" value={values.lokosit_esteraz} field="lokosit_esteraz" options={['Negatif', 'Eser', '+1', '+2', '+3']} />
                    <QuickSelectField label="Kan / Hemoglobin" value={values.kan} field="kan" options={['Negatif', 'Eser', '+1', '+2', '+3']} />
                </div>
            </div>

            {/* Mikroskobik İnceleme */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <SectionHeader icon={Microscope} title="Mikroskobik İnceleme (Sediment)" colorClass="text-yellow-600" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
                    <InputField label="Lökosit" suffix="/HPF" value={values.mik_lokosit} field="mik_lokosit" />
                    <InputField label="Eritrosit" suffix="/HPF" value={values.mik_eritrosit} field="mik_eritrosit" />
                    <InputField label="Epitel" value={values.mik_epitel} field="mik_epitel" />
                    <InternalSelectField
                        label="Bakteri"
                        value={values.mik_bakteri}
                        field="mik_bakteri"
                        options={['Görülmedi', 'Nadiren', 'Az', 'Orta', 'Bol']}
                    />
                    <InputField label="Kristaller" value={values.mik_kristaller} field="mik_kristaller" />
                    <InputField label="Silindirler" value={values.mik_silindirler} field="mik_silindirler" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detaylı Sediment Notu / Eski Sistem</Label>
                    <Textarea
                        value={localSediment}
                        onChange={e => setLocalSediment(e.target.value)}
                        onBlur={() => onChange({ ...values, sediment: localSediment })}
                        className="h-16 text-[11px] bg-slate-50 border-slate-200 resize-none font-medium"
                        placeholder="Örn: Her sahada 3-4 lökosit, nadir epitel görüldü..."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Kültür Bölümü */}
                <div className="lg:col-span-12 bg-white rounded-xl border-t-4 border-t-red-400 shadow-sm p-5">
                    <SectionHeader icon={Beaker} title="İdrar Kültürü" colorClass="text-red-600" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-4 space-y-4">
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Kültür Sonucu</Label>
                                <Select value={values.kultur || ''} onValueChange={v => onChange({ ...values, kultur: v })}>
                                    <SelectTrigger className="h-8 text-[11px] font-medium bg-slate-50 border-slate-200">
                                        <SelectValue placeholder="Seçiniz" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ureme_yok">Üreme Olmadı</SelectItem>
                                        <SelectItem value="ureme_var">Üreme Oldu</SelectItem>
                                        <SelectItem value="kontamine">Kontamine</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <InputField label="Koloni Sayısı" suffix="cfu/ml" value={values.koloni} field="koloni" />
                            <InputField label="Üreyen Bakteri" value={values.bakteri} field="bakteri" />
                        </div>
                        <div className={cn("flex flex-col gap-1", values.kultur === 'ureme_var' ? "lg:col-span-12" : "lg:col-span-8")}>
                            {values.kultur === 'ureme_var' && (
                                <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Antibiyogram Paneli (Hızlı Giriş)</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {activeAntibiotics.map((abx) => (
                                            <div key={abx} className="flex flex-col gap-1.5 p-2 bg-white rounded border border-slate-100 shadow-sm">
                                                <span className="text-[9px] font-bold text-slate-700 uppercase leading-tight h-6 flex items-center">{abx}</span>
                                                <div className="flex gap-1">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleAntibiogramChange(abx, 'S')}
                                                        className={cn("flex-1 text-[10px] font-bold py-1 rounded transition-colors", antibiogramState[abx] === 'S' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-emerald-100")}
                                                    >S</button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleAntibiogramChange(abx, 'I')}
                                                        className={cn("flex-1 text-[10px] font-bold py-1 rounded transition-colors", antibiogramState[abx] === 'I' ? "bg-yellow-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-yellow-100")}
                                                    >I</button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleAntibiogramChange(abx, 'R')}
                                                        className={cn("flex-1 text-[10px] font-bold py-1 rounded transition-colors", antibiogramState[abx] === 'R' ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-red-100")}
                                                    >R</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Antibiyogram / Notlar (Manuel Düzenleme)</Label>
                            <Textarea
                                value={localAntibiotic}
                                onChange={e => setLocalAntibiotic(e.target.value)}
                                onBlur={() => onChange({ ...values, antibiyotik: localAntibiotic })}
                                className="flex-1 min-h-[80px] text-[11px] bg-slate-50 border-slate-200 resize-none font-medium"
                                placeholder="Duyarlı: ..., Dirençli: ..."
                            />
                        </div>
                    </div>
                </div>

                {/* Genel Notlar */}
                <div className="lg:col-span-12 bg-white rounded-xl border-l-4 border-l-slate-400 shadow-sm p-4">
                    <SectionHeader icon={FileText} title="Laboratuvar Genel Notları" colorClass="text-slate-500" />
                    <Textarea
                        value={localNotes}
                        onChange={e => setLocalNotes(e.target.value)}
                        onBlur={() => onChange({ ...values, notlar: localNotes })}
                        className="h-20 text-[11px] bg-slate-50 border-slate-200 resize-none font-medium"
                        placeholder="Ek tıbbi notlar..."
                    />
                </div>
            </div>

            {/* Geçmiş Sonuçlar */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-6">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        <span>Geçmiş İdrar Tahlili Sonuçları</span>
                    </div>
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
                                <tr><td colSpan={4} className="p-4 text-center text-slate-400">Kayıt bulunamadı.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

UrineSection.displayName = 'UrineSection';
