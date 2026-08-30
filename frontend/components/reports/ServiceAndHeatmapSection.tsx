import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Stethoscope, Clock } from "lucide-react";

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const getHeatmapColor = (value: number, max: number) => {
    if (value === 0) return '#f1f5f9';
    const ratio = value / max;
    if (ratio < 0.25) return '#bbf7d0';
    if (ratio < 0.5) return '#86efac';
    if (ratio < 0.75) return '#22c55e';
    return '#15803d';
};

interface ServiceAndHeatmapSectionProps {
    stats: any;
}

export function ServiceAndHeatmapSection({ stats }: ServiceAndHeatmapSectionProps) {
    const heatmapGrid = useMemo(() => {
        if (!stats?.appointment_heatmap || stats.appointment_heatmap.length === 0) {
            return [];
        }
        const maxVal = Math.max(...stats.appointment_heatmap.map((h: any) => h.value), 1);
        const grid: { day: number; hour: number; value: number; color: string }[][] = [];

        for (let day = 0; day < 7; day++) {
            const dayRow = [];
            for (let hour = 8; hour <= 18; hour++) {
                const found = stats.appointment_heatmap.find((h: any) => h.day === day && h.hour === hour);
                const value = found ? found.value : 0;
                dayRow.push({
                    day,
                    hour,
                    value,
                    color: getHeatmapColor(value, maxVal)
                });
            }
            grid.push(dayRow);
        }
        return grid;
    }, [stats?.appointment_heatmap]);

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Hizmet Dağılımı */}
            <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-teal-500">
                <CardHeader className="bg-white border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-teal-500" /> Hizmet Dağılımı (Alt Alan)
                    </CardTitle>
                    <CardDescription className="text-xs">Branş içi alt alanların trafik dağılımı</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {(stats?.service_distribution || []).map((service: any, idx: number) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-700">{service.name}</span>
                                    <span className="text-xs text-slate-500">{service.count} ({service.percentage}%)</span>
                                </div>
                                <Progress value={service.percentage} className="h-2" />
                            </div>
                        ))}
                        {(!stats?.service_distribution || stats.service_distribution.length === 0) && (
                            <p className="text-center text-slate-400 italic text-sm py-8">Veri bulunamadı</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Randevu Yoğunluk Haritası */}
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
                            <div className="flex mb-2">
                                <div className="w-12"></div>
                                {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => (
                                    <div key={hour} className="flex-1 text-center text-[10px] text-slate-500 font-medium">
                                        {hour}:00
                                    </div>
                                ))}
                            </div>
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
    );
}
