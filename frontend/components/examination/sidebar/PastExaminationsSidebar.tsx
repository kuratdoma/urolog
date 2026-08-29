import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface PastExaminationsSidebarProps {
    pastExaminations: any[];
    selectedExamId: string | number | null;
    onSelectExamination: (exam: any) => void;
    onNewExamination: () => void;
}

export const PastExaminationsSidebar: React.FC<PastExaminationsSidebarProps> = ({
    pastExaminations,
    selectedExamId,
    onSelectExamination,
    onNewExamination
}) => {
    return (
        <div className="w-full space-y-4 shrink-0">
            <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                size="lg"
                onClick={onNewExamination}
            >
                <Plus className="mr-2 h-4 w-4" />
                Yeni Muayene
            </Button>

            <div className="rounded-xl border border-white bg-white shadow-sm overflow-hidden flex flex-col sticky top-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">GEÇMİŞ MUAYENELER</h3>
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {pastExaminations.length}
                    </span>
                </div>
                <ScrollArea className="flex-1">
                    <div className="divide-y divide-slate-50">
                        {pastExaminations.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center text-slate-400">
                                <CalendarIcon className="h-8 w-8 mb-2 opacity-20" />
                                <span className="text-sm">Kayıt bulunamadı.</span>
                            </div>
                        ) : (
                            pastExaminations.map((exam) => (
                                <div
                                    key={exam.id}
                                    className={cn(
                                        "w-full flex flex-col items-start p-3 text-left transition-all border-l-4 border-transparent group relative cursor-pointer hover:bg-slate-50",
                                        selectedExamId === exam.id
                                            ? "bg-blue-50/40 border-l-blue-500"
                                            : "border-l-transparent"
                                    )}
                                    onClick={() => onSelectExamination(exam)}
                                >
                                    <div className="flex w-full justify-between items-start mb-1 gap-2">
                                        <span className={cn(
                                            "text-xs font-bold transition-colors",
                                            selectedExamId === exam.id ? "text-blue-700" : "text-slate-700"
                                        )}>
                                            {exam.tarih ? format(parseISO(exam.tarih), 'dd.MM.yyyy', { locale: tr }) : 'Tarih Yok'}
                                        </span>

                                        <div className="flex items-center gap-1">
                                            {exam.ipss_skor && parseInt(exam.ipss_skor) > 0 && (
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200 font-mono">
                                                    IPSS:{exam.ipss_skor}
                                                </span>
                                            )}

                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight italic w-full pr-4">
                                        {exam.tani ? exam.tani.split('|')[0] : (exam.sikayet || 'Tanı girilmemiş')}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};
