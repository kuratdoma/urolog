import React from "react";
import { useRouter } from "next/navigation";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Activity, ArrowRight, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DiagnosisFilterResult } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DiagnosisResultsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    diagnosisStats: any;
    diagnosisLoading: boolean;
    diagnosisIcd: string;
    diagnosisText: string;
    startDate: string;
    endDate: string;
    onExportCsv: () => void;
}

export function DiagnosisResultsDialog({
    open,
    onOpenChange,
    diagnosisStats,
    diagnosisLoading,
    diagnosisIcd,
    diagnosisText,
    startDate,
    endDate,
    onExportCsv,
}: DiagnosisResultsDialogProps) {
    const router = useRouter();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                            {/* Stats Summary */}
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
                                                {diagnosisStats.trend.map((_, index) => (
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
                        onClick={onExportCsv}
                    >
                        <Activity className="h-3 w-3 mr-1" /> CSV Olarak Dışa Aktar
                    </Button>
                    <Button variant="ghost" className="h-8 text-xs" onClick={() => onOpenChange(false)}>KAPAT</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
