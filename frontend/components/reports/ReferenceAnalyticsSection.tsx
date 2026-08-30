import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { UserPlus, Filter, UserCheck, Heart, Building, Globe } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ReferenceAnalyticsSectionProps {
    stats: any;
    startDate: string;
    endDate: string;
    drilldownType: string | null;
    drilldownValue: string | null;
    onDrilldown: (type: 'weekly' | 'monthly' | 'reference', value: string) => void;
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'DOCTOR': return <UserCheck className="h-4 w-4" />;
        case 'PATIENT': return <Heart className="h-4 w-4" />;
        case 'INSTITUTION': return <Building className="h-4 w-4" />;
        default: return <Globe className="h-4 w-4" />;
    }
};

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'DOCTOR': return 'bg-blue-500';
        case 'PATIENT': return 'bg-pink-500';
        case 'INSTITUTION': return 'bg-amber-500';
        default: return 'bg-slate-500';
    }
};

export function ReferenceAnalyticsSection({
    stats,
    startDate,
    endDate,
    drilldownType,
    drilldownValue,
    onDrilldown,
}: ReferenceAnalyticsSectionProps) {
    return (
        <div className="space-y-6">
            {/* REFERANS KATEGORİLERİ */}
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
                        {(stats?.reference_categories || []).map((cat: any, idx: number) => (
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
                                    {cat.sources.slice(0, 5).map((src: any, sIdx: number) => (
                                        <div
                                            key={sIdx}
                                            className="flex justify-between text-xs p-1.5 rounded cursor-pointer hover:bg-white hover:shadow-sm transition-all group"
                                            onClick={() => onDrilldown('reference', src.name)}
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
                        {(!stats?.reference_categories || stats.reference_categories.length === 0) && (
                            <p className="col-span-4 text-center text-slate-400 italic text-sm py-8">Veri bulunamadı</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* REFERANS DAĞILIMI DETAY */}
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
                                        onDrilldown('reference', String(data.activeLabel));
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
        </div>
    );
}
