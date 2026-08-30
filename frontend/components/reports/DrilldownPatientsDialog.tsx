import React from "react";
import { useRouter } from "next/navigation";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, User, ArrowRight } from "lucide-react";
import { ReferencePatient } from "@/lib/api";

interface DrilldownPatientsDialogProps {
    drilldownType: string | null;
    drilldownValue: string | null;
    onClose: () => void;
    refPatients: ReferencePatient[] | undefined;
    refPatientsLoading: boolean;
}

export function DrilldownPatientsDialog({
    drilldownType,
    drilldownValue,
    onClose,
    refPatients,
    refPatientsLoading,
}: DrilldownPatientsDialogProps) {
    const router = useRouter();
    const isOpen = !!drilldownType && !!drilldownValue;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Users className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">{drilldownValue} - Hasta Listesi</DialogTitle>
                            <DialogDescription className="text-slate-400 text-xs mt-1">
                                {drilldownType === 'weekly' ? 'Haftalık yeni kazanılan hastalar' :
                                    drilldownType === 'monthly' ? 'Aylık aktif (muayene/takip) hastalar' :
                                        'Referans kanalına göre hastalar'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-white">
                    <ScrollArea className="h-[400px]">
                        {refPatientsLoading ? (
                            <div className="p-12 text-center text-slate-400 italic">Yükleniyor...</div>
                        ) : !refPatients || refPatients.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">Kayıt bulunamadı.</div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-[100px] text-[10px] font-bold text-slate-500 uppercase">Dosya No</TableHead>
                                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Ad Soyad</TableHead>
                                        <TableHead className="w-[100px] text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {refPatients.map((p: ReferencePatient, index: number) => (
                                        <TableRow
                                            key={`${p.id}-${index}`}
                                            className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                            onClick={() => router.push(`/patients/${p.id}/examination`)}
                                        >
                                            <TableCell className="font-mono text-xs text-slate-500">-</TableCell>
                                            <TableCell className="font-bold text-slate-700 group-hover:text-blue-600 flex items-center gap-2">
                                                <User className="h-3 w-3 text-slate-400" />
                                                {p.ad} {p.soyad}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700">
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>

                <div className="p-4 bg-slate-50 border-t flex justify-between items-center text-[10px] font-bold text-slate-400 tracking-wider">
                    <span>TOPLAM {refPatients?.length || 0} HASTA</span>
                    <Button variant="ghost" className="h-7 text-xs" onClick={onClose}>KAPAT</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
