"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Stethoscope, User, GraduationCap, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api, Doktor } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function DoctorsSettings() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Doktor> | null>(null);

    const { data: doctors = [], isLoading } = useQuery({
        queryKey: ['definitions', 'doktorlar'],
        queryFn: () => api.definitions.doktorlar.list()
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Doktor>) => api.definitions.doktorlar.create(data),
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'doktorlar'] });
            setSelectedId(newDoc.id);
            toast.success("Doktor eklendi");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.definitions.doktorlar.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'doktorlar'] });
            setSelectedId(null);
            toast.success("Doktor silindi");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Doktor> }) => api.definitions.doktorlar.update(id, data),
        onSuccess: (updatedDoc) => {
            queryClient.invalidateQueries({ queryKey: ['definitions', 'doktorlar'] });
            setFormData(updatedDoc);
            toast.success("Doktor bilgileri güncellendi");
        }
    });

    const selectedDoc = doctors.find(d => d.id === selectedId);

    useEffect(() => {
        if (selectedDoc) {
            setFormData(selectedDoc);
        } else {
            setFormData(null);
        }
    }, [selectedId, selectedDoc]);

    const handleFieldChange = (field: keyof Doktor, value: any) => {
        if (!formData) return;
        setFormData((prev: any) => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleSave = () => {
        if (!selectedId || !formData) return;
        updateMutation.mutate({
            id: selectedId,
            data: formData
        });
    };

    const isChanged = JSON.stringify(formData) !== JSON.stringify(selectedDoc);

    const handleAdd = () => {
        createMutation.mutate({
            ad_soyad: "Yeni Doktor",
            brans: "Üroloji",
            aktif: true
        });
    };

    const handleDelete = (id: string) => {
        if (confirm("Bu doktoru silmek istediğinize emin misiniz?")) {
            deleteMutation.mutate(id);
        }
    };


    if (isLoading) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-12 gap-6 h-[600px]">
            {/* List Sidebar */}
            <div className="col-span-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Doktor Listesi</h3>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-emerald-50 hover:text-emerald-600" onClick={handleAdd} disabled={createMutation.isPending}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {doctors.map(doc => (
                        <button
                            key={doc.id}
                            onClick={() => setSelectedId(doc.id)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-3",
                                selectedId === doc.id ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100/50"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                selectedId === doc.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                            )}>
                                {doc.ad_soyad.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate">{doc.ad_soyad || "İsimsiz Doktor"}</span>
                        </button>
                    ))}
                    {doctors.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                            Henüz doktor eklenmemiş.
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="col-span-8">
                {selectedDoc ? (
                    <Card className="h-full border-slate-200 shadow-sm flex flex-col">
                        <div className="flex-1 p-6 space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Stethoscope className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Doktor Bilgileri</h2>
                                    <p className="text-sm text-slate-500">Reçete ve raporlarda kullanılacak resmi bilgiler</p>
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        onClick={handleSave}
                                        disabled={updateMutation.isPending || !isChanged}
                                    >
                                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Kaydet
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedDoc.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Sil
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <User className="w-3.5 h-3.5" /> Adı Soyadı
                                    </Label>
                                    <Input
                                        value={formData?.ad_soyad || ""}
                                        onChange={(e) => handleFieldChange('ad_soyad', e.target.value)}
                                        className="font-bold text-lg"
                                        placeholder="Dr. Ad Soyad"
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5" /> Branş
                                    </Label>
                                    <Input
                                        value={formData?.brans || ""}
                                        onChange={(e) => handleFieldChange('brans', e.target.value)}
                                        className="font-mono bg-slate-50"
                                        placeholder="Branş (Örn: Üroloji)"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <GraduationCap className="w-3.5 h-3.5" /> Diploma No
                                    </Label>
                                    <Input
                                        value={formData?.diploma_no || ""}
                                        onChange={(e) => handleFieldChange('diploma_no', e.target.value)}
                                        className="font-mono bg-slate-50"
                                        placeholder="Diploma No"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <GraduationCap className="w-3.5 h-3.5" /> Diploma Tescil No
                                    </Label>
                                    <Input
                                        value={formData?.tescil_no || ""}
                                        onChange={(e) => handleFieldChange('tescil_no', e.target.value)}
                                        className="font-mono bg-slate-50"
                                        placeholder="Tescil No"
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <GraduationCap className="w-3.5 h-3.5" /> Uzmanlık Diploma Tescil No
                                    </Label>
                                    <Input
                                        value={formData?.uzmanlik_tescil_no || ""}
                                        onChange={(e) => handleFieldChange('uzmanlik_tescil_no', e.target.value)}
                                        className="font-mono bg-slate-50"
                                        placeholder="Uzmanlık Tescil No"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        Düzenlemek için soldan bir doktor seçin veya yeni ekleyin.
                    </div>
                )}
            </div>
        </div>
    );
}
