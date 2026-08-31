'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { FileText, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface SummaryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    patientId?: string;
    patientName?: string;
}

export function ExaminationSummaryDialog({ isOpen, onClose, patientId, patientName }: SummaryDialogProps) {
    const router = useRouter();
    const { data: muayeneler, isLoading } = useQuery({
        queryKey: ['clinical', 'muayeneler', patientId],
        queryFn: () => patientId ? api.clinical.getMuayeneler(patientId) : Promise.resolve([]),
        enabled: !!patientId && isOpen,
    });

    const latestExam = useMemo(() => {
        if (!muayeneler || muayeneler.length === 0) return null;
        return [...muayeneler].sort((a, b) => {
            const dateA = a.tarih ? new Date(a.tarih).getTime() : 0;
            const dateB = b.tarih ? new Date(b.tarih).getTime() : 0;
            return dateB - dateA;
        })[0];
    }, [muayeneler]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        {patientName} - Muayene Özeti
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-10 text-center text-slate-500">Yükleniyor...</div>
                ) : !latestExam ? (
                    <div className="py-8 text-center space-y-3">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-700">Geçmiş Muayene Kaydı Bulunmuyor</p>
                            <p className="text-xs text-slate-400">Bu hasta için henüz tıbbi muayene kaydı girilmemiş.</p>
                        </div>
                        {patientId && (
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                                onClick={() => {
                                    router.push(`/patients/${patientId}/examination`);
                                    onClose();
                                }}
                            >
                                <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                                İlk Muayeneyi Başlat
                            </Button>
                        )}
                    </div>
                ) : (
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4 py-2">
                            {latestExam.tarih && (
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Son Muayene Tarihi: {format(parseISO(latestExam.tarih), 'dd.MM.yyyy')}
                                </div>
                            )}

                            {latestExam.sikayet && (
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900">Şikayet</h4>
                                    <p className="text-sm font-mono leading-relaxed text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                        "{latestExam.sikayet}"
                                    </p>
                                </div>
                            )}

                            {(latestExam.tani || latestExam.tani1 || latestExam.tani2) && (
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900">Tanılar</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[latestExam.tani, latestExam.tani1, latestExam.tani2].filter((t): t is string => Boolean(t)).map((t: string, idx: number) => (
                                            <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100 py-1">
                                                {t}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {latestExam.sonuc && (
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900">Sonuç / Karar</h4>
                                    <p className="text-sm font-mono leading-relaxed text-slate-600 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                                        {latestExam.sonuc}
                                    </p>
                                </div>
                            )}

                            {latestExam.tedavi && (
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900">Tedavi / Plan</h4>
                                    <p className="text-sm font-mono leading-relaxed text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                                        {latestExam.tedavi}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
                <DialogFooter className="flex sm:justify-between gap-2">
                    {patientId && latestExam && (
                        <Button
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                            onClick={() => {
                                router.push(`/patients/${patientId}/examination`);
                                onClose();
                            }}
                        >
                            <Stethoscope className="w-4 h-4 mr-2" />
                            Muayene Detay
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Kapat</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
