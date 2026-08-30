"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PatientHeader } from "@/components/clinical/patient-header";
import { Button } from "@/components/ui/button";
import { Activity, Plus, TrendingUp, History, ClipboardList, ChevronRight, LayoutDashboard, Target, Info, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LipusForm } from "@/components/clinical/lipus/LipusForm";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as ChartTooltip
} from 'recharts';

export default function LipusDashboardPage() {
    const params = useParams();
    const patientId = String(params.id);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    // Fetch Patient Info
    const { data: patient, isLoading: patientLoading } = useQuery({
        queryKey: ["patient", patientId],
        queryFn: () => api.patients.get(patientId),
    });

    // Fetch Lipus Dashboard Data
    const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
        queryKey: ["lipus-dashboard", patientId],
        queryFn: () => api.lipus?.getDashboardData(patientId) || [],
    });

    const handleNewSession = () => {
        setSelectedSession(null);
    };

    const handleEditSession = (session: any) => {
        // We need full details for editing, dashboard data might be partial
        // For simplicity, we assume dashboardData has enough or we fetch by ID if needed.
        // Usually, dashboardData is enough for the overview.
        setSelectedSession(session);
    };

    // Sort data chronologically (oldest first)
    const sortedDashboardData = React.useMemo(() => {
        if (!dashboardData || !Array.isArray(dashboardData)) return [];
        return [...dashboardData].sort((a: any, b: any) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
    }, [dashboardData]);

    if (patientLoading || dashboardLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-20 w-full" />
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-8 space-y-4">
                        <Skeleton className="h-[400px] w-full" />
                    </div>
                    <div className="col-span-4 space-y-4">
                        <Skeleton className="h-[400px] w-full" />
                    </div>
                </div>
            </div>
        );
    }

    // Helpers
    const latestSession = sortedDashboardData.length > 0 ? sortedDashboardData[sortedDashboardData.length - 1] : null;

    // Prepare chart data
    const chartData = sortedDashboardData.map(item => ({
        period: item.takip_donemi.split(' ')[0], // "0. Hafta" -> "0."
        fullPeriod: item.takip_donemi,
        iief: item.iief_total || 0,
        ehs: item.ehs_skor || 0,
        vas: item.vas_skor || 0,
    }));

    return (
        <div className="flex h-full flex-col gap-6 p-6 bg-slate-50/50 min-h-screen">
            <PatientHeader patient={patient || null} moduleName="Lipus Klinik Modülü" />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Main Content Area */}
                <div className="xl:col-span-9 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
                                    <LayoutDashboard className="w-5 h-5" />
                                </div>
                                {isSelectedSessionEditing(selectedSession) ? "Takip Formu Düzenle" : "Yeni Takip Formu"}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1 font-medium italic">
                                Klinik değerlendirme ve takip verilerini giriniz.
                            </p>
                        </div>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 px-6 shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
                            onClick={handleNewSession}
                        >
                            <Plus className="w-5 h-5" /> YENİ TAKİP FORMU
                        </Button>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <LipusForm 
                            key={selectedSession?.id || "new"}
                            patientId={patientId} 
                            initialData={selectedSession}
                            firstSessionDate={sortedDashboardData.length > 0 ? sortedDashboardData[0].tarih : null}
                            onSuccess={() => setSelectedSession(null)}
                            onCancel={() => setSelectedSession(null)}
                        />
                    </div>
                </div>

                {/* Sidebar Sticky Area */}
                <aside className="xl:col-span-3 space-y-6 lg:sticky lg:top-6">

                    {/* SEANS GEÇMİŞİ LİSTESİ */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        {(!sortedDashboardData || sortedDashboardData.length === 0) ? (
                            <div className="text-center py-10 bg-white">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-dashed border-slate-200">
                                    <ClipboardList className="w-6 h-6 text-slate-300" />
                                </div>
                                <h3 className="text-slate-500 font-bold text-sm">Geçmiş kayıt yok.</h3>
                            </div>
                        ) : (
                                <div className="divide-y divide-slate-100 bg-white">
                                    <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                            <History className="w-4 h-4" /> GEÇMİŞ
                                        </h3>
                                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold">
                                            {sortedDashboardData.length} Kayıt
                                        </Badge>
                                    </div>
                                    {sortedDashboardData.map((item: any, idx: number) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => handleEditSession(item)}
                                            className="group px-6 py-5 flex items-center justify-between hover:bg-indigo-50/30 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-white border border-slate-100 shadow-sm transition-colors">
                                                    <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                                                </div>
                                                <div>
                                                    <div className="text-base font-bold text-slate-800 group-hover:text-indigo-700 transition-colors uppercase">
                                                        {item.takip_donemi}
                                                    </div>
                                                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                                                        {new Date(item.tarih).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="hidden md:flex items-center gap-6">
                                                    <div className="text-center min-w-[60px]">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IIEF-EF</div>
                                                        <div className={cn("text-lg font-black", getIIEFColor(item.iief_total))}>
                                                            {item.iief_total ?? "-"}
                                                        </div>
                                                    </div>
                                                    <div className="text-center min-w-[40px]">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EHS</div>
                                                        <div className="text-lg font-black text-slate-700">{item.ehs_skor ?? "-"}</div>
                                                    </div>
                                                    <div className="text-center min-w-[40px]">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VAS</div>
                                                        <div className="text-lg font-black text-slate-700">{item.vas_skor ?? "-"}</div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </Card>
                    
                    {/* Summary Header */}
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                             <TrendingUp className="w-5 h-5 text-indigo-600" /> KLİNİK ÖZET
                        </h3>
                        <div className="flex gap-1">
                            <Badge variant="outline" className="bg-indigo-50 border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 text-[10px]">
                                SON DURUM
                            </Badge>
                        </div>
                    </div>

                    {/* Performance Indicators */}
                    <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 bg-white group transition-all duration-500 hover:shadow-indigo-100/50">
                        {latestSession ? (
                            <>
                                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                                        <Target className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 opacity-80">Son Değerlendirme</span>
                                            <h4 className="text-xl font-black leading-tight">{latestSession.takip_donemi}</h4>
                                            <p className="text-[10px] text-indigo-100 font-medium">
                                                {new Date(latestSession.tarih).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[10px] font-bold border border-white/20">
                                            AKTİF SÜREÇ
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6 space-y-6 bg-white">
                                    {/* IIEF Quick View with Gradient Progress */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IIEF-EF Skoru</span>
                                                <span className={cn("text-xs font-bold leading-none mt-1", getIIEFColor(latestSession.iief_total))}>
                                                    {getIIEFLabel(latestSession.iief_total)}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className={cn("text-4xl font-black leading-none", getIIEFColor(latestSession.iief_total))}>
                                                    {latestSession.iief_total ?? "-"}
                                                </span>
                                                <span className="text-slate-300 font-bold text-sm">/30</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-50">
                                            <div 
                                                className={cn("h-full rounded-full transition-all duration-1000", getIIEFBg(latestSession.iief_total))}
                                                style={{ width: `${(latestSession.iief_total / 30) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* EHS & VAS Grid Modern */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative group/card p-4 rounded-2xl border border-slate-100 bg-slate-50/50 transition-all hover:bg-white hover:shadow-md hover:border-cyan-100">
                                            <div className="absolute top-2 right-3">
                                                <Info className="w-3 h-3 text-slate-300" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">EHS (Sertlik)</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-slate-700">{latestSession.ehs_skor ?? "-"}</span>
                                                <span className="text-[10px] font-bold text-slate-400">/4</span>
                                            </div>
                                            <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="bg-cyan-500 h-full" style={{ width: `${(latestSession.ehs_skor / 4) * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="relative group/card p-4 rounded-2xl border border-slate-100 bg-slate-50/50 transition-all hover:bg-white hover:shadow-md hover:border-rose-100">
                                             <div className="absolute top-2 right-3 text-rose-300">
                                                <AlertTriangle className="w-3 h-3" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">VAS (Ağrı)</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-slate-700">{latestSession.vas_skor ?? "-"}</span>
                                                <span className="text-[10px] font-bold text-slate-400">/10</span>
                                            </div>
                                            <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="bg-rose-500 h-full" style={{ width: `${(latestSession.vas_skor / 10) * 100}%` }} />
                                            </div>
                                        </div>
                                    </div>


                                </div>

                                {/* Recharts Trend Analysis Area */}
                                <div className="px-6 pb-6 pt-2 space-y-4 border-t border-slate-50 bg-slate-50/30">
                                    <div className="flex items-center justify-between px-1">
                                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IIEF Trend Analizi</h5>
                                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                            <Plus className="w-2.5 h-2.5" /> İyileşme
                                        </span>
                                    </div>
                                    <div className="h-[150px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorIief" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis 
                                                    dataKey="period" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                                                    dy={10}
                                                />
                                                <YAxis hide domain={[0, 30]} />
                                                <ChartTooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-slate-900 text-white p-2 rounded-lg shadow-xl border border-slate-800 text-[10px] font-bold">
                                                                    <p>{payload[0].payload.fullPeriod}</p>
                                                                    <p className="text-indigo-400 mt-1">IIEF: {payload[0].value}</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="iief" 
                                                    stroke="#6366f1" 
                                                    strokeWidth={3}
                                                    fillOpacity={1} 
                                                    fill="url(#colorIief)" 
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-16 text-center">
                                <Activity className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                <p className="text-sm text-slate-400 font-bold">Analiz için en az 1 kayıt giriniz.</p>
                                <Button variant="link" className="text-indigo-600 font-bold text-xs mt-2" onClick={handleNewSession}>İlk Seansı Ekle</Button>
                            </div>
                        )}
                    </Card>



                </aside>

            </div>
        </div>
    );
}

// Utility functions for UI
function getIIEFColor(score: number | null) {
    if (score === null) return "text-slate-300";
    if (score >= 26) return "text-emerald-500";
    if (score >= 22) return "text-teal-500";
    if (score >= 17) return "text-amber-500";
    if (score >= 11) return "text-orange-500";
    return "text-rose-500";
}

function getIIEFBg(score: number | null) {
    if (score === null) return "bg-slate-200";
    if (score >= 26) return "bg-emerald-500";
    if (score >= 22) return "bg-teal-500";
    if (score >= 17) return "bg-amber-500";
    if (score >= 11) return "bg-orange-500";
    return "bg-rose-500";
}

function getIIEFLabel(score: number | null) {
    if (score === null) return "Veri yok";
    if (score >= 26) return "Erektil Fonksiyon Normal";
    if (score >= 22) return "Hafif Derece ED";
    if (score >= 17) return "Hafif-Orta Derece ED";
    if (score >= 11) return "Orta Derece ED";
    return "Ağır Derece ED";
}

function isSelectedSessionEditing(session: any) {
    return session && session.id;
}
