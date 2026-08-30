import React from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { ReferenceInput } from "@/components/patients/reference-input";
import { Search, RotateCcw, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedFilters {
    tani: string;
    yas_min: string;
    yas_max: string;
    muayene_tarihi_baslangic: string;
    muayene_tarihi_bitis: string;
    son_islem_tarihi_baslangic: string;
    son_islem_tarihi_bitis: string;
    ilk_kayit_tarihi_baslangic: string;
    ilk_kayit_tarihi_bitis: string;
    operasyon_tarihi_baslangic: string;
    operasyon_tarihi_bitis: string;
    operasyon_adi: string;
    sikayet: string;
    oyku: string;
    bulgu: string;
    referans: string;
}

export const emptyAdvancedFilters: AdvancedFilters = {
    tani: '',
    yas_min: '',
    yas_max: '',
    muayene_tarihi_baslangic: '',
    muayene_tarihi_bitis: '',
    son_islem_tarihi_baslangic: '',
    son_islem_tarihi_bitis: '',
    ilk_kayit_tarihi_baslangic: '',
    ilk_kayit_tarihi_bitis: '',
    operasyon_tarihi_baslangic: '',
    operasyon_tarihi_bitis: '',
    operasyon_adi: '',
    sikayet: '',
    oyku: '',
    bulgu: '',
    referans: '',
};

interface PatientAdvancedFilterPanelProps {
    show: boolean;
    filters: AdvancedFilters;
    onFilterChange: (key: keyof AdvancedFilters, value: string) => void;
    onSearch: () => void;
    onReset: () => void;
    isLoading: boolean;
    isAdvancedActive: boolean;
    activeFilterCount: number;
    totalCount: number;
}

export function PatientAdvancedFilterPanel({
    show,
    filters,
    onFilterChange,
    onSearch,
    onReset,
    isLoading,
    isAdvancedActive,
    activeFilterCount,
    totalCount,
}: PatientAdvancedFilterPanelProps) {
    return (
        <div className={cn(
            "transition-all duration-300 ease-in-out relative",
            show ? "max-h-[800px] opacity-100 overflow-visible z-20" : "max-h-0 opacity-0 overflow-hidden z-0"
        )}>
            <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-4">
                {/* Active filter indicator */}
                {isAdvancedActive && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-xs font-semibold text-indigo-700">
                            Gelişmiş arama aktif — {activeFilterCount} filtre uygulandı — {totalCount} sonuç
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onReset}
                            className="ml-auto h-6 px-2 text-xs text-indigo-600 hover:text-red-600 hover:bg-red-50"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Temizle
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
                    {/* Tanı */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanı</Label>
                        <Input
                            placeholder="Tanı metni veya ICD kodu"
                            value={filters.tani}
                            onChange={(e) => onFilterChange('tani', e.target.value)}
                            className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Yaş */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Yaş Aralığı</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Min"
                                value={filters.yas_min}
                                onChange={(e) => onFilterChange('yas_min', e.target.value)}
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                min={0}
                                max={120}
                            />
                            <span className="text-slate-300 text-xs font-medium">—</span>
                            <Input
                                type="number"
                                placeholder="Max"
                                value={filters.yas_max}
                                onChange={(e) => onFilterChange('yas_max', e.target.value)}
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                min={0}
                                max={120}
                            />
                        </div>
                    </div>

                    {/* Muayene tarihi */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Muayene Tarihi</Label>
                        <div className="flex items-center gap-2">
                            <DatePicker
                                date={filters.muayene_tarihi_baslangic ? parseISO(filters.muayene_tarihi_baslangic) : undefined}
                                setDate={(d) => onFilterChange('muayene_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Başlangıç"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                            <span className="text-slate-300 text-xs font-medium">—</span>
                            <DatePicker
                                date={filters.muayene_tarihi_bitis ? parseISO(filters.muayene_tarihi_bitis) : undefined}
                                setDate={(d) => onFilterChange('muayene_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Bitiş"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Son İşlem Tarihi */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Son İşlem Tarihi</Label>
                        <div className="flex items-center gap-2">
                            <DatePicker
                                date={filters.son_islem_tarihi_baslangic ? parseISO(filters.son_islem_tarihi_baslangic) : undefined}
                                setDate={(d) => onFilterChange('son_islem_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Başlangıç"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                            <span className="text-slate-300 text-xs font-medium">—</span>
                            <DatePicker
                                date={filters.son_islem_tarihi_bitis ? parseISO(filters.son_islem_tarihi_bitis) : undefined}
                                setDate={(d) => onFilterChange('son_islem_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Bitiş"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                        </div>
                    </div>

                    {/* İlk Kayıt Tarihi */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">İlk Kayıt Tarihi</Label>
                        <div className="flex items-center gap-2">
                            <DatePicker
                                date={filters.ilk_kayit_tarihi_baslangic ? parseISO(filters.ilk_kayit_tarihi_baslangic) : undefined}
                                setDate={(d) => onFilterChange('ilk_kayit_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Başlangıç"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                            <span className="text-slate-300 text-xs font-medium">—</span>
                            <DatePicker
                                date={filters.ilk_kayit_tarihi_bitis ? parseISO(filters.ilk_kayit_tarihi_bitis) : undefined}
                                setDate={(d) => onFilterChange('ilk_kayit_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Bitiş"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Operasyon Tarihi */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operasyon Tarihi</Label>
                        <div className="flex items-center gap-2">
                            <DatePicker
                                date={filters.operasyon_tarihi_baslangic ? parseISO(filters.operasyon_tarihi_baslangic) : undefined}
                                setDate={(d) => onFilterChange('operasyon_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Başlangıç"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                            <span className="text-slate-300 text-xs font-medium">—</span>
                            <DatePicker
                                date={filters.operasyon_tarihi_bitis ? parseISO(filters.operasyon_tarihi_bitis) : undefined}
                                setDate={(d) => onFilterChange('operasyon_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Bitiş"
                                className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Operasyon Adı */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operasyon Adı</Label>
                        <Input
                            placeholder="Operasyon adı"
                            value={filters.operasyon_adi}
                            onChange={(e) => onFilterChange('operasyon_adi', e.target.value)}
                            className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Şikayet */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Şikayet</Label>
                        <Input
                            placeholder="Şikayet içeriği..."
                            value={filters.sikayet}
                            onChange={(e) => onFilterChange('sikayet', e.target.value)}
                            className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Öykü */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Öykü</Label>
                        <Input
                            placeholder="Öyküde ara..."
                            value={filters.oyku}
                            onChange={(e) => onFilterChange('oyku', e.target.value)}
                            className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Muayene Bulguları */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Muayene Bulguları</Label>
                        <Input
                            placeholder="Bulgu içeriği..."
                            value={filters.bulgu}
                            onChange={(e) => onFilterChange('bulgu', e.target.value)}
                            className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Referans */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Referans</Label>
                        <ReferenceInput
                            value={filters.referans}
                            onChange={(val) => onFilterChange('referans', val)}
                            className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Butonlar */}
                    <div className="space-y-1.5 flex items-end">
                        <div className="flex gap-2 w-full">
                            <Button
                                onClick={onSearch}
                                disabled={isLoading}
                                className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Search className="h-3.5 w-3.5" />
                                )}
                                Ara
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onReset}
                                className="h-9 px-3 text-sm font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 gap-1.5"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Sıfırla
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
