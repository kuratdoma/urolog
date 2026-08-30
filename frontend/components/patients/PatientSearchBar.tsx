import React from "react";
import { Search, X, SlidersHorizontal, ChevronDown, Download, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PatientSearchBarProps {
    adInput: string;
    setAdInput: (v: string) => void;
    soyadInput: string;
    setSoyadInput: (v: string) => void;
    onReset: () => void;
    showAdvanced: boolean;
    setShowAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
    isAdvancedActive: boolean;
    activeFilterCount: number;
    totalCount: number;
    isExporting: boolean;
    onExport: () => void;
    onAdvancedReset: () => void;
}

export function PatientSearchBar({
    adInput,
    setAdInput,
    soyadInput,
    setSoyadInput,
    onReset,
    showAdvanced,
    setShowAdvanced,
    isAdvancedActive,
    activeFilterCount,
    totalCount,
    isExporting,
    onExport,
    onAdvancedReset,
}: PatientSearchBarProps) {
    return (
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Temel Ad/Soyad Arama */}
            <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Ad ile ara..."
                        value={adInput}
                        onChange={(e) => {
                            setAdInput(e.target.value);
                            if (isAdvancedActive) onAdvancedReset();
                        }}
                        className="pl-9 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
                    />
                    {adInput && (
                        <button onClick={() => setAdInput('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Soyad ile ara..."
                        value={soyadInput}
                        onChange={(e) => {
                            setSoyadInput(e.target.value);
                            if (isAdvancedActive) onAdvancedReset();
                        }}
                        className="pl-9 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
                    />
                    {soyadInput && (
                        <button onClick={() => setSoyadInput('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {(adInput || soyadInput) && (
                    <Button variant="ghost" size="sm" onClick={onReset} className="text-slate-500 hover:text-slate-700 h-10 px-3">
                        <X className="h-4 w-4 mr-1" />
                        Temizle
                    </Button>
                )}
            </div>

            {/* Aksiyonlar ve Gelişmiş Arama Butonu */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <Button
                    variant={showAdvanced || isAdvancedActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowAdvanced(prev => !prev)}
                    className={cn(
                        "gap-2 text-xs font-semibold transition-all",
                        isAdvancedActive && "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600",
                        !isAdvancedActive && showAdvanced && "bg-slate-800 text-white",
                        !isAdvancedActive && !showAdvanced && "border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Gelişmiş Arama
                    {activeFilterCount > 0 && (
                        <span className="ml-1 bg-white/20 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
                </Button>

                {isAdvancedActive && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        disabled={isExporting}
                        className="gap-2 text-xs font-semibold border-slate-300 text-slate-600 hover:text-green-600 hover:border-green-300 hover:bg-green-50"
                    >
                        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        CSV İndir
                    </Button>
                )}
                <span className="text-sm font-medium text-slate-600">
                    <span className="font-bold text-slate-900">{totalCount}</span> hasta
                </span>
                <Link href="/patients/create">
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-sm border-0">
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Hasta
                    </Button>
                </Link>
            </div>
        </div>
    );
}
