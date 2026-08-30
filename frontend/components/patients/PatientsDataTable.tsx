import React from "react";
import { User, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileText, Binoculars, Stethoscope, Loader2, ChevronLeft, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { format, parseISO, differenceInYears } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    try {
        return format(parseISO(dateStr), 'dd.MM.yyyy');
    } catch {
        return '-';
    }
}

function calculateAge(dob?: string) {
    if (!dob) return '-';
    try {
        return differenceInYears(new Date(), parseISO(dob));
    } catch {
        return '-';
    }
}

interface PatientsDataTableProps {
    patients: any[];
    totalCount: number;
    pageSize: number;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    selectedPatientId: string | null;
    onRowClick: (e: React.MouseEvent, patient: any) => void;
    onRowHover: (patientId: string) => void;
    nameSortOrder: 'none' | 'asc' | 'desc';
    toggleNameSort: () => void;
    dateSortOrder: 'none' | 'asc' | 'desc';
    toggleDateSort: () => void;
    isAdvancedActive: boolean;
    isLoading: boolean;
    popoverState: { x: number; y: number; patient: any } | null;
    setPopoverState: React.Dispatch<React.SetStateAction<{ x: number; y: number; patient: any } | null>>;
}

export function PatientsDataTable({
    patients,
    totalCount,
    pageSize,
    currentPage,
    setCurrentPage,
    selectedPatientId,
    onRowClick,
    onRowHover,
    nameSortOrder,
    toggleNameSort,
    dateSortOrder,
    toggleDateSort,
    isAdvancedActive,
    isLoading,
    popoverState,
    setPopoverState,
}: PatientsDataTableProps) {
    const router = useRouter();

    return (
        <div className="flex-1 flex flex-col bg-white rounded-lg border shadow-sm">
            {/* List Header */}
            <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 font-medium">
                    <User className="h-5 w-5" />
                    Hasta Listesi
                    {isAdvancedActive && (
                        <span className="text-[10px] bg-indigo-400/30 text-white px-2 py-0.5 rounded-full font-semibold">
                            Gelişmiş Arama
                        </span>
                    )}
                </div>
                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">
                    {patients.length} kayıt
                </span>
            </div>

            {/* Table Container */}
            <div className="flex-1">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[100px] font-semibold text-slate-500 text-xs">PROTOKOL</TableHead>
                            <TableHead
                                className="flex-1 min-w-[180px] font-semibold text-slate-500 text-xs cursor-pointer hover:bg-slate-100 select-none"
                                onClick={toggleNameSort}
                            >
                                <div className="flex items-center gap-1">
                                    HASTA
                                    {nameSortOrder === 'none' && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                    {nameSortOrder === 'asc' && <ArrowUp className="h-3 w-3 text-blue-600" />}
                                    {nameSortOrder === 'desc' && <ArrowDown className="h-3 w-3 text-blue-600" />}
                                </div>
                            </TableHead>
                            <TableHead className="w-[150px] font-semibold text-slate-500 text-xs">TANI</TableHead>
                            <TableHead className="w-[50px] font-semibold text-slate-500 text-xs text-center">YAŞ</TableHead>
                            <TableHead className="w-[110px] font-semibold text-slate-500 text-xs">TELEFON</TableHead>
                            <TableHead
                                className="w-[100px] font-semibold text-slate-500 text-xs text-center cursor-pointer hover:bg-slate-100 select-none"
                                onClick={toggleDateSort}
                            >
                                <div className="flex items-center justify-center gap-1">
                                    TARİH
                                    {dateSortOrder === 'none' && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                                    {dateSortOrder === 'asc' && <ArrowUp className="h-3 w-3 text-blue-600" />}
                                    {dateSortOrder === 'desc' && <ArrowDown className="h-3 w-3 text-blue-600" />}
                                </div>
                            </TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patients.map((patient) => (
                            <TableRow
                                key={patient.id}
                                className={cn(
                                    "cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100",
                                    selectedPatientId === patient.id && "bg-blue-50/50 hover:bg-blue-50/70"
                                )}
                                onClick={(e) => onRowClick(e, patient)}
                                onMouseEnter={() => onRowHover(patient.id)}
                            >
                                <TableCell>
                                    <span className="font-mono text-[11px] text-blue-600 font-bold uppercase">
                                        {patient.protokol_no || '-'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col py-0.5">
                                        <span className={cn("font-semibold text-sm text-slate-900", selectedPatientId === patient.id && "text-blue-700")}>
                                            {patient.ad} {patient.soyad}
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">
                                            {patient.tc_kimlik || 'TC yok'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 max-w-[150px] truncate" title={patient.son_tani || undefined}>
                                    {patient.son_tani || '-'}
                                </TableCell>
                                <TableCell className="text-center font-medium text-slate-700 text-sm">
                                    {calculateAge(patient.dogum_tarihi)}
                                </TableCell>
                                <TableCell className="text-slate-600 text-xs font-mono">
                                    {patient.cep_tel || '-'}
                                </TableCell>
                                <TableCell className="text-center text-xs text-slate-500">
                                    {formatDate(patient.son_muayene_tarihi)}
                                </TableCell>
                                <TableCell>
                                    <ChevronRight className={cn("w-4 h-4 text-slate-300", selectedPatientId === patient.id && "text-blue-500")} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Gelişmiş arama sayfalama */}
                {isAdvancedActive && totalCount > pageSize && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                        <span className="text-xs text-slate-500">
                            Toplam {Math.ceil(totalCount / pageSize)} sayfadan {currentPage}. sayfa ({totalCount} kayıt)
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1 px-2">
                                <span className="text-sm font-medium text-slate-700">{currentPage}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                                onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Hızlı İşlemler Popover */}
                <Popover open={!!popoverState} onOpenChange={(open) => !open && setPopoverState(null)}>
                    {popoverState && (
                        <>
                            <PopoverAnchor
                                virtualRef={{
                                    current: {
                                        getBoundingClientRect: () => ({
                                            width: 0, height: 0,
                                            top: popoverState.y, left: popoverState.x,
                                            right: popoverState.x, bottom: popoverState.y,
                                        } as any),
                                    } as any
                                }}
                            />
                            <PopoverContent className="w-56 p-1.5 shadow-xl border-slate-100 bg-white/95 backdrop-blur-sm rounded-xl" align="start" sideOffset={5}>
                                <div className="px-3 py-2.5 mb-1 border-b border-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hızlı İşlemler</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                        {popoverState.patient.ad} {popoverState.patient.soyad}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Button
                                        variant="ghost"
                                        className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 w-full rounded-lg"
                                        onClick={() => router.push(`/patients/${popoverState.patient.id}`)}
                                    >
                                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <FileText className="h-3.5 w-3.5" />
                                        </div>
                                        Hasta Detayı
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 w-full rounded-lg"
                                        onClick={() => router.push(`/patients/${popoverState.patient.id}/examination`)}
                                    >
                                        <div className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
                                            <Stethoscope className="h-3.5 w-3.5" />
                                        </div>
                                        Muayene Başlat
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="justify-start gap-3 h-10 text-xs font-semibold text-slate-600 hover:text-green-600 hover:bg-green-50 w-full rounded-lg"
                                        onClick={() => router.push(`/patients/${popoverState.patient.id}/followup`)}
                                    >
                                        <div className="w-6 h-6 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                                            <Binoculars className="h-3.5 w-3.5" />
                                        </div>
                                        Takip Notu Ekle
                                    </Button>
                                </div>
                            </PopoverContent>
                        </>
                    )}
                </Popover>

                {patients.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <Search className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium text-sm">Kayıt bulunamadı</p>
                        <p className="text-slate-400 text-xs mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
                    </div>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                        <p className="text-slate-500 font-medium text-sm">Aranıyor...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
