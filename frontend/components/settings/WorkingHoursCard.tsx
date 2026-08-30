import React from "react";
import { Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface WorkingHoursCardProps {
    workingHours: Record<string, { isOpen: boolean, start: string, end: string }>;
    setWorkingHours: React.Dispatch<React.SetStateAction<Record<string, { isOpen: boolean, start: string, end: string }>>>;
    onSave: () => void;
}

const DAYS = [
    { key: 'monday', label: 'Pzt' },
    { key: 'tuesday', label: 'Sal' },
    { key: 'wednesday', label: 'Çar' },
    { key: 'thursday', label: 'Per' },
    { key: 'friday', label: 'Cum' },
    { key: 'saturday', label: 'Cmt' },
    { key: 'sunday', label: 'Paz' }
];

export function WorkingHoursCard({ workingHours, setWorkingHours, onSave }: WorkingHoursCardProps) {
    return (
        <Card className="border-slate-100 shadow-sm md:row-span-2">
            <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-orange-500" />
                        Çalışma Saatleri
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onSave}>
                        <Save className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-1.5">
                    {DAYS.map((day) => {
                        const daySettings = workingHours[day.key] || { isOpen: false, start: "09:00", end: "18:00" };
                        return (
                            <div key={day.key} className={cn(
                                "flex items-center gap-2 py-1 px-2 rounded-md border transition-colors",
                                daySettings.isOpen ? "bg-white border-slate-200" : "bg-slate-50 border-transparent opacity-60"
                            )}>
                                <Switch
                                    checked={daySettings.isOpen}
                                    onCheckedChange={(checked) => setWorkingHours(prev => ({ ...prev, [day.key]: { ...prev[day.key], isOpen: checked } }))}
                                    className="scale-[0.6] data-[state=checked]:bg-green-500"
                                />
                                <Label className={cn("text-[10px] font-bold w-6", daySettings.isOpen ? "text-slate-700" : "text-slate-400")}>{day.label}</Label>
                                {daySettings.isOpen ? (
                                    <div className="flex items-center gap-1 flex-1">
                                        <Input type="time" value={daySettings.start} onChange={(e) => setWorkingHours(prev => ({ ...prev, [day.key]: { ...prev[day.key], start: e.target.value } }))} className="h-6 text-[10px] px-1 w-[70px]" />
                                        <span className="text-slate-300 text-[10px]">-</span>
                                        <Input type="time" value={daySettings.end} onChange={(e) => setWorkingHours(prev => ({ ...prev, [day.key]: { ...prev[day.key], end: e.target.value } }))} className="h-6 text-[10px] px-1 w-[70px]" />
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-slate-400 italic flex-1 text-center">Kapalı</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
