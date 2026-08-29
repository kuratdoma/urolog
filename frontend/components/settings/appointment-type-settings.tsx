"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, Clock, Palette, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { api, RandevuTuru } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function AppointmentTypeSettings() {
    const queryClient = useQueryClient();
    const [ad, setAd] = useState("");
    const [sure, setSure] = useState(30);
    const [renk, setRenk] = useState("#3b82f6");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAd, setEditAd] = useState("");
    const [editSure, setEditSure] = useState(30);
    const [editRenk, setEditRenk] = useState("#3b82f6");

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['definitions', 'randevuTurleri'],
        queryFn: () => api.definitions.randevuTurleri.list()
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<RandevuTuru>) => api.definitions.randevuTurleri.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'randevuTurleri'] });
            setAd("");
            toast.success("Randevu türü eklendi");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<RandevuTuru> }) => api.definitions.randevuTurleri.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'randevuTurleri'] });
            toast.success("Randevu türü güncellendi");
            setEditingId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.definitions.randevuTurleri.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'randevuTurleri'] });
            toast.success("Randevu türü silindi");
        }
    });

    const handleAdd = () => {
        if (!ad.trim()) return;
        createMutation.mutate({ ad: ad.trim(), sure, renk, aktif: true });
    };

    const startEditing = (item: RandevuTuru) => {
        setEditingId(item.id);
        setEditAd(item.ad);
        setEditSure(item.sure || 30);
        setEditRenk(item.renk || "#3b82f6");
    };

    const handleUpdate = (id: string) => {
        if (!editAd.trim()) return;
        updateMutation.mutate({ id, data: { ad: editAd.trim(), sure: editSure, renk: editRenk } });
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
            <Card className="border-blue-100 bg-blue-50/30 overflow-hidden">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Randevu Türü Adı</Label>
                        <Input
                            placeholder="Örn: İlk Muayene"
                            value={ad}
                            onChange={(e) => setAd(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Süre (Dakika)</Label>
                        <Input
                            type="number"
                            value={sure}
                            onChange={(e) => setSure(parseInt(e.target.value))}
                            className="bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Takvim Rengi</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={renk}
                                onChange={(e) => setRenk(e.target.value)}
                                className="w-12 p-1 h-10 bg-white cursor-pointer"
                            />
                            <Button className="flex-1" onClick={handleAdd} disabled={createMutation.isPending || !ad.trim()}>
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Ekle
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                    <Card key={item.id} className="border-slate-200 group hover:border-blue-300 transition-all shadow-sm">
                        <CardContent className="p-4">
                            {editingId === item.id ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 gap-2">
                                        <Input
                                            value={editAd}
                                            onChange={(e) => setEditAd(e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder="Tür adı"
                                        />
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={editSure}
                                                onChange={(e) => setEditSure(parseInt(e.target.value))}
                                                className="h-8 w-20 text-sm"
                                            />
                                            <Input
                                                type="color"
                                                value={editRenk}
                                                onChange={(e) => setEditRenk(e.target.value)}
                                                className="w-10 p-0 h-8 cursor-pointer"
                                            />
                                            <div className="flex-1 flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => handleUpdate(item.id)}
                                                    disabled={updateMutation.isPending}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-4 h-12 rounded-full shadow-inner"
                                        style={{ backgroundColor: item.renk }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 truncate">{item.ad}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Clock className="w-3 h-3" />
                                                {item.sure} dk
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                                                <Palette className="w-3 h-3" />
                                                {item.renk}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                            onClick={() => startEditing(item)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            onClick={() => deleteMutation.mutate(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
