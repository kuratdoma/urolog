import React from "react";
import { format, parseISO } from "date-fns";
import { Plus, Search, ArrowUpDown, LineChart as LineChartIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isResultAbnormal, normalizeTestName, formatLabDecimal, formatRefRange } from "@/lib/lab-utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FastLabRow, FastLabRowType } from "../FastLabRow";

interface BiochemistrySectionProps {
    fastLabRows: FastLabRowType[];
    onFastLabUpdate: (id: number, field: keyof FastLabRowType, value: string) => void;
    onRemoveRow: (id: number) => void;
    onKeyDown: (e: React.KeyboardEvent, id: number, field: keyof FastLabRowType) => void;
    orderSets: Record<string, string[]>;
    onApplyOrderSet: (name: string) => void;
    historyData: any[];
    historySearch: string;
    onHistorySearchChange: (val: string) => void;
    sortConfig: any;
    onToggleSort: (key: string) => void;
    selectedHistoryIds: number[];
    onToggleHistorySelection: (id: number) => void;
    onToggleSelectAllHistory: () => void;
    onTrendClick: (testName: string) => void;
    globalDate: Date | undefined;
}

export const BiochemistrySection = React.memo(({
    fastLabRows,
    onFastLabUpdate,
    onRemoveRow,
    onKeyDown,
    orderSets,
    onApplyOrderSet,
    historyData,
    historySearch,
    onHistorySearchChange,
    sortConfig,
    onToggleSort,
    selectedHistoryIds,
    onToggleHistorySelection,
    onToggleSelectAllHistory,
    onTrendClick,
    globalDate
}: BiochemistrySectionProps) => {
    const [collapsedDates, setCollapsedDates] = React.useState<Record<string, boolean>>({});

    const toggleDate = React.useCallback((dateStr: string) => {
        setCollapsedDates(prev => ({
            ...prev,
            [dateStr]: !prev[dateStr]
        }));
    }, []);

    // Group historyData by date
    const groupedHistory = React.useMemo(() => {
        const groups: Record<string, any[]> = {};
        historyData.forEach((lab: any) => {
            const dateStr = lab.tarih ? format(parseISO(lab.tarih), 'dd.MM.yyyy') : 'Tarih Belirtilmemiş';
            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }
            groups[dateStr].push(lab);
        });
        return groups;
    }, [historyData]);

    const allExpanded = React.useMemo(() => {
        const dates = Object.keys(groupedHistory);
        if (dates.length === 0) return true;
        return dates.every(date => collapsedDates[date] !== true);
    }, [groupedHistory, collapsedDates]);

    const toggleAll = React.useCallback(() => {
        if (allExpanded) {
            // Collapse all
            const newCollapsed: Record<string, boolean> = {};
            Object.keys(groupedHistory).forEach(date => {
                newCollapsed[date] = true;
            });
            setCollapsedDates(newCollapsed);
        } else {
            // Expand all
            setCollapsedDates({});
        }
    }, [allExpanded, groupedHistory]);

    const handleQuickFilter = React.useCallback((testName: string) => {
        if (historySearch.toLowerCase() === testName.toLowerCase()) {
            onHistorySearchChange("");
        } else {
            onHistorySearchChange(testName);
        }
    }, [historySearch, onHistorySearchChange]);

    const getOrderSetStyle = (index: number) => {
        const styles = [
            "text-red-600 border-red-300 hover:bg-red-50",
            "text-amber-600 border-amber-300 hover:bg-amber-50",
            "text-blue-600 border-blue-300 hover:bg-blue-50",
            "text-purple-600 border-purple-300 hover:bg-purple-50",
            "text-emerald-600 border-emerald-300 hover:bg-emerald-50",
            "text-rose-600 border-rose-300 hover:bg-rose-50",
        ];
        return styles[index % styles.length];
    };

    return (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1">
                        {Object.keys(orderSets).map((setName, index) => (
                            <Button
                                key={setName}
                                variant="outline"
                                size="sm"
                                onClick={() => onApplyOrderSet(setName)}
                                className={cn(
                                    "h-6 text-[10px] font-bold uppercase tracking-wide border-dashed whitespace-nowrap flex-shrink-0",
                                    getOrderSetStyle(index)
                                )}
                            >
                                <Plus className="mr-1 h-3 w-3" /> {setName}
                            </Button>
                        ))}
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2 px-4 w-12 text-center">#</th>
                            <th className="py-2 px-4 w-32">Tarih</th>
                            <th className="py-2 px-4">Tetkik Adı</th>
                            <th className="py-2 px-4 w-48">Sonuç</th>
                            <th className="py-2 px-4 w-32">Birim</th>
                            <th className="py-2 px-4 w-40">Referans</th>
                            <th className="py-2 px-4 w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {fastLabRows.map((row, index) => (
                            <FastLabRow
                                key={row.id}
                                row={row}
                                index={index}
                                globalDate={globalDate}
                                onUpdate={onFastLabUpdate}
                                onRemove={onRemoveRow}
                                onKeyDown={onKeyDown}
                            />
                        ))}
                    </tbody>
                </table>
                <datalist id="testList">
                    <option value="GLUKOZ (AKŞ)" /><option value="GLUKOZ (TKŞ)" /><option value="HBA1C" /><option value="ÜRE" /><option value="KREATİNİN" /><option value="AST" /><option value="ALT" /><option value="GGT" /><option value="LDH" /><option value="ALP" /><option value="AMİLAZ" /><option value="LİPAZ" /><option value="TOTAL PROTEİN" /><option value="ALBUMİN" /><option value="TOTAL BİLİRUBİN" /><option value="DİREKT BİLİRUBİN" /><option value="SODYUM (Na)" /><option value="POTASYUM (K)" /><option value="KLOR (Cl)" /><option value="KALSİYUM (Ca)" /><option value="FOSFOR (P)" /><option value="MAGNEZYUM (Mg)" /><option value="DEMİR (Fe)" /><option value="DEMİR BAĞLAMA KAPASİTESİ (UIBC)" /><option value="FERRİTİN" /><option value="VİTAMİN B12" /><option value="FOLAT" /><option value="TSH" /><option value="SERBEST T3" /><option value="SERBEST T4" /><option value="TESTOSTERON (TOTAL)" /><option value="TESTOSTERON (SERBEST)" /><option value="WBC" /><option value="RBC" /><option value="HGB" /><option value="HCT" /><option value="PLT" /><option value="NEU%" /><option value="LYM%" /><option value="MON%" /><option value="EOS%" /><option value="BAS%" /><option value="MCV" /><option value="MCH" /><option value="MCHC" /><option value="RDW" /><option value="MPV" /><option value="SEDİMANTASYON" /><option value="CRP" /><option value="ASO" /><option value="RF" /><option value="PSA (TOTAL)" /><option value="PSA (SERBEST)" /><option value="İDRAR: GLUKOZ" /><option value="İDRAR: PROTEİN" /><option value="İDRAR: BİLİRUBİN" /><option value="İDRAR: ÜROBİLİNOJEN" /><option value="İDRAR: KETON" /><option value="İDRAR: NİTRİT" /><option value="İDRAR: LÖKOSİT ESTERAZ" /><option value="İDRAR: DANSİTE" /><option value="İDRAR: pH" /><option value="İDRAR: ERİTROSİT" /><option value="İDRAR: LÖKOSİT" />
                </datalist>
                <datalist id="unitList">
                    <option value="mg/dL" /><option value="g/dL" /><option value="ng/dL" /><option value="ng/mL" /><option value="µg/L" /><option value="mIU/mL" /><option value="U/L" /><option value="IU/L" /><option value="mm/h" /><option value="%" /><option value="pg/mL" /><option value="mmol/L" /><option value="fl" /><option value="K/µL" /><option value="M/µL" /><option value="mg/L" /><option value="g/L" />
                </datalist>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 uppercase">Geçmiş Sonuçlar</span>
                        <div className="relative flex items-center">
                            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Test Ara (Örn: PSA)..."
                                className="h-7 w-64 pl-8 pr-7 text-[11px] bg-white border-slate-200 focus:ring-blue-100"
                                value={historySearch}
                                onChange={(e) => onHistorySearchChange(e.target.value)}
                            />
                            {historySearch && (
                                <button
                                    onClick={() => onHistorySearchChange("")}
                                    className="absolute right-2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                                    type="button"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {['PSA', 'KREATİNİN', 'TESTOSTERON'].map((test) => {
                                const isActive = historySearch.toLowerCase() === test.toLowerCase();
                                return (
                                    <button
                                        key={test}
                                        type="button"
                                        onClick={() => handleQuickFilter(test)}
                                        className={cn(
                                            "h-6 px-2 text-[10px] font-bold rounded transition-all uppercase tracking-tight border cursor-pointer",
                                            isActive
                                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                                        )}
                                    >
                                        {test}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {historySearch.trim() === "" && Object.keys(groupedHistory).length > 0 && (
                        <Button
                            type="button"
                            onClick={toggleAll}
                            className="h-6 text-[10px] font-bold uppercase bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 hover:border-yellow-500 px-3 transition-colors rounded-md shadow-sm"
                        >
                            {allExpanded ? "GİZLE ▲" : "GÖSTER ▼"}
                        </Button>
                    )}
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="py-2 px-2 w-10 text-center">
                                    <Checkbox
                                        checked={historyData.length > 0 && selectedHistoryIds.length === historyData.length}
                                        onCheckedChange={onToggleSelectAllHistory}
                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-slate-300"
                                    />
                                </th>
                                <th className="py-2 px-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onToggleSort('tarih')}>
                                    <div className="flex items-center gap-1">
                                        Tarih
                                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'tarih' ? "text-blue-600" : "text-slate-300")} />
                                    </div>
                                </th>
                                <th className="py-2 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onToggleSort('tetkik_adi')}>
                                    <div className="flex items-center gap-1">
                                        Tetkik
                                        <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === 'tetkik_adi' ? "text-blue-600" : "text-slate-300")} />
                                    </div>
                                </th>
                                <th className="py-2 px-4 w-32">Sonuç</th>
                                <th className="py-2 px-4 w-24">Birim</th>
                                <th className="py-2 px-4 w-24">Referans</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {historyData.length === 0 ? (
                                <tr><td colSpan={6} className="p-4 text-center text-slate-400">Kayıt bulunamadı.</td></tr>
                            ) : historySearch.trim() !== "" ? (
                                // Search mode: flat list of results
                                historyData.map((lab: any) => {
                                    const isAbnormalResult = isResultAbnormal(lab.sonuc, lab.referans_araligi);
                                    return (
                                        <tr key={lab.id} className={cn("border-b border-slate-50 hover:bg-slate-50 transition-all", selectedHistoryIds.includes(lab.id) && "bg-blue-50/50")}>
                                            <td className="py-2 px-2 text-center">
                                                <Checkbox
                                                    checked={selectedHistoryIds.includes(lab.id)}
                                                    onCheckedChange={() => onToggleHistorySelection(lab.id)}
                                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-slate-300"
                                                />
                                            </td>
                                            <td className="py-2 px-4 font-mono text-slate-500">{lab.tarih ? format(parseISO(lab.tarih), 'dd.MM.yyyy') : '-'}</td>
                                            <td className="py-2 px-4 font-bold text-slate-700">
                                                <button
                                                    onClick={() => onTrendClick(lab.tetkik_adi)}
                                                    className="hover:text-blue-600 hover:underline flex items-center gap-1 group/btn text-left"
                                                >
                                                    {normalizeTestName(lab.tetkik_adi).toUpperCase()}
                                                    <LineChartIcon className="h-3 w-3 opacity-0 group-hover/btn:opacity-100 text-blue-500" />
                                                </button>
                                            </td>
                                            <td className={cn(
                                                "py-2 px-4 font-bold font-mono",
                                                isAbnormalResult ? "text-red-600" : "text-blue-600"
                                            )}>{formatLabDecimal(lab.sonuc)}</td>
                                            <td className="py-2 px-4 text-slate-500">{lab.birim}</td>
                                            <td className="py-2 px-4 text-slate-400 text-[10px] font-mono whitespace-nowrap">{formatRefRange(lab.referans_araligi) || '-'}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                // Normal mode: grouped by date
                                Object.entries(groupedHistory).map(([dateStr, groupTests]) => {
                                    const isExpanded = collapsedDates[dateStr] !== true;
                                    const allTestsSelected = groupTests.every(t => selectedHistoryIds.includes(t.id));

                                    return (
                                        <React.Fragment key={dateStr}>
                                            {/* Date Group Header Row */}
                                            <tr 
                                                className="bg-slate-100/70 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                                                onClick={() => toggleDate(dateStr)}
                                            >
                                                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={groupTests.length > 0 && allTestsSelected}
                                                        onCheckedChange={() => {
                                                            const targetState = !allTestsSelected;
                                                            groupTests.forEach(t => {
                                                                const isSelected = selectedHistoryIds.includes(t.id);
                                                                if (targetState && !isSelected) {
                                                                    onToggleHistorySelection(t.id);
                                                                } else if (!targetState && isSelected) {
                                                                    onToggleHistorySelection(t.id);
                                                                }
                                                            });
                                                        }}
                                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-slate-300"
                                                    />
                                                </td>
                                                <td colSpan={5} className="py-2 px-4 font-bold text-slate-700">
                                                    <div className="flex items-center justify-between">
                                                        <span>{dateStr} ({groupTests.length} Tetkik)</span>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                            {isExpanded ? 'Gizle ▼' : 'Göster ▲'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Date Group Test Rows */}
                                            {isExpanded && groupTests.map((lab: any) => {
                                                const isAbnormalResult = isResultAbnormal(lab.sonuc, lab.referans_araligi);
                                                return (
                                                    <tr key={lab.id} className={cn("border-b border-slate-50 hover:bg-slate-50 transition-all", selectedHistoryIds.includes(lab.id) && "bg-blue-50/50")}>
                                                        <td className="py-2 px-2 text-center">
                                                            <Checkbox
                                                                checked={selectedHistoryIds.includes(lab.id)}
                                                                onCheckedChange={() => onToggleHistorySelection(lab.id)}
                                                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-slate-300"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-4 font-mono text-slate-400">{lab.tarih ? format(parseISO(lab.tarih), 'dd.MM.yyyy') : '-'}</td>
                                                        <td className="py-2 px-4 font-bold text-slate-700">
                                                            <button
                                                                onClick={() => onTrendClick(lab.tetkik_adi)}
                                                                className="hover:text-blue-600 hover:underline flex items-center gap-1 group/btn text-left"
                                                            >
                                                                {normalizeTestName(lab.tetkik_adi).toUpperCase()}
                                                                <LineChartIcon className="h-3 w-3 opacity-0 group-hover/btn:opacity-100 text-blue-500" />
                                                            </button>
                                                        </td>
                                                        <td className={cn(
                                                            "py-2 px-4 font-bold font-mono",
                                                            isAbnormalResult ? "text-red-600" : "text-blue-600"
                                                        )}>{formatLabDecimal(lab.sonuc)}</td>
                                                        <td className="py-2 px-4 text-slate-500">{lab.birim}</td>
                                                        <td className="py-2 px-4 text-slate-400 text-[10px] font-mono whitespace-nowrap">{formatRefRange(lab.referans_araligi) || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

BiochemistrySection.displayName = 'BiochemistrySection';
