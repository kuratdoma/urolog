import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, Activity } from "lucide-react";

interface ExaminationTrendsSectionProps {
    stats: any;
    drilldownType: string | null;
    drilldownValue: string | null;
    onDrilldown: (type: 'weekly' | 'monthly' | 'reference', value: string) => void;
}

export function ExaminationTrendsSection({
    stats,
    drilldownType,
    drilldownValue,
    onDrilldown,
}: ExaminationTrendsSectionProps) {
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Haftalık Yeni Muayene */}
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
                                data={stats?.weekly_new_patients || []}
                                onClick={(data) => {
                                    if (data && data.activeLabel) {
                                        onDrilldown('weekly', String(data.activeLabel));
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
                                    {(stats?.weekly_new_patients || []).map((entry: any, index: number) => (
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

            {/* Muayene & Takip Aktifliği */}
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
                                data={stats?.patient_trend || []}
                                onClick={(data) => {
                                    if (data && data.activeLabel) {
                                        onDrilldown('monthly', String(data.activeLabel));
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
                                    {(stats?.patient_trend || []).map((entry: any, index: number) => (
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
    );
}
