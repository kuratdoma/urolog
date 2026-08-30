import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Users, CreditCard, Activity, Target,
    Calendar, Scissors, RefreshCw, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportKpiCardsProps {
    stats: any;
}

export function ReportKpiCards({ stats }: ReportKpiCardsProps) {
    if (!stats?.kpi) return null;

    return (
        <div className="space-y-4">
            {/* Temel KPI Kartları */}
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

            {/* Performans KPI Kartları */}
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
        </div>
    );
}
