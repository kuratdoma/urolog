"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LipusIIEFForm } from "./LipusIIEFForm";
import { Activity, Stethoscope, Beaker, FileText, AlertTriangle, Save, Loader2, Calendar, Clock } from "lucide-react";
import { formatLabDecimal } from "@/lib/lab-utils";
import { format, subDays, addDays } from "date-fns";
import { PEQuestion } from "@/components/examination/shared/PEQuestion";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IIEFForm } from "@/components/examination/forms/iief";
import { IIEFData } from "@/components/examination/forms/iief/schema";
import { Card } from "@/components/ui/card";

export interface LipusFormProps {
    patientId: string;
    initialData?: any;
    firstSessionDate?: string | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export interface LipusFormData {
    takip_donemi: string;
    ed_tedavisi_6ay: string;
    pde5_yaniti: string;
    pde5_kullanim: string;
    ek_tedavi: string;
    alerji_var: boolean;
    cerrahi_oyku: string;
    kullanilan_ilaclar: string;
    iief_s1: number | null;
    iief_s2: number | null;
    iief_s3: number | null;
    iief_s4: number | null;
    iief_s5: number | null;
    iief_s6: number | null;
    iief_total: number | null;
    sep2: string;
    sep3: string;
    gaq1: string;
    gaq2: string;
    ehs_skor: number | null;
    memnuniyet_sabah: number | null;
    memnuniyet_cinsel: number | null;
    memnuniyet_mast: number | null;
    vas_skor: number | null;
    yan_etki_kizariklik: boolean;
    yan_etki_morarma: boolean;
    yan_etki_hematuri: boolean;
    yan_etki_yanma: boolean;
    yan_etki_diger: string;
    [key: string]: any;
}

export function LipusForm({ patientId, initialData, firstSessionDate, onSuccess, onCancel }: LipusFormProps) {
    const queryClient = useQueryClient();
    const isEditing = !!initialData;

    const [isIiefDialogOpen, setIsIiefDialogOpen] = useState(false);

    const [formData, setFormData] = useState<LipusFormData>(() => {
        const defaultValues: LipusFormData = {
            takip_donemi: "Tarama",
            ed_tedavisi_6ay: "Yok",
            pde5_yaniti: "",
            pde5_kullanim: "",
            ek_tedavi: "",
            alerji_var: false,
            cerrahi_oyku: "",
            eslik_eden_hastalik: "",
            kullanilan_ilaclar: "",
            // IIEF Form fields (6 questions now)
            iief_s1: null,
            iief_s2: null,
            iief_s3: null,
            iief_s4: null,
            iief_s5: null,
            iief_s6: null,
            iief_total: null,
            // Diğer skorlar
            sep2: "",
            sep3: "",
            gaq1: "",
            gaq2: "",
            ehs_skor: null,
            memnuniyet_sabah: null,
            memnuniyet_cinsel: null,
            memnuniyet_mast: null,
            // Yan etkiler
            vas_skor: null,
            yan_etki_kizariklik: false,
            yan_etki_morarma: false,
            yan_etki_hematuri: false,
            yan_etki_yanma: false,
            yan_etki_diger: ""
        };

        if (initialData) {
            return {
                ...defaultValues,
                ...initialData,
                ed_tedavisi_6ay: initialData.ed_tedavisi_6ay || "Yok",
                pde5_yaniti: initialData.pde5_yaniti ?? "",
                pde5_kullanim: initialData.pde5_kullanim ?? "",
                ek_tedavi: initialData.ek_tedavi ?? "",
                sep2: initialData.sep2 ?? "",
                sep3: initialData.sep3 ?? "",
                gaq1: initialData.gaq1 ?? "",
                gaq2: initialData.gaq2 ?? "",
                cerrahi_oyku: initialData.cerrahi_oyku ?? "",
                eslik_eden_hastalik: initialData.eslik_eden_hastalik ?? "",
                kullanilan_ilaclar: initialData.kullanilan_ilaclar ?? "",
                yan_etki_diger: initialData.yan_etki_diger ?? ""
            };
        }
        return defaultValues;
    });

    const [tarih, setTarih] = useState<string>(
        initialData?.tarih ? format(new Date(initialData.tarih), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    );

    // --- IIEF DATA MAPPING ---
    const iiefValue: IIEFData = useMemo(() => ({
        q1: (formData.iief_s1 || "").toString(),
        q2: (formData.iief_s2 || "").toString(),
        q3: (formData.iief_s3 || "").toString(),
        q4: (formData.iief_s4 || "").toString(),
        q5: (formData.iief_s5 || "").toString(),
        q6: (formData.iief_s6 || "").toString(),
        iief_total: (formData.iief_total || "").toString()
    }), [formData]);

    const handleIIEFChange = (newData: IIEFData) => {
        const iief_s1 = parseInt(newData.q1) || 0;
        const iief_s2 = parseInt(newData.q2) || 0;
        const iief_s3 = parseInt(newData.q3) || 0;
        const iief_s4 = parseInt(newData.q4) || 0;
        const iief_s5 = parseInt(newData.q5) || 0;
        const iief_s6 = parseInt(newData.q6) || 0;
        
        const iief_total = iief_s1 + iief_s2 + iief_s3 + iief_s4 + iief_s5 + iief_s6;

        setFormData((prev: LipusFormData) => ({
            ...prev,
            iief_s1, iief_s2, iief_s3, iief_s4, iief_s5, iief_s6,
            iief_total
        }));
    };

    // --- FUZZY LAB MATCHING ---
    const { data: recentLabs, isLoading: labsLoading } = useQuery({
        queryKey: ["fuzzy-labs", patientId, tarih],
        queryFn: async () => {
            const labs = await api.clinical.getLabs(patientId, "all");
            const baseDate = new Date(tarih);
            const start = subDays(baseDate, 7);
            const end = addDays(baseDate, 7);

            return labs.filter((lab: Record<string, unknown>) => {
                if (!lab.tarih) return false;
                const labDate = new Date(lab.tarih as string);
                return labDate >= start && labDate <= end;
            });
        },
    });

    // --- MUTATIONS ---
    const mutation = useMutation({
        mutationFn: async (dataToSubmit: any) => {
            if (isEditing) {
                return api.lipus.updateDetails(initialData.id, dataToSubmit);
            } else {
                const muayeneData = {
                    hasta_id: patientId,
                    tarih: tarih,
                    sikayet: `Lipus Seansı: ${dataToSubmit.takip_donemi}`,
                    tani1: "Erektil Disfonksiyon"
                };
                const newMuayene = await api.clinical.createMuayene(muayeneData);
                
                return api.lipus.createDetails({
                    ...dataToSubmit,
                    muayene_id: newMuayene.id
                });
            }
        },
        onSuccess: () => {
            toast.success(isEditing ? "Veriler güncellendi!" : "Yeni seans eklendi!");
            queryClient.invalidateQueries({ queryKey: ["lipus-dashboard", patientId] });
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            toast.error(`Kayıt hatası: ${err.message}`);
        }
    });

    const handleSave = () => {
        let calculatedDonemi = formData.takip_donemi || "0. Hafta";
        const isEditingFirstSession = isEditing && initialData?.id && firstSessionDate && new Date(initialData.tarih).getTime() === new Date(firstSessionDate).getTime();
        
        if (!firstSessionDate || isEditingFirstSession) {
            calculatedDonemi = "0. Hafta";
        } else {
            const t0 = new Date(firstSessionDate).getTime();
            const t1 = new Date(tarih).getTime();
            const diffDays = Math.round((t1 - t0) / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 3) {
                calculatedDonemi = "0. Hafta";
            } else {
                const weeks = Math.round(diffDays / 7);
                calculatedDonemi = `${weeks}. Hafta`;
            }
        }

        mutation.mutate({
            ...formData,
            takip_donemi: calculatedDonemi
        });
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const binaryOptions = [
        { value: "Evet", label: "Evet" },
        { value: "Hayır", label: "Hayır" }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                    <Clock className="w-32 h-32 text-indigo-900" />
                </div>

                <div className="w-full xl:w-48 space-y-2 relative z-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                        <Calendar className="w-3 h-3 text-indigo-500" /> İŞLEM TARİHİ
                    </label>
                    <Input 
                        type="date" 
                        value={tarih} 
                        onChange={(e) => setTarih(e.target.value)} 
                        className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-slate-700 rounded-xl"
                    />
                </div>

                <div className="flex-1 space-y-2 relative z-10 hidden">
                    {/* Automatically calculated, hidden in UI */}
                    <Input type="hidden" value={formData.takip_donemi} />
                </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* SOL KOLON */}
            <div className="space-y-6">
                
                {/* 1. IIEF-5 (Now 6 questions) */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-indigo-200">
                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                            <FileText className="w-4 h-4"/>
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">IIEF-EF Skorlaması</h3>
                    </div>
                    <div className="p-4">
                        <LipusIIEFForm formData={formData} onOpenDialog={() => setIsIiefDialogOpen(true)} />
                    </div>
                </div>

                {/* 2. Diğer Klinik Skorlar */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-cyan-200">
                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
                            <Activity className="w-4 h-4"/>
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">Klinik Skorlar & Sorular (EHS, SEP, GAQ)</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <PEQuestion
                                label="EHS Skoru"
                                description="Erektil Sertlik Skoru (1: Peniste büyüme var sertlik yok, 4: Tam sertlik)"
                                value={formData.ehs_skor?.toString()}
                                onChange={(val) => handleChange("ehs_skor", parseInt(val))}
                                options={[
                                    { value: "1", label: "1" },
                                    { value: "2", label: "2" },
                                    { value: "3", label: "3" },
                                    { value: "4", label: "4" }
                                ]}
                                activeColor="cyan"
                                compact
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <PEQuestion
                                    label="GAQ 1"
                                    description="Tedavi ereksiyonlarda düzelme sağladı mı?"
                                    value={formData.gaq1}
                                    onChange={(val) => handleChange("gaq1", val)}
                                    options={binaryOptions}
                                    activeColor="cyan"
                                    compact
                                />
                                <PEQuestion
                                    label="GAQ 2"
                                    description="Cinsel yaşamınızda düzelme sağladı mı?"
                                    value={formData.gaq2}
                                    onChange={(val) => handleChange("gaq2", val)}
                                    options={binaryOptions}
                                    activeColor="cyan"
                                    compact
                                />
                                <PEQuestion
                                    label="SEP 2"
                                    description="Penetrasyon için yeterli sertleşme oldu mu?"
                                    value={formData.sep2}
                                    onChange={(val) => handleChange("sep2", val)}
                                    options={binaryOptions}
                                    activeColor="cyan"
                                    compact
                                />
                                <PEQuestion
                                    label="SEP 3"
                                    description="Ereksiyon sürdürülebildi mi?"
                                    value={formData.sep3}
                                    onChange={(val) => handleChange("sep3", val)}
                                    options={binaryOptions}
                                    activeColor="cyan"
                                    compact
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Labs */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-cyan-200">
                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
                            <Beaker className="w-4 h-4"/>
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">Biyokimya / Laboratuvar (+/- 7 Gün)</h3>
                    </div>
                    <div className="p-4 bg-slate-50/30">
                        {labsLoading ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> Aranıyor...</div>
                        ) : recentLabs && recentLabs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {recentLabs.map((lab: any) => (
                                    <Card key={lab.id} className="p-3 bg-white shadow-sm border-slate-200 border-l-4 border-l-cyan-500">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-800 text-xs line-clamp-1">{lab.tetkik_adi || "Laboratuvar Sonucu"}</span>
                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                <span>{format(new Date(lab.tarih), 'dd.MM')}</span>
                                                <span className="bg-cyan-50 text-cyan-700 px-1 rounded font-bold">{formatLabDecimal(lab.sonuc)}</span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-xs text-slate-400 italic">Laboratuvar sonucu bulunamadı.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* SAĞ KOLON */}
            <div className="space-y-6">
                
                {/* 3. Genel Durum */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-emerald-200">
                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                            <Stethoscope className="w-4 h-4"/>
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">Tıbbi Özgeçmiş & Durum</h3>
                    </div>
                    <div className="p-4 bg-slate-50/30">
                        <div className="space-y-3">
                            <PEQuestion 
                                label="Son 6 Ayda ED Tedavisi" 
                                description="Son 6 ayda uygulanan erektil disfonksiyon tedavisi"
                                value={formData.ed_tedavisi_6ay && formData.ed_tedavisi_6ay !== "Yok" ? "Var" : "Yok"} 
                                onChange={(val) => {
                                    if (val === "Yok") {
                                        handleChange("ed_tedavisi_6ay", "Yok");
                                    } else {
                                        handleChange("ed_tedavisi_6ay", "");
                                    }
                                }}
                                options={[
                                    { value: "Var", label: "Var" },
                                    { value: "Yok", label: "Yok" }
                                ]}
                                activeColor="emerald"
                                compact
                            />
                            {formData.ed_tedavisi_6ay !== "Yok" && (
                                <div className="space-y-1.5 p-3 bg-white border border-slate-100 rounded-xl">
                                    <label className="text-xs font-bold text-slate-700">Uygulanan Tedavi Detayı</label>
                                    <Input 
                                        value={formData.ed_tedavisi_6ay === "Var" ? "" : formData.ed_tedavisi_6ay} 
                                        onChange={(e) => handleChange("ed_tedavisi_6ay", e.target.value)} 
                                        placeholder="Örn: Cialis 5mg rutin" 
                                        className="bg-white h-9 text-sm" 
                                    />
                                </div>
                            )}
                            <PEQuestion 
                                label="PDE5-I Yanıt Durumu" 
                                description="Genel klinik yanıt düzeyi"
                                value={formData.pde5_yaniti} 
                                onChange={(val) => handleChange("pde5_yaniti", val)}
                                options={[
                                    { value: "Var", label: "Var" },
                                    { value: "Yok", label: "Yok" },
                                    { value: "Kısmen", label: "Kısmen" }
                                ]}
                                activeColor="emerald"
                                compact
                            />
                            <PEQuestion 
                                label="Lipus Sırasında PDE5-I Kullanımı" 
                                description="İşlem periyodu boyunca kullanılan inhibitör"
                                value={formData.pde5_kullanim} 
                                onChange={(val) => handleChange("pde5_kullanim", val)}
                                options={[
                                    { value: "Yok", label: "Yok" },
                                    { value: "Tadalafil 5 mg 1x1", label: "Tadalafil 5 mg 1x1" },
                                    { value: "Tadalafil 10 mg 1x1", label: "Tadalafil 10 mg 1x1" },
                                    { value: "Tadalafil 20 mg On-demand", label: "Tadalafil 20 mg On-demand" },
                                    { value: "Sildenafil 25 mg", label: "Sildenafil 25 mg" },
                                    { value: "Sildenafil 50 mg", label: "Sildenafil 50 mg" },
                                    { value: "Sildenafil 100 mg", label: "Sildenafil 100 mg" }
                                ]}
                                activeColor="emerald"
                                compact
                            />
                            <PEQuestion 
                                label="Eşlik Eden Ek Tedaviler" 
                                description="Lipus ile birlikte uygulanan rejeneratif tedaviler"
                                value={formData.ek_tedavi} 
                                onChange={(val) => handleChange("ek_tedavi", val)}
                                options={[
                                    { value: "Yok", label: "Yok" },
                                    { value: "PRP", label: "PRP" },
                                    { value: "Exosome", label: "Exosome" },
                                    { value: "SVF", label: "SVF" },
                                    { value: "Kök Hücre", label: "Kök Hücre" }
                                ]}
                                activeColor="emerald"
                                compact
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Yan Etkiler */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-orange-200">
                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                            <AlertTriangle className="w-4 h-4"/>
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">Güvenlik & Komplikasyonlar</h3>
                    </div>
                    <div className="p-4 bg-slate-50/30 space-y-4">
                        <PEQuestion
                            label="VAS Ağrı Skoru"
                            description="İşlem sırasında hissedilen ağrı (0: Yok, 10: Dayanılmaz)"
                            value={formData.vas_skor?.toString()}
                            onChange={(val) => handleChange("vas_skor", parseInt(val))}
                            options={[
                                { value: "0", label: "0" }, { value: "1", label: "1" }, { value: "2", label: "2" },
                                { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" },
                                { value: "6", label: "6" }, { value: "7", label: "7" }, { value: "8", label: "8" },
                                { value: "9", label: "9" }, { value: "10", label: "10" }
                            ]}
                            activeColor="rose"
                            compact
                        />
                        <div className="grid grid-cols-2 gap-2 bg-white p-3 border rounded-xl shadow-sm">
                            <div className="col-span-2 mb-1">
                                <label className="text-xs font-bold text-slate-700">Gözlemlenen Yan Etkiler</label>
                            </div>
                            <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent has-[:checked]:border-orange-200 has-[:checked]:bg-orange-50/50">
                                <Checkbox 
                                    id="yan-yok" 
                                    checked={!formData.yan_etki_kizariklik && !formData.yan_etki_morarma && !formData.yan_etki_hematuri && !formData.yan_etki_yanma} 
                                    onCheckedChange={(c) => {
                                        if (c) {
                                            setFormData((prev: any) => ({
                                                ...prev,
                                                yan_etki_kizariklik: false,
                                                yan_etki_morarma: false,
                                                yan_etki_hematuri: false,
                                                yan_etki_yanma: false
                                            }));
                                        }
                                    }} 
                                />
                                <label htmlFor="yan-yok" className="text-xs font-bold text-orange-600 cursor-pointer italic">YOK</label>
                            </div>
                            {[
                                { id: "kiz", field: "yan_etki_kizariklik", label: "Kızarıklık" },
                                { id: "mor", field: "yan_etki_morarma", label: "Morarma" },
                                { id: "hem", field: "yan_etki_hematuri", label: "Hematüri" },
                                { id: "yan", field: "yan_etki_yanma", label: "Yanma" }
                            ].map(item => (
                                <div key={item.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                                    <Checkbox 
                                        id={item.id} 
                                        checked={formData[item.field]} 
                                        onCheckedChange={(c) => handleChange(item.field, !!c)} 
                                    />
                                    <label htmlFor={item.id} className="text-xs font-medium text-slate-600 cursor-pointer">{item.label}</label>
                                </div>
                            ))}
                            <div className="col-span-2 mt-2">
                                <Input value={formData.yan_etki_diger} onChange={(e) => handleChange("yan_etki_diger", e.target.value)} placeholder="Diğer yan etkiler..." className="bg-slate-50/50 border-slate-200 h-8 text-xs" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

            <div className="flex justify-end gap-3 pt-6 sticky bottom-4 z-20">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} className="h-12 bg-white border-slate-200 text-slate-500 font-bold px-6 rounded-xl hover:bg-slate-50 shadow-sm">
                        İPTAL
                    </Button>
                )}
                <Button 
                    onClick={handleSave} 
                    className="h-12 bg-indigo-600 hover:bg-indigo-700 font-black px-10 text-white shadow-xl shadow-indigo-100 transition-all hover:shadow-indigo-200 hover:scale-[1.02] active:scale-95 rounded-xl border-b-4 border-indigo-800"
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> İŞLENİYOR...</>
                    ) : (
                        <><Save className="w-5 h-5 mr-2" /> VERİLERİ KAYDET</>
                    )}
                </Button>
            </div>

            {/* IIEF Dialog */}
            <Dialog open={isIiefDialogOpen} onOpenChange={setIsIiefDialogOpen}>
                <DialogContent className="max-w-4xl bg-white p-0 gap-0 border-none shadow-2xl rounded-3xl overflow-hidden">
                    <DialogHeader className="p-6 bg-gradient-to-r from-indigo-600 to-violet-700 text-white">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            IIEF-EF Değerlendirme Formu
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-6 bg-slate-50/30">
                        <IIEFForm 
                            value={iiefValue} 
                            onChange={handleIIEFChange} 
                        />
                    </ScrollArea>
                    <DialogFooter className="p-6 bg-white border-t border-slate-100">
                        <Button 
                            onClick={() => setIsIiefDialogOpen(false)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 rounded-xl shadow-lg shadow-indigo-100"
                        >
                            TAMAMLA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

