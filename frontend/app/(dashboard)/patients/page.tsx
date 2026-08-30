"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { PatientDetailPanel } from '@/components/patients/patient-detail-panel';
import { Card, CardContent } from '@/components/ui/card';

// Modüler Bileşenler
import { PatientSearchBar } from '@/components/patients/PatientSearchBar';
import {
    PatientAdvancedFilterPanel,
    AdvancedFilters,
    emptyAdvancedFilters
} from '@/components/patients/PatientAdvancedFilterPanel';
import { PatientsDataTable } from '@/components/patients/PatientsDataTable';

const PAGE_SIZE = 50;

export default function PatientsPage() {
    const queryClient = useQueryClient();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    // Basic search state
    const [adInput, setAdInput] = useState('');
    const [soyadInput, setSoyadInput] = useState('');

    // Advanced search state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(emptyAdvancedFilters);
    const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<AdvancedFilters | null>(null);
    const [isAdvancedActive, setIsAdvancedActive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);

    // Sort state
    const [dateSortOrder, setDateSortOrder] = useState<'none' | 'asc' | 'desc'>('desc');
    const [nameSortOrder, setNameSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

    // Popover state
    const [popoverState, setPopoverState] = useState<{ x: number; y: number; patient: any } | null>(null);

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
        placeholderData: keepPreviousData,
    });

    // Advanced search query
    const { data: advancedPatientsData, isLoading: isAdvancedLoading } = useQuery({
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
        placeholderData: keepPreviousData,
    });

    const patients = isAdvancedActive ? advancedPatientsData?.items : standardPatients;
    const totalCount = isAdvancedActive ? (advancedPatientsData?.total || 0) : (standardPatients?.length || 0);
    const isLoading = isAdvancedActive ? isAdvancedLoading : isStandardLoading;

    // Sort patients
    const sortedPatients = useMemo(() => {
        if (!patients) return [];
        let sorted = [...patients];

        if (nameSortOrder !== 'none') {
            sorted.sort((a, b) => {
                const nameA = `${a.ad || ''} ${a.soyad || ''}`.toLowerCase();
                const nameB = `${b.ad || ''} ${b.soyad || ''}`.toLowerCase();
                return nameSortOrder === 'asc'
                    ? nameA.localeCompare(nameB, 'tr')
                    : nameB.localeCompare(nameA, 'tr');
            });
        }

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
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Dışa aktarma başarısız oldu');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hasta_arama_sonuclari_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    }, [appliedAdvancedFilters]);

    const activeFilterCount = useMemo(() => {
        return Object.values(advancedFilters).filter(v => v.trim() !== '').length;
    }, [advancedFilters]);

    const handleRowClick = useCallback((e: React.MouseEvent, patient: any) => {
        setSelectedPatientId(patient.id);
        setPopoverState({ x: e.clientX, y: e.clientY, patient });
    }, []);

    const handleRowHover = useCallback((patientId: string) => {
        queryClient.prefetchQuery({
            queryKey: ['patient-bootstrap', patientId],
            queryFn: () => api.patients.getBootstrap(patientId),
            staleTime: 60 * 1000,
        });
    }, [queryClient]);

    return (
        <div className="flex flex-col gap-4">
            {/* Üst Arama ve Filtre Kartı */}
            <div className="bg-white rounded-lg border shadow-sm">
                <PatientSearchBar
                    adInput={adInput}
                    setAdInput={setAdInput}
                    soyadInput={soyadInput}
                    setSoyadInput={setSoyadInput}
                    onReset={handleReset}
                    showAdvanced={showAdvanced}
                    setShowAdvanced={setShowAdvanced}
                    isAdvancedActive={isAdvancedActive}
                    activeFilterCount={activeFilterCount}
                    totalCount={totalCount}
                    isExporting={isExporting}
                    onExport={handleExport}
                    onAdvancedReset={handleAdvancedReset}
                />

                <PatientAdvancedFilterPanel
                    show={showAdvanced}
                    filters={advancedFilters}
                    onFilterChange={handleAdvancedFilterChange}
                    onSearch={handleAdvancedSearch}
                    onReset={handleAdvancedReset}
                    isLoading={isAdvancedLoading}
                    isAdvancedActive={isAdvancedActive}
                    activeFilterCount={activeFilterCount}
                    totalCount={totalCount}
                />
            </div>

            {/* İçerik Alanı: Tablo ve Yan Detay Paneli */}
            <div className="flex flex-1 flex-col lg:flex-row gap-4">
                <PatientsDataTable
                    patients={sortedPatients}
                    totalCount={totalCount}
                    pageSize={PAGE_SIZE}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    selectedPatientId={selectedPatientId}
                    onRowClick={handleRowClick}
                    onRowHover={handleRowHover}
                    nameSortOrder={nameSortOrder}
                    toggleNameSort={toggleNameSort}
                    dateSortOrder={dateSortOrder}
                    toggleDateSort={toggleDateSort}
                    isAdvancedActive={isAdvancedActive}
                    isLoading={isLoading}
                    popoverState={popoverState}
                    setPopoverState={setPopoverState}
                />

                <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0 transition-all duration-300 relative">
                    <div className="lg:sticky lg:top-4 flex flex-col gap-4">
                        {selectedPatientId ? (
                            <PatientDetailPanel
                                patientId={selectedPatientId}
                                onPatientDeleted={() => setSelectedPatientId(null)}
                            />
                        ) : (
                            <Card className="border-dashed border-2 bg-slate-50/50">
                                <CardContent className="p-6 text-center text-slate-400">
                                    <p className="text-sm">Detayları görüntülemek için bir hasta seçin.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
