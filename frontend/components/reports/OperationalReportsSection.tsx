import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from "recharts";
import { CreditCard, Scissors, Ban, Users } from "lucide-react";
import { CohortRow } from "@/lib/api";

interface OperationalReportsSectionProps {
    stats: any;
    cohortData: CohortRow[] | undefined;
    cohortLoading: boolean;
}

export function OperationalReportsSection({
    stats,
    cohortData,
    cohortLoading,
}: OperationalReportsSectionProps) {
    return (
        <div className="space-y-6">
            {/* GELİR TRENDİ */}
            <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-emerald-500">
                <CardHeader className="bg-white border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-emerald-500" /> Gelir Trendi
                    </CardTitle>
                    <CardDescription className="text-xs">Dönemsel ciro değişimi (Hizmet Bazlı)</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <LineChart data={stats?.revenue_chart || []}>
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

            <div className="grid gap-6 lg:grid-cols-2">
                {/* OPERASYON DAĞILIMI */}
                <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-blue-500">
                    <CardHeader className="bg-white border-b border-slate-50">
                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-blue-500" /> Operasyon Dağılımı
                        </CardTitle>
                        <CardDescription className="text-xs">En sık gerçekleştirilen operasyon türleri</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={stats?.operation_chart || []}>
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

                {/* RANDEVU İPTAL GEREKÇELERİ */}
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
                                <BarChart data={stats?.cancellation_stats || []} layout="vertical" margin={{ left: 20, right: 30 }}>
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
                            {(!stats?.cancellation_stats || stats.cancellation_stats.length === 0) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                    <p className="text-slate-400 italic text-sm">İptal kaydı bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* COHORT ANALİZİ */}
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
        </div>
    );
}
