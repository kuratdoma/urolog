"use client";

import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { api, ReferencePatient, DiagnosisFilterResult, CohortRow } from '@/lib/api';
import { format, parseISO, subMonths, startOfDay, startOfWeek, startOfMonth, startOfYear, subYears, endOfMonth, endOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Cell
} from "recharts";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Filter, Users, TrendingUp, Activity, CreditCard, Scissors,
    ChevronDown, ArrowRight, User, Calendar, Clock, Search,
    Target, UserCheck, RefreshCw, Stethoscope, Heart,
    Building, Globe, UserPlus, Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Day names for heatmap
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Color scale for heatmap
const getHeatmapColor = (value: number, max: number) => {
    if (value === 0) return '#f1f5f9';
    const ratio = value / max;
    if (ratio < 0.25) return '#bbf7d0';
    if (ratio < 0.5) return '#86efac';
    if (ratio < 0.75) return '#22c55e';
    return '#15803d';
};

export default function ReportsPage() {
    const router = useRouter();

    // --- STATE ---
    const [statsPeriod, setStatsPeriod] = useState<'3' | '6' | '12'>('3');
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

    // 1. Main Stats
    const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useQuery({
        queryKey: ['report-stats', startDate, endDate],
        queryFn: () => api.reports.getStats({
            start_date: startDate,
            end_date: endDate
        }),
        placeholderData: (prev) => prev,
    });

    // 2. Cohort Analysis
    const { data: cohortData, isLoading: cohortLoading } = useQuery({
        queryKey: ['cohort-analysis'],
        queryFn: () => api.reports.getCohort(6)
    });

    // 3. Diagnosis Stats (on demand)
    const { data: diagnosisStats, isLoading: diagnosisLoading, refetch: refetchDiagnosis } = useQuery({
        queryKey: ['diagnosis-stats', diagnosisIcd, diagnosisText, startDate, endDate],
        queryFn: () => api.reports.getDiagnosisStats({
            icd_code: diagnosisIcd || undefined,
            diagnosis_text: diagnosisText || undefined,
            start_date: startDate,
            end_date: endDate
        }),
        enabled: false // Manual trigger
    });

    // 4. Drilldown Patients
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

    const setPreset = React.useCallback((type: string) => {
        const today = new Date();
        let start = today;
        let end = today;

        switch (type) {
            case 'bugün':
                start = startOfDay(today);
                break;
            case 'bu_hafta':
                start = startOfWeek(today, { weekStartsOn: 1 });
                break;
            case 'bu_ay':
                start = startOfMonth(today);
                break;
            case 'bu_yil':
                start = startOfYear(today);
                break;
            case 'gecen_ay':
                const lastMonth = subMonths(today, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
                break;
            case 'gecen_yil':
                const lastYear = subYears(today, 1);
                start = startOfYear(lastYear);
                end = endOfYear(lastYear);
                break;
            case 'son_6_ay':
                start = subMonths(today, 6);
                break;
            case 'son_1_yil':
                start = subYears(today, 1);
                break;
            case 'son_2_yil':
                start = subYears(today, 2);
                break;
            case 'son_5_yil':
                start = subYears(today, 5);
                break;
            case 'tum_zamanlar':
                start = new Date(2000, 0, 1);
                break;
        }

        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    }, []);

    const handleDiagnosisSearch = React.useCallback(() => {
        if (!diagnosisIcd && !diagnosisText) {
            toast.error('Lütfen ICD kodu veya tanı metni girin');
            return;
        }
        refetchDiagnosis();
        setDiagnosisDialogOpen(true);
    }, [diagnosisIcd, diagnosisText, refetchDiagnosis]);

    const exportToCsv = React.useCallback(() => {
        if (!diagnosisStats || !diagnosisStats.patients.length) return;

        const headers = ["Ad Soyad", "Tanı", "ICD Kodu", "Tarih"];
        const rows = diagnosisStats.patients.map(p => [
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

    // Category icons
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'hekim': return <Stethoscope className="h-4 w-4" />;
            case 'hasta': return <Heart className="h-4 w-4" />;
            case 'dijital': return <Globe className="h-4 w-4" />;
            default: return <Building className="h-4 w-4" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'hekim': return 'bg-blue-500';
            case 'hasta': return 'bg-pink-500';
            case 'dijital': return 'bg-purple-500';
            default: return 'bg-slate-500';
        }
    };

    const heatmapGrid = React.useMemo(() => {
        if (!stats?.heatmap || stats.heatmap.length === 0) return [];

        const maxValue = Math.max(...stats.heatmap.map((h: any) => h.value), 1);
        const grid: { day: number; hour: number; value: number; color: string }[][] = [];

        for (let day = 0; day < 7; day++) {
            const row = [];
            for (let hour = 8; hour <= 18; hour++) {
                const entry = stats.heatmap.find((h: any) => h.day === day && h.hour === hour);
                const value = entry?.value || 0;
                row.push({
                    day,
                    hour,
                    value,
                    color: getHeatmapColor(value, maxValue)
                });
            }
            grid.push(row);
        }
        return grid;
    }, [stats?.heatmap]);

    if (statsLoading) return <div className="p-8 text-center text-slate-500">İstatistikler yükleniyor...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">İstatistik verisi alınamadı.</div>;

    return (
        <div className={`min-h-screen bg-slate-50/50 p-6 space-y-8 transition-opacity duration-300 ${statsFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            {statsFetching && (
                <div className="fixed top-0 left-0 right-0 z-50">
                    <div className="h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 animate-pulse" />
                </div>
            )}
            {/* Header */}
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

            {/* BASIC KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toplam Kayıtlı Hasta</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{stats.kpi.total_patients}</div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Veritabanındaki toplam kayıt</p>
                    </CardContent>
                </Card>
                <Card className="border-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dönemsel Ciro</CardTitle>
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.kpi.monthly_revenue)}
                        </div>
                        <p className={cn("text-[10px] font-bold mt-1", (stats.kpi.monthly_revenue_change || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                            {stats.kpi.monthly_revenue_change > 0 ? '+' : ''}{stats.kpi.monthly_revenue_change}% geçen döneme göre
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dönemsel Operasyon</CardTitle>
                        <Activity className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{stats.kpi.total_operations_month}</div>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">Bu dönem gerçekleştirilen</p>
                    </CardContent>
                </Card>
                <Card className="border-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasta Başı Değer</CardTitle>
                        <Target className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.performance?.avg_revenue_per_patient || 0)}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">Ortalama verimlilik</p>
                    </CardContent>
                </Card>
            </div>

            {/* PERFORMANCE KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-white shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-blue-600 uppercase tracking-wider">Randevu Sadakat Oranı</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-700">%{stats.performance?.appointment_loyalty_rate || 0}</div>
                        <div className="mt-2">
                            <Progress value={stats.performance?.appointment_loyalty_rate || 0} className="h-2" />
                        </div>
                        <p className="text-[10px] text-blue-600 mt-2">
                            {stats.performance?.completed_appointments || 0} / {stats.performance?.total_appointments || 0} randevu geldi
                        </p>
                        <p className="text-[10px] text-red-500 font-medium">
                            {stats.performance?.no_show_appointments || 0} no-show
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-white shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-orange-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-orange-600 uppercase tracking-wider">İşlem Yoğunluğu</CardTitle>
                        <Scissors className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-orange-700">%{stats.performance?.procedure_ratio || 0}</div>
                        <div className="mt-2">
                            <Progress value={stats.performance?.procedure_ratio || 0} className="h-2" />
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2">
                            Muayene: {stats.performance?.exam_count || 0} | Girişim: {stats.performance?.procedure_count || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-white shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Geri Dönüş Oranı</CardTitle>
                        <RefreshCw className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-700">%{stats.performance?.return_rate || 0}</div>
                        <div className="mt-2">
                            <Progress value={stats.performance?.return_rate || 0} className="h-2" />
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2">
                            {stats.performance?.returning_patients || 0} hasta tekrar geldi
                        </p>
                        <p className="text-[10px] text-blue-500">
                            {stats.performance?.first_time_patients || 0} ilk kez gelen
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-white shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-purple-600 uppercase tracking-wider">Muayene Sayısı</CardTitle>
                        <UserCheck className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-purple-700">{stats.performance?.exam_count || 0}</div>
                        <p className="text-[10px] text-slate-600 mt-2">
                            Bu dönemde yapılan toplam muayene
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* DIAGNOSIS FILTER SECTION */}
            <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-indigo-500">
                <CardHeader className="bg-white border-b border-slate-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Search className="h-4 w-4 text-indigo-500" /> Tanı Bazlı Hasta Filtresi
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                                "Son 2 yılda C67 (Mesane Tümörü) tanılı hastaların listesini çıkar"
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <Input
                                placeholder="ICD-10 Kodu (örn: C67)"
                                value={diagnosisIcd}
                                onChange={(e) => setDiagnosisIcd(e.target.value)}
                                className="h-9 w-[150px] text-xs"
                            />
                            <Input
                                placeholder="Tanı Adı"
                                value={diagnosisText}
                                onChange={(e) => setDiagnosisText(e.target.value)}
                                className="h-9 w-[200px] text-xs"
                            />
                            <Button onClick={handleDiagnosisSearch} className="h-9 bg-indigo-600 hover:bg-indigo-700">
                                <Search className="h-4 w-4 mr-2" /> Filtrele
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* MAIN CHARTS */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-white shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <div>
                            <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-emerald-500" /> Haftalık Yeni Muayene (İlk)
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                                Yeni kazanılan hasta sayıları
                            </CardDescription>
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded inline-block italic">
                            SÜTUNLARA TIKLAYARAK DETAY GÖRÜN
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart
                                    data={stats.weekly_new_patients}
                                    onClick={(data) => {
                                        if (data && data.activeLabel) {
                                            setDrilldownType('weekly');
                                            setDrilldownValue(String(data.activeLabel));
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} className="cursor-pointer">
                                        {(stats.weekly_new_patients || []).map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={drilldownValue === entry.name && drilldownType === 'weekly' ? '#059669' : '#10b981'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white shadow-sm overflow-hidden border-t-4 border-t-purple-500">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <div>
                            <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-purple-500" /> Muayene & Takip Aktifliği
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                                Son muayene/takip tarihine göre aylık dağılım
                            </CardDescription>
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-purple-600 bg-purple-50/50 px-2 py-1 rounded inline-block italic">
                            SÜTUNLARA TIKLAYARAK DETAY GÖRÜN
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart
                                    data={stats.patient_trend}
                                    onClick={(data) => {
                                        if (data && data.activeLabel) {
                                            setDrilldownType('monthly');
                                            setDrilldownValue(String(data.activeLabel));
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} className="cursor-pointer">
                                        {(stats.patient_trend || []).map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={drilldownValue === entry.name && drilldownType === 'monthly' ? '#7c3aed' : '#8b5cf6'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SERVICE DISTRIBUTION & HEATMAP */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Service Distribution */}
                <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-teal-500">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-teal-500" /> Hizmet Dağılımı (Alt Alan)
                        </CardTitle>
                        <CardDescription className="text-xs">Branş içi alt alanların trafik dağılımı</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {(stats.service_distribution || []).map((service, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-700">{service.name}</span>
                                        <span className="text-xs text-slate-500">{service.count} ({service.percentage}%)</span>
                                    </div>
                                    <Progress value={service.percentage} className="h-2" />
                                </div>
                            ))}
                            {(!stats.service_distribution || stats.service_distribution.length === 0) && (
                                <p className="text-center text-slate-400 italic text-sm py-8">Veri bulunamadı</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Heatmap */}
                <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-amber-500">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" /> Randevu Yoğunluk Haritası
                        </CardTitle>
                        <CardDescription className="text-xs">Hastaların en yoğun geldiği gün ve saatler</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="overflow-x-auto">
                            <div className="min-w-[400px]">
                                {/* Hour labels */}
                                <div className="flex mb-2">
                                    <div className="w-12"></div>
                                    {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
                                        <div key={hour} className="flex-1 text-center text-[10px] text-slate-500 font-medium">
                                            {hour}:00
                                        </div>
                                    ))}
                                </div>
                                {/* Grid */}
                                {heatmapGrid.map((row, dayIdx) => (
                                    <div key={dayIdx} className="flex items-center mb-1">
                                        <div className="w-12 text-xs font-medium text-slate-600">{DAY_NAMES[dayIdx]}</div>
                                        {row.map((cell, hourIdx) => (
                                            <div
                                                key={hourIdx}
                                                className="flex-1 h-8 mx-0.5 rounded flex items-center justify-center text-[10px] font-bold"
                                                style={{ backgroundColor: cell.color }}
                                                title={`${DAY_NAMES[cell.day]} ${cell.hour}:00 - ${cell.value} randevu`}
                                            >
                                                {cell.value > 0 && <span className="text-white drop-shadow">{cell.value}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {heatmapGrid.length === 0 && (
                                    <p className="text-center text-slate-400 italic text-sm py-8">Veri bulunamadı</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* REFERENCE CATEGORIES */}
            <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-pink-500">
                <CardHeader className="bg-white border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-pink-500" /> Referans Kategorileri
                            </CardTitle>
                            <CardDescription className="text-xs">Hekim, Hasta, Dijital/Akademik kaynaklı yönlendirmeler</CardDescription>
                        </div>
                        <div className="text-[10px] text-pink-600 bg-pink-50 px-2 py-1 rounded font-bold italic">
                            REFERANS İSİMLERİNE TIKLAYARAK DETAY GÖRÜN
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {(stats.reference_categories || []).map((cat, idx) => (
                            <div key={idx} className="p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={cn("p-2 rounded-lg text-white", getCategoryColor(cat.category))}>
                                        {getCategoryIcon(cat.category)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{cat.category_label}</h4>
                                        <p className="text-xs text-slate-500">{cat.count} hasta (%{cat.percentage})</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {cat.sources.slice(0, 5).map((src, sIdx) => (
                                        <div
                                            key={sIdx}
                                            className="flex justify-between text-xs p-1.5 rounded cursor-pointer hover:bg-white hover:shadow-sm transition-all group"
                                            onClick={() => {
                                                setDrilldownType('reference');
                                                setDrilldownValue(src.name);
                                            }}
                                        >
                                            <span className="text-slate-600 truncate max-w-[120px] group-hover:text-pink-600 font-medium">{src.name}</span>
                                            <Badge variant="secondary" className="text-[10px] group-hover:bg-pink-100 group-hover:text-pink-700">{src.value}</Badge>
                                        </div>
                                    ))}
                                    {cat.sources.length > 5 && (
                                        <p className="text-[10px] text-slate-400 text-center pt-1">+{cat.sources.length - 5} daha...</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(!stats.reference_categories || stats.reference_categories.length === 0) && (
                            <p className="col-span-4 text-center text-slate-400 italic text-sm py-8">Veri bulunamadı</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* REFERENCE DISTRIBUTION & REVENUE */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-blue-500">
                    <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-blue-500" /> Referans Dağılımı (Detay)
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-400 mt-1">
                                {format(parseISO(startDate), 'dd MMM yyyy')} - {format(parseISO(endDate), 'dd MMM yyyy')} arası
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart
                                    data={stats?.reference_stats || []}
                                    layout="vertical"
                                    margin={{ left: 50, right: 80 }}
                                    onClick={(data) => {
                                        if (data && data.activeLabel) {
                                            setDrilldownType('reference');
                                            setDrilldownValue(String(data.activeLabel));
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        stroke="#64748b"
                                        fontSize={11}
                                        width={180}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar
                                        dataKey="value"
                                        radius={[0, 4, 4, 0]}
                                        barSize={20}
                                        className="cursor-pointer"
                                        label={{ position: 'right', fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
                                    >
                                        {(stats?.reference_stats || []).map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={drilldownValue === entry.name && drilldownType === 'reference' ? '#3b82f6' : '#10b981'}
                                                className="transition-all hover:opacity-80"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-emerald-500" /> Gelir Trendi
                        </CardTitle>
                        <CardDescription className="text-xs">Dönemsel ciro değişimi (Hizmet Bazlı)</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <LineChart data={stats.revenue_chart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₺${v / 1000}k`} />
                                    <Tooltip
                                        formatter={(v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v as number)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* OPERATION DISTRIBUTION */}
            <Card className="border-white shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-blue-500" /> Operasyon Dağılımı
                    </CardTitle>
                    <CardDescription className="text-xs">En sık gerçekleştirilen operasyon türleri</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={stats.operation_chart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* CANCELLATION REASONS */}
            <Card className="border-white shadow-sm overflow-hidden border-t-4 border-t-red-500">
                <CardHeader className="bg-white border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Ban className="h-4 w-4 text-red-500" /> Randevu İptal Gerekçeleri
                    </CardTitle>
                    <CardDescription className="text-xs">İptal edilen randevuların nedenlerine göre dağılımı</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={stats.cancellation_stats || []} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#64748b"
                                    fontSize={11}
                                    width={100}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 11, fill: '#ef4444', fontWeight: 'bold' }} />
                            </BarChart>
                        </ResponsiveContainer>
                        {(!stats.cancellation_stats || stats.cancellation_stats.length === 0) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                <p className="text-slate-400 italic text-sm">İptal kaydı bulunamadı</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* COHORT ANALYSIS */}
            <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-violet-500">
                <CardHeader className="bg-white border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users className="h-4 w-4 text-violet-500" /> Cohort Analizi (Hasta Retansiyonu)
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Belirli bir ayda gelen hastaların 6 ay sonraki takip durumu
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {cohortLoading ? (
                        <p className="text-center text-slate-400 italic py-8">Yükleniyor...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs font-bold">Cohort</TableHead>
                                        <TableHead className="text-xs text-center">Toplam</TableHead>
                                        <TableHead className="text-xs text-center">Ay 0</TableHead>
                                        <TableHead className="text-xs text-center">Ay 1</TableHead>
                                        <TableHead className="text-xs text-center">Ay 2</TableHead>
                                        <TableHead className="text-xs text-center">Ay 3</TableHead>
                                        <TableHead className="text-xs text-center">Ay 4</TableHead>
                                        <TableHead className="text-xs text-center">Ay 5</TableHead>
                                        <TableHead className="text-xs text-center">Ay 6</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(cohortData || []).map((row: CohortRow, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium text-xs">{row.cohort_month}</TableCell>
                                            <TableCell className="text-center text-xs font-bold">{row.total_patients}</TableCell>
                                            {[row.month_0, row.month_1, row.month_2, row.month_3, row.month_4, row.month_5, row.month_6].map((val, mIdx) => {
                                                const pct = row.total_patients > 0 ? Math.round((val / row.total_patients) * 100) : 0;
                                                return (
                                                    <TableCell key={mIdx} className="text-center">
                                                        <div
                                                            className="rounded px-2 py-1 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: `rgba(16, 185, 129, ${pct / 100})`,
                                                                color: pct > 50 ? 'white' : '#374151'
                                                            }}
                                                        >
                                                            {val} ({pct}%)
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                    {(!cohortData || cohortData.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center text-slate-400 italic py-8">
                                                Cohort verisi bulunamadı
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Drill-down Dialog */}
            <Dialog open={!!drilldownType && !!drilldownValue} onOpenChange={() => { setDrilldownType(null); setDrilldownValue(null); }}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-900 text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/20 p-2 rounded-lg">
                                <Users className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">{drilldownValue} - Hasta Listesi</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs mt-1">
                                    {drilldownType === 'weekly' ? 'Haftalık yeni kazanılan hastalar' :
                                        drilldownType === 'monthly' ? 'Aylık aktif (muayene/takip) hastalar' :
                                            'Referans kanalına göre hastalar'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden bg-white">
                        <ScrollArea className="h-[400px]">
                            {refPatientsLoading ? (
                                <div className="p-12 text-center text-slate-400 italic">Yükleniyor...</div>
                            ) : !refPatients || refPatients.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic">Kayıt bulunamadı.</div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[100px] text-[10px] font-bold text-slate-500 uppercase">Dosya No</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Ad Soyad</TableHead>
                                            <TableHead className="w-[100px] text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {refPatients.map((p: ReferencePatient, index: number) => (
                                            <TableRow
                                                key={`${p.id}-${index}`}
                                                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                                onClick={() => router.push(`/patients/${p.id}/examination`)}
                                            >
                                                <TableCell className="font-mono text-xs text-slate-500">-</TableCell>
                                                <TableCell className="font-bold text-slate-700 group-hover:text-blue-600 flex items-center gap-2">
                                                    <User className="h-3 w-3 text-slate-400" />
                                                    {p.ad} {p.soyad}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="p-4 bg-slate-50 border-t flex justify-between items-center text-[10px] font-bold text-slate-400 tracking-wider">
                        <span>TOPLAM {refPatients?.length || 0} HASTA</span>
                        <Button variant="ghost" className="h-7 text-xs" onClick={() => { setDrilldownType(null); setDrilldownValue(null); }}>KAPAT</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Diagnosis Results Dialog */}
            <Dialog open={diagnosisDialogOpen} onOpenChange={setDiagnosisDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-indigo-900 text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-500/20 p-2 rounded-lg">
                                <Search className="h-6 w-6 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">
                                    Tanı Filtresi Sonuçları
                                    {diagnosisIcd && <Badge className="ml-2 bg-indigo-600">{diagnosisIcd}</Badge>}
                                    {diagnosisText && <Badge className="ml-2 bg-indigo-600">{diagnosisText}</Badge>}
                                </DialogTitle>
                                <DialogDescription className="text-indigo-200 text-xs mt-1">
                                    {startDate} - {endDate} arası
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden bg-white">
                        {diagnosisLoading ? (
                            <div className="p-12 text-center text-slate-400 italic">Yükleniyor...</div>
                        ) : diagnosisStats ? (
                            <div className="p-6 space-y-6">
                                {/* Stats Summary - Enhanced */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                        <p className="text-xs text-indigo-600 font-bold uppercase">Toplam Vaka</p>
                                        <p className="text-2xl font-black text-indigo-900">{diagnosisStats.total_count}</p>
                                        <p className="text-[10px] text-indigo-500 mt-1">Seçili dönemde tanı alan hasta</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="text-xs text-emerald-600 font-bold uppercase">Portföy Oranı</p>
                                        <p className="text-2xl font-black text-emerald-900">%{diagnosisStats.percentage_of_portfolio}</p>
                                        <p className="text-[10px] text-emerald-500 mt-1">Toplam hasta portföyü içinde</p>
                                    </div>
                                    {/* Year-over-Year Change */}
                                    {diagnosisStats.trend.length >= 2 && (() => {
                                        const currentYear = diagnosisStats.trend[diagnosisStats.trend.length - 1];
                                        const previousYear = diagnosisStats.trend[diagnosisStats.trend.length - 2];
                                        const change = previousYear.count > 0
                                            ? ((currentYear.count - previousYear.count) / previousYear.count * 100).toFixed(1)
                                            : currentYear.count > 0 ? 100 : 0;
                                        const isPositive = Number(change) >= 0;
                                        return (
                                            <div className={cn(
                                                "p-4 rounded-lg border",
                                                isPositive ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                                            )}>
                                                <p className={cn("text-xs font-bold uppercase", isPositive ? "text-green-600" : "text-red-600")}>
                                                    Yıllık Değişim
                                                </p>
                                                <p className={cn("text-2xl font-black", isPositive ? "text-green-700" : "text-red-700")}>
                                                    {isPositive ? '+' : ''}{change}%
                                                </p>
                                                <p className={cn("text-[10px] mt-1", isPositive ? "text-green-500" : "text-red-500")}>
                                                    {previousYear.period} → {currentYear.period}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                    {/* Trend Direction */}
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                        <p className="text-xs text-purple-600 font-bold uppercase">Trend Yönü</p>
                                        {diagnosisStats.trend.length >= 2 && (() => {
                                            const currentYear = diagnosisStats.trend[diagnosisStats.trend.length - 1];
                                            const previousYear = diagnosisStats.trend[diagnosisStats.trend.length - 2];
                                            const isGrowing = currentYear.count > previousYear.count;
                                            const isStable = currentYear.count === previousYear.count;
                                            return (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={cn(
                                                        "p-2 rounded-full",
                                                        isGrowing ? "bg-green-500" : isStable ? "bg-yellow-500" : "bg-red-500"
                                                    )}>
                                                        {isGrowing ? (
                                                            <TrendingUp className="h-4 w-4 text-white" />
                                                        ) : isStable ? (
                                                            <Activity className="h-4 w-4 text-white" />
                                                        ) : (
                                                            <TrendingUp className="h-4 w-4 text-white rotate-180" />
                                                        )}
                                                    </div>
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        isGrowing ? "text-green-700" : isStable ? "text-yellow-700" : "text-red-700"
                                                    )}>
                                                        {isGrowing ? 'Artış' : isStable ? 'Stabil' : 'Azalış'}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                        <p className="text-[10px] text-purple-500 mt-2">Klinik yönelim göstergesi</p>
                                    </div>
                                </div>

                                {/* Trend Chart */}
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-600 font-bold uppercase mb-4">Yıllık Vaka Trendi</p>
                                    <div className="h-[120px]">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <BarChart data={diagnosisStats.trend}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    formatter={(value) => [`${value} hasta`, 'Vaka Sayısı']}
                                                />
                                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                    {diagnosisStats.trend.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={index === diagnosisStats.trend.length - 1 ? '#6366f1' : '#a5b4fc'}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Patient List */}
                                <ScrollArea className="h-[350px]">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Ad Soyad</TableHead>
                                                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tanı</TableHead>
                                                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">ICD Kodu</TableHead>
                                                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tarih</TableHead>
                                                <TableHead className="w-[60px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {diagnosisStats.patients.map((p: DiagnosisFilterResult, index: number) => (
                                                <TableRow
                                                    key={`${p.id}-${index}`}
                                                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                                    onClick={() => router.push(`/patients/${p.id}/examination`)}
                                                >
                                                    <TableCell className="font-bold text-slate-700 group-hover:text-indigo-600">
                                                        {p.ad} {p.soyad}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">{p.tani}</TableCell>
                                                    <TableCell><Badge variant="outline">{p.tani_kodu}</Badge></TableCell>
                                                    <TableCell className="text-xs text-slate-500">{p.tarih}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-400 italic">Sonuç bulunamadı.</div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                        <Button
                            variant="outline"
                            className="h-8 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            onClick={exportToCsv}
                        >
                            <Activity className="h-3 w-3 mr-1" /> CSV Olarak Dışa Aktar
                        </Button>
                        <Button variant="ghost" className="h-8 text-xs" onClick={() => setDiagnosisDialogOpen(false)}>KAPAT</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
