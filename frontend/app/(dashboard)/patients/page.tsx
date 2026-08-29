"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { User, X, Search, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, Binoculars, Stethoscope, Users, Plus, ArrowRight, ChevronDown, SlidersHorizontal, RotateCcw, Loader2, Download, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { differenceInYears, parseISO, format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PatientDetailPanel } from '@/components/patients/patient-detail-panel';
import { ReferenceInput } from '@/components/patients/reference-input';
import { DatePicker } from '@/components/ui/date-picker';
import { usePatientStore } from '@/stores/patient-store';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    try {
        return format(parseISO(dateStr), 'dd.MM.yyyy');
    } catch {
        return '-';
    }
}

function calculateAge(dob?: string) {
    if (!dob) return '-';
    try {
        return differenceInYears(new Date(), parseISO(dob));
    } catch {
        return '-';
    }
}

interface AdvancedFilters {
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

const emptyAdvancedFilters: AdvancedFilters = {
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

export default function PatientsPage() {
    const router = useRouter();
    const [adInput, setAdInput] = useState('');
    const [soyadInput, setSoyadInput] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const { setActivePatient } = usePatientStore();
    const [popoverState, setPopoverState] = useState<{ x: number, y: number, patient: any | null } | null>(null);
    const [dateSortOrder, setDateSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
    const [nameSortOrder, setNameSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

    // Advanced search
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(emptyAdvancedFilters);
    const [isAdvancedActive, setIsAdvancedActive] = useState(false);
    const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<AdvancedFilters | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 100;
    const [isExporting, setIsExporting] = useState(false);

    // Debounced search
    const [debouncedAd, setDebouncedAd] = useState(adInput);
    const [debouncedSoyad, setDebouncedSoyad] = useState(soyadInput);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedAd(adInput);
            setDebouncedSoyad(soyadInput);
        }, 300);
        return () => clearTimeout(timer);
    }, [adInput, soyadInput]);

    // Standard search query
    const { data: standardPatients, isLoading: isStandardLoading } = useQuery({
        queryKey: ['patients', debouncedAd, debouncedSoyad],
        queryFn: () => api.patients.list({
            limit: 50,
            ad: debouncedAd || undefined,
            soyad: debouncedSoyad || undefined
        }),
        enabled: !isAdvancedActive,
    });

    // Advanced search query
    const { data: advancedPatientsData, isLoading: isAdvancedLoading, refetch: refetchAdvanced } = useQuery({
        queryKey: ['patients-advanced', appliedAdvancedFilters, currentPage],
        queryFn: async () => {
            if (!appliedAdvancedFilters) return { items: [], total: 0, page: 1, size: PAGE_SIZE };
            return api.patients.advancedSearch({
                tani: appliedAdvancedFilters.tani || undefined,
                yas_min: appliedAdvancedFilters.yas_min ? parseInt(appliedAdvancedFilters.yas_min) : undefined,
                yas_max: appliedAdvancedFilters.yas_max ? parseInt(appliedAdvancedFilters.yas_max) : undefined,
                muayene_tarihi_baslangic: appliedAdvancedFilters.muayene_tarihi_baslangic || undefined,
                muayene_tarihi_bitis: appliedAdvancedFilters.muayene_tarihi_bitis || undefined,
                son_islem_tarihi_baslangic: appliedAdvancedFilters.son_islem_tarihi_baslangic || undefined,
                son_islem_tarihi_bitis: appliedAdvancedFilters.son_islem_tarihi_bitis || undefined,
                ilk_kayit_tarihi_baslangic: appliedAdvancedFilters.ilk_kayit_tarihi_baslangic || undefined,
                ilk_kayit_tarihi_bitis: appliedAdvancedFilters.ilk_kayit_tarihi_bitis || undefined,
                operasyon_tarihi_baslangic: appliedAdvancedFilters.operasyon_tarihi_baslangic || undefined,
                operasyon_tarihi_bitis: appliedAdvancedFilters.operasyon_tarihi_bitis || undefined,
                operasyon_adi: appliedAdvancedFilters.operasyon_adi || undefined,
                sikayet: appliedAdvancedFilters.sikayet || undefined,
                oyku: appliedAdvancedFilters.oyku || undefined,
                bulgu: appliedAdvancedFilters.bulgu || undefined,
                referans: appliedAdvancedFilters.referans || undefined,
                limit: PAGE_SIZE,
                skip: (currentPage - 1) * PAGE_SIZE,
            });
        },
        enabled: isAdvancedActive && !!appliedAdvancedFilters,
    });

    const patients = isAdvancedActive ? advancedPatientsData?.items : standardPatients;
    const totalCount = isAdvancedActive ? (advancedPatientsData?.total || 0) : (standardPatients?.length || 0);
    const isLoading = isAdvancedActive ? isAdvancedLoading : isStandardLoading;

    // Sort patients
    const sortedPatients = useMemo(() => {
        if (!patients) return [];

        let sorted = [...patients];

        // Apply name sort
        if (nameSortOrder !== 'none') {
            sorted.sort((a, b) => {
                const nameA = `${a.ad || ''} ${a.soyad || ''}`.toLowerCase();
                const nameB = `${b.ad || ''} ${b.soyad || ''}`.toLowerCase();
                return nameSortOrder === 'asc'
                    ? nameA.localeCompare(nameB, 'tr')
                    : nameB.localeCompare(nameA, 'tr');
            });
        }

        // Apply date sort (takes priority if set)
        if (dateSortOrder !== 'none') {
            sorted.sort((a, b) => {
                const dateA = a.son_muayene_tarihi ? new Date(a.son_muayene_tarihi).getTime() : 0;
                const dateB = b.son_muayene_tarihi ? new Date(b.son_muayene_tarihi).getTime() : 0;
                return dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }

        return sorted;
    }, [patients, dateSortOrder, nameSortOrder]);

    const toggleDateSort = useCallback(() => {
        setNameSortOrder('none');
        setDateSortOrder(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none');
    }, []);

    const toggleNameSort = useCallback(() => {
        setDateSortOrder('none');
        setNameSortOrder(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none');
    }, []);

    const handleReset = useCallback(() => {
        setAdInput('');
        setSoyadInput('');
    }, []);

    const handleAdvancedFilterChange = useCallback((field: keyof AdvancedFilters, value: string) => {
        setAdvancedFilters(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleAdvancedSearch = useCallback(() => {
        // Check if any filter is filled
        const hasFilter = Object.values(advancedFilters).some(v => v.trim() !== '');
        if (!hasFilter) return;
        setIsAdvancedActive(true);
        setCurrentPage(1);
        setAppliedAdvancedFilters({ ...advancedFilters });
    }, [advancedFilters]);

    const handleAdvancedReset = useCallback(() => {
        setAdvancedFilters(emptyAdvancedFilters);
        setAppliedAdvancedFilters(null);
        setIsAdvancedActive(false);
        setCurrentPage(1);
    }, []);

    const handleExport = useCallback(async () => {
        if (!appliedAdvancedFilters) return;

        setIsExporting(true);
        try {
            const queryPath = api.patients.exportAdvancedSearch({
                tani: appliedAdvancedFilters.tani || undefined,
                yas_min: appliedAdvancedFilters.yas_min ? parseInt(appliedAdvancedFilters.yas_min) : undefined,
                yas_max: appliedAdvancedFilters.yas_max ? parseInt(appliedAdvancedFilters.yas_max) : undefined,
                muayene_tarihi_baslangic: appliedAdvancedFilters.muayene_tarihi_baslangic || undefined,
                muayene_tarihi_bitis: appliedAdvancedFilters.muayene_tarihi_bitis || undefined,
                son_islem_tarihi_baslangic: appliedAdvancedFilters.son_islem_tarihi_baslangic || undefined,
                son_islem_tarihi_bitis: appliedAdvancedFilters.son_islem_tarihi_bitis || undefined,
                ilk_kayit_tarihi_baslangic: appliedAdvancedFilters.ilk_kayit_tarihi_baslangic || undefined,
                ilk_kayit_tarihi_bitis: appliedAdvancedFilters.ilk_kayit_tarihi_bitis || undefined,
                operasyon_tarihi_baslangic: appliedAdvancedFilters.operasyon_tarihi_baslangic || undefined,
                operasyon_tarihi_bitis: appliedAdvancedFilters.operasyon_tarihi_bitis || undefined,
                operasyon_adi: appliedAdvancedFilters.operasyon_adi || undefined,
                sikayet: appliedAdvancedFilters.sikayet || undefined,
                oyku: appliedAdvancedFilters.oyku || undefined,
                bulgu: appliedAdvancedFilters.bulgu || undefined,
                referans: appliedAdvancedFilters.referans || undefined,
            });

            const token = useAuthStore.getState().token;
            const res = await fetch(queryPath, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hastalar_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            // Optionally show toast error here
        } finally {
            setIsExporting(false);
        }
    }, [appliedAdvancedFilters]);

    const activeFilterCount = useMemo(() => {
        if (!appliedAdvancedFilters) return 0;
        // Count filter groups (date ranges count as one)
        let count = 0;
        if (appliedAdvancedFilters.tani) count++;
        if (appliedAdvancedFilters.yas_min || appliedAdvancedFilters.yas_max) count++;
        if (appliedAdvancedFilters.muayene_tarihi_baslangic || appliedAdvancedFilters.muayene_tarihi_bitis) count++;
        if (appliedAdvancedFilters.son_islem_tarihi_baslangic || appliedAdvancedFilters.son_islem_tarihi_bitis) count++;
        if (appliedAdvancedFilters.ilk_kayit_tarihi_baslangic || appliedAdvancedFilters.ilk_kayit_tarihi_bitis) count++;
        if (appliedAdvancedFilters.operasyon_tarihi_baslangic || appliedAdvancedFilters.operasyon_tarihi_bitis) count++;
        if (appliedAdvancedFilters.operasyon_adi) count++;
        if (appliedAdvancedFilters.sikayet) count++;
        if (appliedAdvancedFilters.oyku) count++;
        if (appliedAdvancedFilters.bulgu) count++;
        if (appliedAdvancedFilters.referans) count++;
        return count;
    }, [appliedAdvancedFilters]);

    const handleRowClick = useCallback((e: React.MouseEvent, patient: any) => {
        setPopoverState({ x: e.clientX, y: e.clientY, patient: patient });
        setSelectedPatientId(patient.id);
        setActivePatient({
            id: patient.id,
            ad: patient.ad,
            soyad: patient.soyad,
            tc_kimlik: patient.tc_kimlik
        });
    }, [setActivePatient]);

    return (
        <div className="flex flex-col gap-3 p-4 bg-slate-50/50 min-h-screen">
            {/* Top Bar - Search Area */}
            <div className="flex flex-col bg-white rounded-lg border shadow-sm">
                {/* Main search row */}
                <div className="flex flex-col lg:flex-row items-center justify-between p-3 gap-4">
                    <div className="flex flex-1 items-center gap-2 w-full lg:w-auto">
                        <Input
                            placeholder="Ad"
                            value={adInput}
                            onChange={(e) => setAdInput(e.target.value)}
                            className="flex-1 lg:max-w-[300px] bg-slate-50 border-slate-200"
                            disabled={isAdvancedActive}
                        />
                        <Input
                            placeholder="Soyad"
                            value={soyadInput}
                            onChange={(e) => setSoyadInput(e.target.value)}
                            className="flex-1 lg:max-w-[300px] bg-slate-50 border-slate-200"
                            disabled={isAdvancedActive}
                        />
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[80px]"
                            disabled={isAdvancedActive}
                        >
                            Ara
                        </Button>
                        {(adInput || soyadInput) && !isAdvancedActive && (
                            <Button variant="ghost" size="icon" onClick={handleReset} className="h-9 w-9 text-slate-400 hover:text-red-500">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                        {/* Advanced Search Toggle */}
                        <Button
                            variant={showAdvanced ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={cn(
                                "gap-2 text-xs font-semibold transition-all",
                                showAdvanced
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"
                                    : "border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
                            )}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Gelişmiş Arama
                            {activeFilterCount > 0 && (
                                <span className="ml-1 bg-white/20 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
                        </Button>

                        {isAdvancedActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={isExporting}
                                className="gap-2 text-xs font-semibold border-slate-300 text-slate-600 hover:text-green-600 hover:border-green-300 hover:bg-green-50"
                            >
                                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                CSV İndir
                            </Button>
                        )}
                        <span className="text-sm font-medium text-slate-600">
                            <span className="font-bold text-slate-900">{totalCount}</span> hasta
                        </span>
                        <Link href="/patients/create">
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-sm border-0">
                                <Plus className="h-4 w-4 mr-2" />
                                Yeni Hasta
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Advanced Search Panel */}
                <div className={cn(
                    "transition-all duration-300 ease-in-out relative",
                    showAdvanced ? "max-h-[800px] opacity-100 overflow-visible z-20" : "max-h-0 opacity-0 overflow-hidden z-0"
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
                                    onClick={handleAdvancedReset}
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
                                    value={advancedFilters.tani}
                                    onChange={(e) => handleAdvancedFilterChange('tani', e.target.value)}
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
                                        value={advancedFilters.yas_min}
                                        onChange={(e) => handleAdvancedFilterChange('yas_min', e.target.value)}
                                        className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                        min={0}
                                        max={120}
                                    />
                                    <span className="text-slate-300 text-xs font-medium">—</span>
                                    <Input
                                        type="number"
                                        placeholder="Max"
                                        value={advancedFilters.yas_max}
                                        onChange={(e) => handleAdvancedFilterChange('yas_max', e.target.value)}
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
                                        date={advancedFilters.muayene_tarihi_baslangic ? parseISO(advancedFilters.muayene_tarihi_baslangic) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('muayene_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                        placeholder="Başlangıç"
                                        className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    <span className="text-slate-300 text-xs font-medium">—</span>
                                    <DatePicker
                                        date={advancedFilters.muayene_tarihi_bitis ? parseISO(advancedFilters.muayene_tarihi_bitis) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('muayene_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
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
                                        date={advancedFilters.son_islem_tarihi_baslangic ? parseISO(advancedFilters.son_islem_tarihi_baslangic) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('son_islem_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                        placeholder="Başlangıç"
                                        className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    <span className="text-slate-300 text-xs font-medium">—</span>
                                    <DatePicker
                                        date={advancedFilters.son_islem_tarihi_bitis ? parseISO(advancedFilters.son_islem_tarihi_bitis) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('son_islem_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
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
                                        date={advancedFilters.ilk_kayit_tarihi_baslangic ? parseISO(advancedFilters.ilk_kayit_tarihi_baslangic) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('ilk_kayit_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                        placeholder="Başlangıç"
                                        className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    <span className="text-slate-300 text-xs font-medium">—</span>
                                    <DatePicker
                                        date={advancedFilters.ilk_kayit_tarihi_bitis ? parseISO(advancedFilters.ilk_kayit_tarihi_bitis) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('ilk_kayit_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
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
                                        date={advancedFilters.operasyon_tarihi_baslangic ? parseISO(advancedFilters.operasyon_tarihi_baslangic) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('operasyon_tarihi_baslangic', d ? format(d, 'yyyy-MM-dd') : '')}
                                        placeholder="Başlangıç"
                                        className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    <span className="text-slate-300 text-xs font-medium">—</span>
                                    <DatePicker
                                        date={advancedFilters.operasyon_tarihi_bitis ? parseISO(advancedFilters.operasyon_tarihi_bitis) : undefined}
                                        setDate={(d) => handleAdvancedFilterChange('operasyon_tarihi_bitis', d ? format(d, 'yyyy-MM-dd') : '')}
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
                                    value={advancedFilters.operasyon_adi}
                                    onChange={(e) => handleAdvancedFilterChange('operasyon_adi', e.target.value)}
                                    className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                />
                            </div>

                            {/* Şikayet */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Şikayet</Label>
                                <Input
                                    placeholder="Şikayet içeriği..."
                                    value={advancedFilters.sikayet}
                                    onChange={(e) => handleAdvancedFilterChange('sikayet', e.target.value)}
                                    className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                />
                            </div>

                            {/* Öykü */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Öykü</Label>
                                <Input
                                    placeholder="Öyküde ara..."
                                    value={advancedFilters.oyku}
                                    onChange={(e) => handleAdvancedFilterChange('oyku', e.target.value)}
                                    className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                />
                            </div>

                            {/* Muayene Bulguları */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Muayene Bulguları</Label>
                                <Input
                                    placeholder="Bulgu içeriği..."
                                    value={advancedFilters.bulgu}
                                    onChange={(e) => handleAdvancedFilterChange('bulgu', e.target.value)}
                                    className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                />
                            </div>

                            {/* Referans */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Referans</Label>
                                <ReferenceInput
                                    value={advancedFilters.referans}
                                    onChange={(val) => handleAdvancedFilterChange('referans', val)}
                                    className="h-9 bg-white border-slate-200 text-sm focus:border-indigo-400 focus:ring-indigo-400"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-1.5 flex items-end">
                                <div className="flex gap-2 w-full">
                                    <Button
                                        onClick={handleAdvancedSearch}
                                        disabled={isAdvancedLoading}
                                        className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold gap-2"
                                    >
                                        {isAdvancedLoading ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Search className="h-3.5 w-3.5" />
                                        )}
                                        Ara
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleAdvancedReset}
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
            </div>

            {/* Split Content Area */}
            <div className="flex flex-1 flex-col lg:flex-row gap-4">
                {/* Left Panel: Patient List */}
                <div className="flex-1 flex flex-col bg-white rounded-lg border shadow-sm">
                    {/* List Header */}
                    <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2 font-medium">
                            <User className="h-5 w-5" />
                            Hasta Listesi
                            {isAdvancedActive && (
                                <span className="text-[10px] bg-indigo-400/30 text-white px-2 py-0.5 rounded-full font-semibold">
                                    Gelişmiş Arama
                                </span>
                            )}
                        </div>
                        <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">
                            {sortedPatients.length} kayıt
                        </span>
                    </div>

                    {/* Table Container */}
                    <div className="flex-1">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[100px] font-semibold text-slate-500 text-xs">PROTOKOL</TableHead>
                                    <TableHead
                                        className="flex-1 min-w-[180px] font-semibold text-slate-500 text-xs cursor-pointer hover:bg-slate-100 select-none"
                                        onClick={toggleNameSort}
                                    >
                                        <div className="flex items-center gap-1">
                                            HASTA
                                            {nameSortOrder === 'none' && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                            {nameSortOrder === 'asc' && <ArrowUp className="h-3 w-3 text-blue-600" />}
                                            {nameSortOrder === 'desc' && <ArrowDown className="h-3 w-3 text-blue-600" />}
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[150px] font-semibold text-slate-500 text-xs">TANI</TableHead>
                                    <TableHead className="w-[50px] font-semibold text-slate-500 text-xs text-center">YAŞ</TableHead>
                                    <TableHead className="w-[110px] font-semibold text-slate-500 text-xs">TELEFON</TableHead>
                                    <TableHead
                                        className="w-[100px] font-semibold text-slate-500 text-xs text-center cursor-pointer hover:bg-slate-100 select-none"
                                        onClick={toggleDateSort}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            TARİH
                                            {dateSortOrder === 'none' && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                            {dateSortOrder === 'asc' && <ArrowUp className="h-3 w-3 text-blue-600" />}
                                            {dateSortOrder === 'desc' && <ArrowDown className="h-3 w-3 text-blue-600" />}
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPatients.map((patient) => (
                                    <TableRow
                                        key={patient.id}
                                        className={cn(
                                            "cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100",
                                            selectedPatientId === patient.id && "bg-blue-50/50 hover:bg-blue-50/70"
                                        )}
                                        onClick={(e) => handleRowClick(e, patient)}
                                    >
                                        <TableCell>
                                            <span className="font-mono text-[11px] text-blue-600 font-bold uppercase">
                                                {patient.protokol_no || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col py-0.5">
                                                <span className={cn("font-semibold text-sm text-slate-900", selectedPatientId === patient.id && "text-blue-700")}>
                                                    {patient.ad} {patient.soyad}
                                                </span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    {patient.tc_kimlik || 'TC yok'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600 max-w-[150px] truncate" title={patient.son_tani || undefined}>
                                            {patient.son_tani || '-'}
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-slate-700 text-sm">
                                            {calculateAge(patient.dogum_tarihi)}
                                        </TableCell>
                                        <TableCell className="text-slate-600 text-xs font-mono">
                                            {patient.cep_tel || '-'}
                                        </TableCell>
                                        <TableCell className="text-center text-xs text-slate-500">
                                            {formatDate(patient.son_muayene_tarihi)}
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className={cn("w-4 h-4 text-slate-300", selectedPatientId === patient.id && "text-blue-500")} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination for Advanced Search */}
                        {isAdvancedActive && totalCount > PAGE_SIZE && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                                <span className="text-xs text-slate-500">
                                    Toplam {Math.ceil(totalCount / PAGE_SIZE)} sayfadan {currentPage}. sayfa ({totalCount} kayıt)
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(1)}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1 px-2">
                                        <span className="text-sm font-medium text-slate-700">{currentPage}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
                                        onClick={() => setCurrentPage(Math.ceil(totalCount / PAGE_SIZE))}
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Popover */}
                        <Popover open={!!popoverState} onOpenChange={(open) => !open && setPopoverState(null)}>
                            {popoverState && (
                                <>
                                    <PopoverAnchor
                                        virtualRef={{
                                            current: {
                                                getBoundingClientRect: () => ({
                                                    width: 0, height: 0,
                                                    top: popoverState.y, left: popoverState.x,
                                                    right: popoverState.x, bottom: popoverState.y,
                                                } as any),
                                            } as any
                                        }}
                                    />
                                    <PopoverContent className="w-56 p-1.5 shadow-xl border-slate-100 bg-white/95 backdrop-blur-sm rounded-xl" align="start" sideOffset={5}>
                                        <div className="px-3 py-2.5 mb-1 border-b border-slate-50">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hızlı İşlemler</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                {popoverState.patient.ad} {popoverState.patient.soyad}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                variant="ghost"
                                                className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 w-full rounded-lg"
                                                onClick={() => router.push(`/patients/${popoverState.patient.id}`)}
                                            >
                                                <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <FileText className="h-3.5 w-3.5" />
                                                </div>
                                                Hasta Detayı
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 w-full rounded-lg"
                                                onClick={() => router.push(`/patients/${popoverState.patient.id}/examination`)}
                                            >
                                                <div className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
                                                    <Stethoscope className="h-3.5 w-3.5" />
                                                </div>
                                                Muayene Başlat
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-green-600 hover:bg-green-50 w-full rounded-lg"
                                                onClick={() => router.push(`/patients/${popoverState.patient.id}/followup`)}
                                            >
                                                <div className="w-6 h-6 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                                                    <Binoculars className="h-3.5 w-3.5" />
                                                </div>
                                                Takip Notu Ekle
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </>
                            )}
                        </Popover>

                        {(sortedPatients.length === 0) && !isLoading && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                    <Search className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-medium text-sm">Kayıt bulunamadı</p>
                                <p className="text-slate-400 text-xs mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                                <p className="text-slate-500 font-medium text-sm">Aranıyor...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Patient Detail (Contextual) */}
                <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0 transition-all duration-300 relative">
                    <div className="lg:sticky lg:top-4 flex flex-col gap-4">
                        {selectedPatientId ? (
                            <PatientDetailPanel
                                patientId={selectedPatientId}
                                onPatientDeleted={() => setSelectedPatientId(null)}
                            />
                        ) : (
                            <Card className="h-full border-dashed border-2 border-slate-200 shadow-none bg-slate-50/50">
                                <CardContent className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                        <ArrowRight className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <h3 className="text-slate-900 font-bold text-sm">Hasta Seçimi</h3>
                                    <p className="text-xs text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                                        Detayları görüntülemek ve işlem yapmak için soldaki listeden bir hasta seçiniz.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
