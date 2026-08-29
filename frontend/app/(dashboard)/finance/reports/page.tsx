"use client";

import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { api, AylikOzet, FinansOzet } from '@/lib/api';
import { format, subYears, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
    TrendingUp, TrendingDown, CreditCard, DollarSign,
    Calendar, Download, FileText, Filter, RefreshCw,
    ArrowUpRight, ArrowDownLeft, Wallet, PieChart as PieChartIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ExcelJS from 'exceljs';
import html2pdf from 'html2pdf.js';

export default function FinanceReportsPage() {
    const [year, setYear] = useState<number>(new Date().getFullYear());

    // --- DATA FETCHING ---
    const { data: monthlySummary, isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
        queryKey: ['monthly-summary', year],
        queryFn: () => api.finance.getMonthlySummary(year)
    });

    const { data: lastYearSummary } = useQuery({
        queryKey: ['monthly-summary', year - 1],
        queryFn: () => api.finance.getMonthlySummary(year - 1),
        enabled: !!monthlySummary
    });

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['finance-summary'],
        queryFn: () => api.finance.getSummary()
    });

    // Merge data for comparison
    const comparisonData = monthlySummary?.map((m, i) => ({
        ay_adi: m.ay_adi,
        currentYear: m.gelir,
        lastYear: lastYearSummary?.[i]?.gelir || 0
    })) || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const exportToExcel = async () => {
        if (!monthlySummary) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Aylık Finans Raporu");

        worksheet.columns = [
            { header: "Yıl", key: "yil", width: 10 },
            { header: "Ay", key: "ay", width: 15 },
            { header: "Gelir", key: "gelir", width: 15 },
            { header: "Gider", key: "gider", width: 15 },
            { header: "Net", key: "net", width: 15 }
        ];

        monthlySummary.forEach(m => {
            worksheet.addRow({
                yil: m.yil,
                ay: m.ay_adi,
                gelir: m.gelir,
                gider: m.gider,
                net: m.net
            });
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2E8F0' }
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `finans_raporu_${year}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToPdf = () => {
        const element = document.getElementById('report-content');
        if (!element) return;

        const opt = {
            margin: 10,
            filename: `finans_raporu_${year}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(element).save();
    };

    if (monthlyLoading || summaryLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-slate-500 font-medium">Finansal raporlar hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

    return (
        <div className="p-6 space-y-8 bg-slate-50 min-h-screen" id="report-content">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        Finansal Raporlar & Analiz
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Klinik performans ve nakit akış analizi ({year})</p>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[120px] bg-white border-slate-200 font-bold">
                            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Yıl Seç" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2023, 2024, 2025, 2026].map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        onClick={exportToExcel}
                        className="bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                    >
                        <Download className="h-4 w-4 mr-2 text-emerald-600" />
                        Excel
                    </Button>

                    <Button
                        variant="outline"
                        onClick={exportToPdf}
                        className="bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                    >
                        <FileText className="h-4 w-4 mr-2 text-rose-600" />
                        PDF
                    </Button>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-sm bg-white overflow-hidden group">
                    <div className="h-1 bg-emerald-500 w-full" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">GELİR</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">TOPLAM GELİR</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(summary?.toplam_gelir || 0)}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 italic">Tüm zamanlar toplamı</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white overflow-hidden group">
                    <div className="h-1 bg-rose-500 w-full" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                                <ArrowDownLeft className="h-5 w-5 text-rose-600" />
                            </div>
                            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider">GİDER</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">TOPLAM GİDER</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(summary?.toplam_gider || 0)}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 italic">Tüm zamanlar toplamı</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white overflow-hidden group">
                    <div className="h-1 bg-blue-500 w-full" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <Wallet className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">BİLANÇO</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">NET BAKİYE</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(summary?.net_bakiye || 0)}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 italic">Gelir - Gider farkı</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white overflow-hidden group">
                    <div className="h-1 bg-amber-500 w-full" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                                <DollarSign className="h-5 w-5 text-amber-600" />
                            </div>
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">CARİ</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">BEKLEYEN TAHSİLAT</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(summary?.bekleyen_tahsilat || 0)}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 italic">Hastadan alınacak toplam</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Trend Analysis Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-800">Gelir & Gider Trend Analizi</CardTitle>
                            <CardDescription className="text-sm font-medium">{year} yılı aylık performans gelişimi</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlySummary}>
                                    <defs>
                                        <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="ay_adi"
                                        stroke="#64748b"
                                        fontSize={12}
                                        fontWeight="600"
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `₺${v / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(v) => formatCurrency(v as number)}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Area
                                        name="Gelir"
                                        type="monotone"
                                        dataKey="gelir"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorGelir)"
                                    />
                                    <Area
                                        name="Gider"
                                        type="monotone"
                                        dataKey="gider"
                                        stroke="#ef4444"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorGider)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Yearly Comparison Chart */}
                <Card className="border-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <CardTitle className="text-xl font-black text-slate-800">Yıllık Karşılaştırma</CardTitle>
                        <CardDescription className="text-sm font-medium">Bu yıl vs Geçen yıl Gelirleri</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="ay_adi" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none' }}
                                        formatter={(v) => formatCurrency(v as number)}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar name={`${year} Gelir`} dataKey="currentYear" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar name={`${year - 1} Gelir`} dataKey="lastYear" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row: Detailed Monthly Stats Table & Net Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Table */}
                <Card className="border-white shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <CardTitle className="text-lg font-black text-slate-800">Aylık Finansal Detaylar</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">AY</th>
                                    <th className="px-6 py-4 text-xs font-bold text-emerald-600 uppercase tracking-widest text-right">GELİR</th>
                                    <th className="px-6 py-4 text-xs font-bold text-rose-600 uppercase tracking-widest text-right">GİDER</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase tracking-widest text-right">NET</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {monthlySummary?.map((m, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-700">{m.ay_adi}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-medium text-emerald-600">+{formatCurrency(m.gelir)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-medium text-rose-600">-{formatCurrency(m.gider)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "text-sm font-black",
                                                m.net >= 0 ? "text-slate-900" : "text-rose-600"
                                            )}>
                                                {formatCurrency(m.net)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Net Profit Chart (Bar) */}
                <Card className="border-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <CardTitle className="text-lg font-black text-slate-800">Net Kâr Marjı (Aylık)</CardTitle>
                        <CardDescription className="text-xs">Tahsilat performansına göre net kâr dağılımı</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlySummary}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="ay_adi" stroke="#64748b" fontSize={10} fontWeight="bold" />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₺${v / 1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        formatter={(v) => formatCurrency(v as number)}
                                    />
                                    <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                                        {monthlySummary?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#3b82f6' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Footer / Summary Action */}
            <div className="p-8 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute right-0 top-0 opacity-10">
                    <Wallet className="h-64 w-64 -mr-10 -mt-10" />
                </div>
                <div className="relative z-10 space-y-2 text-center md:text-left">
                    <h2 className="text-2xl font-black">Yıllık Finansal Özet Hazır!</h2>
                    <p className="text-blue-100 font-medium">Bu rapor klinik stratejilerinizi belirlemenize yardımcı olur.</p>
                </div>
                <div className="relative z-10 flex gap-4">
                    <Button
                        size="lg"
                        className="bg-white text-blue-600 hover:bg-blue-50 font-black text-base px-10 shadow-lg border-0"
                        onClick={exportToExcel}
                    >
                        <Download className="h-5 w-5 mr-3" />
                        RAPORU İNDİR
                    </Button>
                </div>
            </div>
        </div>
    );
}
