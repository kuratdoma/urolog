"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter // Add this
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Add this
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Trash2,
    Save,
    X,
    LogOut,
    Calendar,
    User,
    PhoneCall as PhoneIcon,
    ChevronRight,
    Search,
    Clock,
    UserCheck,
    Loader2
} from "lucide-react";
import { Patient, PhoneCall, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInYears } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface PhoneCallsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient: Patient;
}

export function PhoneCallsDialog({ open, onOpenChange, patient }: PhoneCallsDialogProps) {
    const { user } = useAuthStore();
    const [calls, setCalls] = useState<PhoneCall[]>([]);
    const [selectedCall, setSelectedCall] = useState<PhoneCall | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form states
    const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
    const [doktor, setDoktor] = useState(user?.full_name || patient.doktor || "");
    const [notlar, setNotlar] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const lastSavedData = useRef({ tarih: "", doktor: "", notlar: "" });
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

    // Auto-save effect
    useEffect(() => {
        if (!open || !notlar.trim() || isSaving) return;

        const hasChanged =
            tarih !== lastSavedData.current.tarih ||
            doktor !== lastSavedData.current.doktor ||
            notlar !== lastSavedData.current.notlar;

        if (!hasChanged) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            setIsAutoSaving(true);
            try {
                if (selectedCall) {
                    await api.clinical.updatePhoneCall(selectedCall.id, {
                        tarih,
                        doktor,
                        notlar
                    });
                    lastSavedData.current = { tarih, doktor, notlar };
                } else {
                    const newCall = await api.clinical.createPhoneCall({
                        hasta_id: patient.id,
                        tarih,
                        doktor,
                        notlar
                    });
                    setSelectedCall(newCall);
                    lastSavedData.current = { tarih, doktor, notlar };
                    fetchCalls();
                }
            } catch (error) {
                console.error("Auto-save failed", error);
            } finally {
                setIsAutoSaving(false);
            }
        }, 3000);

        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [tarih, doktor, notlar, open, selectedCall, patient.id, isSaving]);

    const fetchCalls = async () => {
        setIsLoading(true);
        try {
            const data = await api.clinical.getPhoneCalls(patient.id);
            setCalls(data);
        } catch (error) {
            console.error("Failed to fetch phone calls", error);
            toast.error("Görüşmeler yüklenirken bir sorun oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchCalls();
            handleNew();
        }
    }, [open, patient.id]);

    useEffect(() => {
        if (!selectedCall && user?.full_name) {
            setDoktor(user.full_name);
        }
    }, [user, selectedCall]);

    const handleNew = () => {
        setSelectedCall(null);
        setTarih(new Date().toISOString().split('T')[0]);
        setDoktor(user?.full_name || patient.doktor || "");
        setNotlar("");
        lastSavedData.current = { tarih: "", doktor: "", notlar: "" };
    };

    const handleSelect = (call: PhoneCall) => {
        setSelectedCall(call);
        setTarih(call.tarih || new Date().toISOString().split('T')[0]);
        setDoktor(call.doktor || "");
        setNotlar(call.notlar || "");
        lastSavedData.current = {
            tarih: call.tarih || new Date().toISOString().split('T')[0],
            doktor: call.doktor || "",
            notlar: call.notlar || ""
        };
    };

    const handleSave = async () => {
        if (!notlar.trim()) {
            toast.error("Görüşme notu boş bırakılamaz.");
            return;
        }

        setIsSaving(true);
        const loadingToast = toast.loading("Görüşme kaydediliyor...");
        try {
            if (selectedCall) {
                await api.clinical.updatePhoneCall(selectedCall.id, {
                    tarih,
                    doktor,
                    notlar
                });
                toast.success("Görüşme kaydı güncellendi.", { id: loadingToast });
            } else {
                await api.clinical.createPhoneCall({
                    hasta_id: patient.id,
                    tarih,
                    doktor,
                    notlar
                });
                toast.success("Yeni görüşme kaydı eklendi.", { id: loadingToast });
            }
            fetchCalls();
            handleNew();
            lastSavedData.current = { tarih: "", doktor: "", notlar: "" };
        } catch (error) {
            toast.error("Kayıt sırasında bir hata oluştu.", { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedCall) return;

        try {
            await api.clinical.deletePhoneCall(selectedCall.id);
            toast.success("Görüşme kaydı silindi.");
            handleNew();
            fetchCalls();
        } catch (error) {
            toast.error("Silme işlemi başarısız oldu.");
        } finally {
            setDeleteDialogOpen(false);
        }
    };

    const age = patient.dogum_tarihi ? differenceInYears(new Date(), parseISO(patient.dogum_tarihi)) : '';
    const filteredCalls = calls.filter(c =>
        c.notlar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.doktor?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1000px] w-[95vw] h-[650px] p-0 overflow-hidden bg-[#F8FAFC] border-0 shadow-2xl rounded-3xl flex flex-col">
                <DialogHeader className="sr-only">
                    <DialogTitle>Telefon Görüşmeleri</DialogTitle>
                    <DialogDescription>Hasta telefon görüşme kayıtları yönetimi</DialogDescription>
                </DialogHeader>

                {/* Glassmorphism Header */}
                <div className="bg-slate-900 px-8 py-4 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse text-white font-bold"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>

                    <div className="flex items-center justify-between relative z-10 w-full">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                                <PhoneIcon className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">{patient.ad} {patient.soyad}</h2>
                                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-bold px-2.5 py-0.5 rounded-lg">
                                        TELEFON GÖRÜŞMELERİ
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">

                                        <span className="opacity-30">•</span>
                                        <span>{age ? `${age} Yaşında` : 'Yaş Belirtilmemiş'}</span>
                                        <span className="opacity-30">•</span>
                                        <span className="text-slate-300">{patient.cep_tel || patient.ev_tel || patient.is_tel || 'Telefon Yok'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="text-white/30 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-all border border-white/5"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Top Section: Form */}
                    <div className="shrink-0 bg-white p-5 border-b border-slate-200/60">
                        <div className="max-w-3xl mx-auto">
                            {/* Form Header */}
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                        {selectedCall ? <Clock className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                                    </div>
                                    {selectedCall && (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] px-1.5 py-0">KAYITLI</Badge>
                                    )}
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isAutoSaving ? "bg-blue-500 animate-pulse" : "bg-emerald-500")} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                            {isAutoSaving ? 'OTOMATİK KAYDEDİLİYOR...' : 'OTOMATİK KAYIT ETKİN'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedCall && (
                                        <Button
                                            variant="ghost"
                                            onClick={handleDeleteClick}
                                            className="text-red-500 hover:text-white hover:bg-red-500 font-black gap-1.5 h-8 px-3 rounded-lg transition-all border border-transparent hover:border-red-600 active:scale-95 shrink-0 text-[10px]"
                                        >
                                            <Trash2 className="w-3 h-3 stroke-[2.5]" />
                                            SİL
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                        className="h-8 px-3 rounded-lg border-slate-200 font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                                    >
                                        İptal
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="h-8 px-4 bg-slate-900 hover:bg-black text-white rounded-lg shadow-lg shadow-black/10 font-bold gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase italic text-[10px]"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Save className="w-3 h-3 stroke-[2.5]" />
                                        )}
                                        {selectedCall ? 'GÜNCELLE' : 'KAYDET'}
                                    </Button>
                                </div>
                            </div>

                            {/* Form Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5 text-blue-500" /> Tarih
                                    </Label>
                                    <Input
                                        type="date"
                                        value={tarih}
                                        onChange={e => setTarih(e.target.value)}
                                        className="bg-white border-slate-200 h-9 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-bold px-2.5 text-slate-700 w-full text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1">
                                        <UserCheck className="w-2.5 h-2.5 text-blue-500" /> İlgili
                                    </Label>
                                    <Input
                                        value={doktor}
                                        onChange={e => setDoktor(e.target.value)}
                                        className="bg-white border-slate-200 h-9 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-bold px-2.5 w-full text-xs"
                                        placeholder="İlgili kişi..."
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">
                                        Görüşme Notları
                                    </Label>
                                    <Textarea
                                        value={notlar}
                                        onChange={e => setNotlar(e.target.value)}
                                        className="h-32 bg-white border-slate-200 rounded-lg shadow-sm p-3 text-sm leading-relaxed resize-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder:text-slate-300 w-full"
                                        placeholder="Görüşme detaylarını buraya not alın..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: History List */}
                    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                        <div className="px-5 py-3 bg-white/50 backdrop-blur-sm border-b border-slate-200/60 shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Geçmiş Görüşmeler</span>
                                <Badge className="bg-slate-200 text-slate-600 border-none font-black text-[9px] px-1.5 py-0">{calls.length}</Badge>
                            </div>
                            <div className="relative group w-48">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="Ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-7 bg-slate-100/50 border-slate-200 h-7 rounded-lg focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-xs placeholder:text-slate-400 w-full"
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-3">
                                {isLoading ? (
                                    <div className="py-10 text-center space-y-3">
                                        <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Yükleniyor</p>
                                    </div>
                                ) : filteredCalls.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <p className="text-xs text-slate-400 font-medium">Kayıt bulunamadı</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {filteredCalls.map((call) => (
                                            <button
                                                key={call.id}
                                                onClick={() => handleSelect(call)}
                                                className={cn(
                                                    "w-full flex items-center gap-4 p-3 rounded-lg transition-all duration-200 group relative border border-transparent",
                                                    selectedCall?.id === call.id
                                                        ? "bg-white shadow-sm ring-1 ring-blue-500/20 border-blue-100/50"
                                                        : "bg-white/40 hover:bg-white hover:shadow-sm hover:border-slate-200/60"
                                                )}
                                            >
                                                {selectedCall?.id === call.id && (
                                                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full"></div>
                                                )}

                                                <div className="flex items-center gap-2 min-w-[90px] text-[10px] font-bold text-slate-500 shrink-0">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {call.tarih ? format(parseISO(call.tarih), 'dd.MM.yyyy') : '---'}
                                                </div>

                                                <div className="h-4 w-px bg-slate-200 shrink-0"></div>

                                                <p className={cn(
                                                    "text-xs truncate flex-1 text-left font-medium",
                                                    selectedCall?.id === call.id ? "text-slate-900" : "text-slate-600"
                                                )}>
                                                    {call.notlar
                                                        ? (call.notlar.length > 40 ? `${call.notlar.substring(0, 40)}...` : call.notlar)
                                                        : 'Not girilmemiş'}
                                                </p>

                                                <div className="h-4 w-px bg-slate-200 shrink-0"></div>

                                                <div className="flex items-center gap-1.5 min-w-[100px] justify-end text-[10px] font-bold text-slate-400 shrink-0">
                                                    <User className="w-3 h-3 opacity-70" />
                                                    <span className="truncate max-w-[90px]">{call.doktor || 'Belirtilmemiş'}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-3 bg-white border-t border-slate-200/60 shrink-0">
                            <Button
                                onClick={handleNew}
                                className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 font-black gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase italic text-[10px]"
                            >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                Yeni Kayıt Ekle
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. Bu telefon görüşme kaydı kalıcı olarak silinecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete}
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog >
    );
}
