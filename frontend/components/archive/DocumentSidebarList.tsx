import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search, Archive, CheckSquare, Square, File as FileIcon
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface DocumentSidebarListProps {
    filterCategory: string;
    setFilterCategory: (cat: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredDocs: any[];
    selectedDocId: number | null;
    selectedDocIds: number[];
    handleSelectDoc: (doc: any) => void;
    toggleDocSelection: (id: number, e: React.MouseEvent) => void;
    selectAllDocs: () => void;
}

export function DocumentSidebarList({
    filterCategory,
    setFilterCategory,
    searchQuery,
    setSearchQuery,
    filteredDocs,
    selectedDocId,
    selectedDocIds,
    handleSelectDoc,
    toggleDocSelection,
    selectAllDocs,
}: DocumentSidebarListProps) {
    const categories = ["Hepsi", "Epikriz", "Operasyon", "Patoloji", "Lab", "Radyoloji", "Onam", "Diğer"];

    return (
        <aside className="w-full lg:w-96 flex flex-col gap-4">
            <div className="rounded-xl border border-white bg-white shadow-sm flex flex-col h-full overflow-hidden">
                {/* Header & Filter */}
                <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Archive className="w-4 h-4 text-blue-500" />
                            <h3 className="font-bold text-slate-800 text-sm">Kayıtlı Belgeler</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                {filteredDocs.length} Belge
                            </span>
                            {filteredDocs.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-blue-600 font-bold"
                                    onClick={selectAllDocs}
                                >
                                    {selectedDocIds.length === filteredDocs.length ? "Bırak" : "Tümünü Seç"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Belge veya etiket ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                        />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={filterCategory === cat ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterCategory(cat)}
                                className={cn(
                                    "h-6 px-2 text-[10px] rounded-full whitespace-nowrap",
                                    filterCategory === cat
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-600 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Document List */}
                <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
                    <div className="p-2 space-y-1">
                        {filteredDocs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Archive className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs">Belge bulunamadı</p>
                            </div>
                        ) : (
                            filteredDocs.map((doc: any) => (
                                <div
                                    key={doc.id}
                                    onClick={() => handleSelectDoc(doc)}
                                    className={cn(
                                        "p-3 rounded-lg border transition-all cursor-pointer flex items-start group relative",
                                        selectedDocId === doc.id
                                            ? "bg-blue-50/60 border-blue-200 shadow-sm"
                                            : "hover:bg-slate-50 border-transparent hover:border-slate-100",
                                        selectedDocIds.includes(doc.id) && "bg-blue-50/20 border-blue-200"
                                    )}
                                >
                                    <div
                                        className="mr-2 mt-1 z-10"
                                        onClick={(e) => toggleDocSelection(doc.id, e)}
                                    >
                                        {selectedDocIds.includes(doc.id) ? (
                                            <CheckSquare className="w-4 h-4 text-blue-500 transition-all scale-110" />
                                        ) : (
                                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-400 transition-all" />
                                        )}
                                    </div>
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0",
                                        doc.dosya_tipi === 'PDF' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                                    )}>
                                        <FileIcon className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h4 className={cn(
                                                "text-xs font-bold truncate",
                                                selectedDocId === doc.id ? "text-blue-700" : "text-slate-700"
                                            )}>
                                                {doc.dosya_adi || 'İsimsiz Belge'}
                                            </h4>
                                            <span className="text-[9px] text-slate-400 shrink-0">
                                                {doc.tarih ? format(parseISO(doc.tarih), 'dd.MM.yyyy') : '-'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                                            {doc.kategori && (
                                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                                    {doc.kategori}
                                                </span>
                                            )}
                                            {doc.etiketler && (
                                                <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium border border-blue-100 truncate max-w-[100px]">
                                                    {doc.etiketler}
                                                </span>
                                            )}
                                        </div>

                                        {doc.aciklama && (
                                            <p className="text-[10px] text-slate-400 truncate leading-relaxed pl-1 border-l-2 border-slate-100">
                                                {doc.aciklama}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </aside>
    );
}
