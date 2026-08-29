"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, MapPin, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { api, BiyopsiSablonu } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function BiopsyTemplateSettings() {
    const queryClient = useQueryClient();
    const [no, setNo] = useState<number>(1);
    const [lokasyon, setLokasyon] = useState("");

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['definitions', 'biyopsi'],
        queryFn: () => api.definitions.biyopsiSablonlari.list()
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<BiyopsiSablonu>) => api.definitions.biyopsiSablonlari.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'biyopsi'] });
            setLokasyon("");
            setNo(no + 1);
            toast.success("Biyopsi şablonu eklendi");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.definitions.biyopsiSablonlari.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'biyopsi'] });
            toast.success("Biyopsi şablonu silindi");
        }
    });

    const handleAdd = () => {
        if (!lokasyon.trim()) return;
        createMutation.mutate({ no, lokasyon: lokasyon.trim(), aktif: true });
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Yükleniyor...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-emerald-100 bg-emerald-50/30 overflow-hidden">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Sıra No / Etiket</Label>
                        <Input
                            type="number"
                            value={no}
                            onChange={(e) => setNo(parseInt(e.target.value))}
                            className="bg-white"
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Lokasyon / Bölge</Label>
                        <Input
                            placeholder="Örn: Sağ Bazal Lateral"
                            value={lokasyon}
                            onChange={(e) => setLokasyon(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            className="bg-white"
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={createMutation.isPending || !lokasyon.trim()}>
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Ekle
                    </Button>
                </CardContent>
            </Card>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="col-span-2 text-center">No</div>
                    <div className="col-span-8">Lokasyon</div>
                    <div className="col-span-2 text-center">İşlem</div>
                </div>
                <div className="divide-y divide-slate-100">
                    {items.sort((a, b) => (a.no || 0) - (b.no || 0)).map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 p-3 items-center group hover:bg-slate-50 transition-colors">
                            <div className="col-span-2 text-center font-mono font-bold text-blue-600 bg-blue-50 py-1 rounded-lg border border-blue-100">
                                {item.no}
                            </div>
                            <div className="col-span-8 font-medium text-slate-700 flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                {item.lokasyon}
                            </div>
                            <div className="col-span-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-300 hover:text-red-500"
                                    onClick={() => deleteMutation.mutate(item.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="p-8 text-center text-slate-400 italic text-sm">
                            Henüz şablon eklenmemiş.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
