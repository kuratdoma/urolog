import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DocumentFormFieldsProps {
    title: string;
    setTitle: (val: string) => void;
    tags: string;
    setTags: (val: string) => void;
    category: string;
    setCategory: (val: string) => void;
    notes: string;
    setNotes: (val: string) => void;
}

export function DocumentFormFields({
    title,
    setTitle,
    tags,
    setTags,
    category,
    setCategory,
    notes,
    setNotes,
}: DocumentFormFieldsProps) {
    const categories = [
        "Epikriz",
        "Operasyon",
        "Patoloji",
        "Lab",
        "Radyoloji",
        "Onam",
        "Diğer"
    ];

    return (
        <div className="w-full md:w-[30%] space-y-4 shrink-0">
            {/* Belge Başlığı */}
            <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">BELGE BAŞLIĞI</Label>
                <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Örn: Patoloji Sonucu 2023"
                    className="bg-white font-extrabold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500 w-full"
                />
            </div>

            {/* Etiketler */}
            <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">ETİKETLER</Label>
                <Input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="Örn: MR, 2023, Ameliyat"
                    className="bg-white font-bold border-slate-200 h-10 placeholder:text-slate-300 shadow-sm focus:ring-emerald-500"
                />
            </div>

            {/* Belge Kategori */}
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">BELGE KATEGORİSİ</Label>
                <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                        <Button
                            key={cat}
                            type="button"
                            variant={category === cat ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCategory(cat)}
                            className={cn(
                                "h-9 px-4 text-[11px] font-black uppercase tracking-wider transition-all border-2 rounded-lg w-full justify-start",
                                category === cat
                                    ? "bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-600 shadow-none"
                                    : "bg-white text-slate-500 border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/50"
                            )}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Açıklama / Notlar */}
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">AÇIKLAMA / NOTLAR</Label>
                <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="min-h-[120px] bg-white border-slate-200 resize-none font-sans shadow-sm focus:ring-cyan-500"
                    placeholder="Belge ile ilgili detaylı notlar..."
                />
            </div>
        </div>
    );
}
