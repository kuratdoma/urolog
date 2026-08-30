"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    format, parseISO, subMonths, startOfDay, startOfWeek, startOfMonth, startOfYear,
    subYears, endOfMonth, endOfYear
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { DatePicker } from "@/components/ui/date-picker";
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from 'sonner';

// Modüler Bölümler
import { ReportKpiCards } from "@/components/reports/ReportKpiCards";
import { DiagnosisFilterSection } from "@/components/reports/DiagnosisFilterSection";
import { DiagnosisResultsDialog } from "@/components/reports/DiagnosisResultsDialog";
import { DrilldownPatientsDialog } from "@/components/reports/DrilldownPatientsDialog";
import { ExaminationTrendsSection } from "@/components/reports/ExaminationTrendsSection";
import { ServiceAndHeatmapSection } from "@/components/reports/ServiceAndHeatmapSection";
import { ReferenceAnalyticsSection } from "@/components/reports/ReferenceAnalyticsSection";
import { OperationalReportsSection } from "@/components/reports/OperationalReportsSection";

export default function ReportsPage() {
    // --- STATE ---
    const [startDate, setStartDate] = useState<string>(
        format(subMonths(new Date(), 3), 'yyyy-MM-dd')
    );
    const [endDate, setEndDate] = useState<string>(
        format(new Date(), 'yyyy-MM-dd')
    );

    // Drill-down context
    const [drilldownType, setDrilldownType] = useState<'weekly' | 'monthly' | 'reference' | null>(null);
    const [drilldownValue, setDrilldownValue] = useState<string | null>(null);

    // Diagnosis filter
    const [diagnosisIcd, setDiagnosisIcd] = useState<string>('');
    const [diagnosisText, setDiagnosisText] = useState<string>('');
    const [diagnosisDialogOpen, setDiagnosisDialogOpen] = useState(false);

    // 1. Ana İstatistikler
    const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useQuery({
        queryKey: ['report-stats', startDate, endDate],
        queryFn: () => api.reports.getStats({ start_date: startDate, end_date: endDate }),
        placeholderData: (prev) => prev,
    });

    // 2. Cohort Analizi
    const { data: cohortData, isLoading: cohortLoading } = useQuery({
        queryKey: ['cohort-analysis'],
        queryFn: () => api.reports.getCohort(6)
    });

    // 3. Tanı İstatistikleri (İstek üzerine tetiklenir)
    const { data: diagnosisStats, isLoading: diagnosisLoading, refetch: refetchDiagnosis } = useQuery({
        queryKey: ['diagnosis-stats', diagnosisIcd, diagnosisText, startDate, endDate],
        queryFn: () => api.reports.getDiagnosisStats({
            icd_code: diagnosisIcd || undefined,
            diagnosis_text: diagnosisText || undefined,
            start_date: startDate,
            end_date: endDate
        }),
        enabled: false
    });

    // 4. Drilldown Hasta Listesi
    const { data: refPatients, isLoading: refPatientsLoading } = useQuery({
        queryKey: ['drilldown-patients', drilldownType, drilldownValue, startDate, endDate],
        queryFn: () => api.reports.getDrilldownPatients({
            type: drilldownType!,
            value: drilldownValue!,
            start_date: startDate,
            end_date: endDate
        }),
        enabled: !!drilldownType && !!drilldownValue
    });

    const setPreset = useCallback((type: string) => {
        const today = new Date();
        let start = today;
        let end = today;

        switch (type) {
            case 'bugün': start = startOfDay(today); break;
            case 'bu_hafta': start = startOfWeek(today, { weekStartsOn: 1 }); break;
            case 'bu_ay': start = startOfMonth(today); break;
            case 'bu_yil': start = startOfYear(today); break;
            case 'gecen_ay': {
                const lastMonth = subMonths(today, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
                break;
            }
            case 'gecen_yil': {
                const lastYear = subYears(today, 1);
                start = startOfYear(lastYear);
                end = endOfYear(lastYear);
                break;
            }
            case 'son_6_ay': start = subMonths(today, 6); break;
            case 'son_1_yil': start = subYears(today, 1); break;
            case 'son_2_yil': start = subYears(today, 2); break;
            case 'son_5_yil': start = subYears(today, 5); break;
            case 'tum_zamanlar': start = new Date(2000, 0, 1); break;
        }

        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    }, []);

    const handleDiagnosisSearch = useCallback(() => {
        if (!diagnosisIcd && !diagnosisText) {
            toast.error('Lütfen ICD kodu veya tanı metni girin');
            return;
        }
        refetchDiagnosis();
        setDiagnosisDialogOpen(true);
    }, [diagnosisIcd, diagnosisText, refetchDiagnosis]);

    const handleDrilldown = useCallback((type: 'weekly' | 'monthly' | 'reference', value: string) => {
        setDrilldownType(type);
        setDrilldownValue(value);
    }, []);

    const exportToCsv = useCallback(() => {
        if (!diagnosisStats || !diagnosisStats.patients?.length) return;

        const headers = ["Ad Soyad", "Tanı", "ICD Kodu", "Tarih"];
        const rows = diagnosisStats.patients.map((p: any) => [
            `${p.ad} ${p.soyad}`,
            p.tani,
            p.tani_kodu,
            p.tarih
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `tani_export_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [diagnosisStats]);

    if (statsLoading) return <div className="p-8 text-center text-slate-500">İstatistikler yükleniyor...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">İstatistik verisi alınamadı.</div>;

    return (
        <div className={`min-h-screen bg-slate-50/50 p-6 space-y-8 transition-opacity duration-300 ${statsFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            {statsFetching && (
                <div className="fixed top-0 left-0 right-0 z-50">
                    <div className="h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 animate-pulse" />
                </div>
            )}

            {/* Header & Tarih Filtreleri */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">İstatistikler & Analizler</h2>
                    <p className="text-muted-foreground mt-1">Klinik performans, kanal verimliliği ve finansal trendler.</p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 bg-white text-xs border-slate-200">
                                Hızlı Aralık <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[180px] p-1" align="end">
                            <div className="grid grid-cols-1 gap-1">
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('bugün')}>Bugün</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('bu_hafta')}>Bu Hafta</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('bu_ay')}>Bu Ay</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('bu_yil')}>Bu Yıl</Button>
                                <Separator className="my-1" />
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('gecen_ay')}>Geçen Ay</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('gecen_yil')}>Geçen Yıl</Button>
                                <Separator className="my-1" />
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('son_6_ay')}>Son 6 Ay</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('son_1_yil')}>Son 1 Yıl</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('son_2_yil')}>Son 2 Yıl</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('son_5_yil')}>Son 5 Yıl</Button>
                                <Button variant="ghost" className="text-[11px] h-8 justify-start" onClick={() => setPreset('tum_zamanlar')}>Tüm Zamanlar</Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2 py-1">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Başlangıç</span>
                            <DatePicker
                                date={startDate ? parseISO(startDate) : undefined}
                                setDate={(d) => setStartDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Başlangıç"
                                className="border-0 shadow-none h-8 text-xs w-[140px] px-2"
                                compact
                            />
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Bitiş</span>
                            <DatePicker
                                date={endDate ? parseISO(endDate) : undefined}
                                setDate={(d) => setEndDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="Bitiş"
                                className="border-0 shadow-none h-8 text-xs w-[140px] px-2"
                                compact
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. KPI Kartları */}
            <ReportKpiCards stats={stats} />

            {/* 2. Tanı Bazlı Hasta Filtresi */}
            <DiagnosisFilterSection
                diagnosisIcd={diagnosisIcd}
                setDiagnosisIcd={setDiagnosisIcd}
                diagnosisText={diagnosisText}
                setDiagnosisText={setDiagnosisText}
                onSearch={handleDiagnosisSearch}
            />

            {/* 3. Muayene Trend Grafikleri */}
            <ExaminationTrendsSection
                stats={stats}
                drilldownType={drilldownType}
                drilldownValue={drilldownValue}
                onDrilldown={handleDrilldown}
            />

            {/* 4. Hizmet Dağılımı & Yoğunluk Haritası */}
            <ServiceAndHeatmapSection stats={stats} />

            {/* 5. Referans Analitiği */}
            <ReferenceAnalyticsSection
                stats={stats}
                startDate={startDate}
                endDate={endDate}
                drilldownType={drilldownType}
                drilldownValue={drilldownValue}
                onDrilldown={handleDrilldown}
            />

            {/* 6. Operasyonel & Finansal Raporlar (Gelir, Operasyon, İptal, Cohort) */}
            <OperationalReportsSection
                stats={stats}
                cohortData={cohortData}
                cohortLoading={cohortLoading}
            />

            {/* Detay Diyalogları */}
            <DrilldownPatientsDialog
                drilldownType={drilldownType}
                drilldownValue={drilldownValue}
                onClose={() => { setDrilldownType(null); setDrilldownValue(null); }}
                refPatients={refPatients}
                refPatientsLoading={refPatientsLoading}
            />

            <DiagnosisResultsDialog
                open={diagnosisDialogOpen}
                onOpenChange={setDiagnosisDialogOpen}
                diagnosisStats={diagnosisStats}
                diagnosisLoading={diagnosisLoading}
                diagnosisIcd={diagnosisIcd}
                diagnosisText={diagnosisText}
                startDate={startDate}
                endDate={endDate}
                onExportCsv={exportToCsv}
            />
        </div>
    );
}
