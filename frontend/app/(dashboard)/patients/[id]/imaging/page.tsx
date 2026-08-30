"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { api, Imaging } from "@/lib/api";
import { ProstateMapWidget, PiradsLesion } from "@/components/clinical/prostate-map";
import { format, parseISO } from "date-fns";
import {
    Calendar as Plus,
    Save,
    Trash2,
    Printer,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SystemQueryCombobox } from "@/components/clinical/system-query-combobox";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function ImagingPage() {
    const params = useParams();
    const patientId = String(params.id);
    const queryClient = useQueryClient();

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [examType, setExamType] = useState<string>("");
    const [symbol, setSymbol] = useState<string>("");
    const [result, setResult] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hasAutoSelected, setHasAutoSelected] = useState(false);
    const [piradsLesions, setPiradsLesions] = useState<PiradsLesion[]>([]);

    // mpMRI Prostat mı? — haritayı SADECE bu tetkik tipinde göster
    const isMriType = useMemo(() => {
        return examType === 'mpMRI Prostat';
    }, [examType]);

    /** JSON separator — sonuc metninde lezyon verisini ayırmak için */
    const LESION_SEPARATOR = '\n---PIRADS_LESIONS---\n';

    /**
     * Sonuç metninden lezyon JSON'unu çıkar
     */
    const extractLesionsFromResult = useCallback((text: string): { cleanText: string; lesions: PiradsLesion[] } => {
        const idx = text.indexOf(LESION_SEPARATOR);
        if (idx === -1) return { cleanText: text, lesions: [] };
        const cleanText = text.substring(0, idx);
        const jsonStr = text.substring(idx + LESION_SEPARATOR.length);
        try {
            const lesions = JSON.parse(jsonStr) as PiradsLesion[];
            return { cleanText, lesions };
        } catch {
            return { cleanText: text, lesions: [] };
        }
    }, [LESION_SEPARATOR]);

    /**
     * Sonuç metnine lezyon JSON'unu göm
     */
    const embedLesionsInResult = useCallback((text: string, lesions: PiradsLesion[]): string => {
        // Eski JSON'u temizle
        const idx = text.indexOf(LESION_SEPARATOR);
        const cleanText = idx === -1 ? text : text.substring(0, idx);
        if (lesions.length === 0) return cleanText;
        return cleanText + LESION_SEPARATOR + JSON.stringify(lesions);
    }, [LESION_SEPARATOR]);

    // Fetch Patient
    const { data: patient } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => api.patients.get(patientId),
    });

    // Fetch Imagings
    const { data: imagings = [] } = useQuery({
        queryKey: ['imagings', patientId],
        queryFn: () => api.clinical.getImagings(patientId),
    });

    // --- API: Sharded Definitions ---
    const { data: shardedTetkikler = [] } = useQuery({
        queryKey: ['definitions', 'tetkik-tanimlari', 'RADYOLOJI'],
        queryFn: () => api.definitions.tetkikTanimlari.list('RADYOLOJI'),
    });

    const imagingDefinitions = useMemo(() => {
        const base = shardedTetkikler.length > 0
            ? shardedTetkikler.map(t => t.ad)
            : ['Tüm Batın USG', 'Üriner Sistem USG', 'Scrotal USG', 'Transrektal USG', 'Akciğer Grafisi', 'DÜSG', 'IVP', 'BT (Bilgisayarlı Tomografi)', 'MR (Manyetik Rezonans)'];
        // mpMRI Prostat listede yoksa ekle
        if (!base.includes('mpMRI Prostat')) {
            base.push('mpMRI Prostat');
        }
        return base;
    }, [shardedTetkikler]);

    // Sort imagings
    const sortedImagings = [...imagings].sort((a, b) =>
        new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime()
    );

    // Auto-select latest
    useEffect(() => {
        if (!hasAutoSelected && sortedImagings.length > 0) {
            handleSelect(sortedImagings[0]);
            setHasAutoSelected(true);
        }
    }, [sortedImagings, hasAutoSelected]);

    // Mutations
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!date) throw new Error("Tarih gerekli");

            // MR tipi için lezyon verisini sonuca göm
            const finalResult = isMriType
                ? embedLesionsInResult(result, piradsLesions)
                : result;

            const payload = {
                hasta_id: patientId,
                tarih: format(date, 'yyyy-MM-dd'),
                tetkik_adi: examType,
                sembol: symbol,
                sonuc: finalResult
            };

            // If selectedId exists, update; otherwise create
            if (selectedId) {
                return api.clinical.updateImaging(selectedId, payload);
            }

            return api.clinical.createImaging(payload);
        },
        onSuccess: () => {
            toast.success(selectedId ? "Görüntüleme tetkiki güncellendi" : "Görüntüleme tetkiki kaydedildi");
            queryClient.invalidateQueries({ queryKey: ['imagings', patientId] });
        },
        onError: () => {
            toast.error("Kayıt başarısız");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.clinical.deleteImaging(id);
        },
        onSuccess: () => {
            toast.success("Görüntüleme tetkiki silindi");
            queryClient.invalidateQueries({ queryKey: ['imagings', patientId] });
            handleNew();
        },
        onError: () => {
            toast.error("Silme işlemi başarısız");
        }
    });

    const handleNew = () => {
        setSelectedId(null);
        setDate(new Date());
        setExamType("");
        setSymbol("");
        setResult("");
        setPiradsLesions([]);
        toast.info("Yeni görüntüleme tetkik formu açıldı");
    };

    const handleSelect = (item: Imaging) => {
        setSelectedId(item.id);
        setDate(item.tarih ? parseISO(item.tarih) : new Date());
        setExamType(item.tetkik_adi || "");
        setSymbol(item.sembol || "");

        // Sonuçtan lezyon verisini ayır
        const rawResult = item.sonuc || "";
        const { cleanText, lesions } = extractLesionsFromResult(rawResult);
        setResult(cleanText);
        setPiradsLesions(lesions);
    };

    const handlePrint = () => {
        if (!selectedId) {
            toast.error("Lütfen yazdırmak için bir kayıt seçiniz.");
            return;
        }
        window.open(`/print/imaging/${selectedId}`, "_blank");
    };

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        onSave: () => {
            if (!saveMutation.isPending) {
                saveMutation.mutate();
            }
        }
    });

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            <title>Görüntüleme Tetkik | UroLog</title>
            {/* Left Side: Main Content */}
            <div className="flex-1 space-y-6">

                {/* Patient Header Card */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-600">
                            {patient?.ad?.charAt(0)}{patient?.soyad?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">
                                {patient?.ad} {patient?.soyad}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-mono">TC: {patient?.tc_kimlik || '---'}</span>
                                <span>•</span>
                                <span>{patient?.dogum_tarihi ? format(parseISO(patient.dogum_tarihi), 'dd.MM.yyyy') : '-'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">MODÜL</span>
                        <span className="text-sm font-semibold text-slate-700">Radyoloji & Görüntüleme</span>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-2 flex items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-px bg-slate-200 mx-2 hidden lg:block"></div>
                        <Button
                            type="button"
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                        >
                            <Save className="h-3 w-3" />
                            {saveMutation.isPending ? "Kaydediliyor..." : (selectedId ? "Güncelle" : "Kaydet")}
                        </Button>

                        {selectedId && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 uppercase text-xs tracking-wide shadow-sm"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Sil
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Silmek istediğinize emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Bu işlem geri alınamaz. Bu görüntüleme tetkiki kalıcı olarak silinecektir.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                            onClick={() => deleteMutation.mutate(selectedId)}
                                        >
                                            Sil
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                        title="Yazdır"
                        onClick={handlePrint}
                    >
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>

                {/* Form Content */}
                <div className="rounded-xl border border-white bg-white shadow-sm p-6 space-y-6">
                    {/* Controls Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Date */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TARİH</Label>
                            <DatePicker
                                date={date ? format(date, 'yyyy-MM-dd') : ''}
                                setDate={val => setDate(val ? parseISO(val) : undefined)}
                                className="w-full bg-slate-50 border-slate-200 h-10"
                            />
                        </div>

                        {/* Görüntüleme Tetkik */}
                        <div className="flex flex-col">
                            <SystemQueryCombobox
                                label="GÖRÜNTÜLEME TETKİK"
                                value={examType}
                                onChange={setExamType}
                                options={imagingDefinitions}
                                placeholder="Seçiniz veya yazınız..."
                                className="!flex-col !items-start gap-2"
                                inputClassName="h-10 text-sm"
                            />
                        </div>

                        {/* Symbol */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SEMBOL</Label>
                            <Select value={symbol} onValueChange={setSymbol}>
                                <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-10">
                                    <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="important">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-500" />
                                            <span>Önemli</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="check">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span>Tamamlandı</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="warning">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                            <span>Uyarı</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="info">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-blue-500" />
                                            <span>Bilgi</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Result Box */}
                <div className="rounded-xl border border-white bg-white shadow-sm flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">GÖRÜNTÜLEME TETKİK SONUCU</h3>
                        </div>
                        <div className="text-[10px] text-slate-400 italic">
                            Geçmiş görüntüleme tetkiklerine tıklayarak içeriği buraya aktarabilirsiniz.
                        </div>
                    </div>
                    <div className="p-4">
                        <Textarea
                            value={result}
                            onChange={(e) => setResult(e.target.value)}
                            placeholder="Rapor metni buraya ..."
                            rows={10}
                            className="w-full border-0 resize-y focus-visible:ring-0 text-sm md:text-base text-slate-700 placeholder:text-slate-300 font-mono"
                            style={{ fontFamily: 'monospace' }}
                        />
                    </div>
                </div>

                {/* mpMRI Prostat Haritası — MR tipi seçildiğinde görünür */}
                {isMriType && (
                    <ProstateMapWidget
                        lesions={piradsLesions}
                        onLesionsChange={setPiradsLesions}
                    />
                )}

            </div>

            {/* Right Side: Sidebar */}
            <div className="w-full lg:w-[240px] space-y-4 shrink-0">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    size="lg"
                    onClick={handleNew}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Yeni Görüntüleme
                </Button>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[calc(100vh-100px)] sticky top-6">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">GEÇMİŞ KAYITLAR</h3>
                        <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {sortedImagings.length}
                        </span>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-slate-50">
                            {sortedImagings.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    Kayıt bulunamadı.
                                </div>
                            ) : (
                                sortedImagings.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={cn(
                                            "w-full flex items-start px-4 py-3 text-left transition-all hover:bg-slate-50 group border-l-4",
                                            selectedId === item.id ? "bg-blue-50/50 border-blue-500" : "border-transparent"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0 flex flex-col gap-1 text-slate-700">
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                                {item.sembol === 'important' && <AlertCircle className="h-3 w-3 text-orange-500 shrink-0" />}
                                                {item.sembol === 'check' && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                                                {item.sembol === 'warning' && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                                                {item.sembol === 'info' && <Info className="h-3 w-3 text-blue-500 shrink-0" />}
                                                {item.tarih ? format(parseISO(item.tarih), 'dd.MM.yyyy') : '-'}
                                            </div>
                                            <div className="text-xs font-medium truncate">
                                                {item.tetkik_adi || 'Belirtilmemiş'}
                                            </div>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug break-words italic">
                                                {item.sonuc || "Sonuç girilmemiş."}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
