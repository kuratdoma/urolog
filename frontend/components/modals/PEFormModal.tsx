"use client";

import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Activity, ClipboardCheck, Trash2, Send, Zap, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";

interface PEOption {
    id: string;
    label: string;
    text: string;
    category: "batin" | "penis" | "skrotum" | "vaskuler" | "rektal" | "noro" | "arap_pe";
}

const PE_OPTIONS: PEOption[] = [
    // 1. Batın ve Üst Üriner Sistem
    { id: "batin-insizyon-yok", label: "İnsizyon: Yok", text: "Batında operasyon skarı izlenmedi.", category: "batin" },
    { id: "batin-insizyon-pfannenstiel", label: "Skar: Pfannenstiel", text: "Pfannenstiel insizyon skarı mevcut.", category: "batin" },
    { id: "batin-insizyon-mcburney", label: "Skar: McBurney", text: "McBurney insizyon skarı mevcut.", category: "batin" },
    { id: "batin-insizyon-port", label: "Skar: Lomber/Port", text: "Lomber veya laparoskopik port izleri mevcut.", category: "batin" },

    { id: "batin-palp-dogal", label: "Palpasyon: Doğal", text: "Batın rahat, defans veya rebound saptanmadı.", category: "batin" },
    { id: "batin-palp-defans", label: "Palp: Defans/Rebound", text: "Batında defans/rebound mevcut.", category: "batin" },
    { id: "batin-palp-hassas", label: "Palp: Hassasiyet", text: "Batında palpasyonla hassasiyet saptandı.", category: "batin" },
    { id: "batin-palp-glob", label: "Glob Vezika (+)", text: "Suprapubik bölgede glob vezika palpe edildi.", category: "batin" },

    { id: "batin-kitle-yok", label: "Kitle: Yok", text: "Batında palpabl kitle saptanmadı.", category: "batin" },
    { id: "batin-kitle-sag", label: "Kitle: Sağ Renal", text: "Sağ renal bölgede palpabl kitle saptandı.", category: "batin" },
    { id: "batin-kitle-sol", label: "Kitle: Sol Renal", text: "Sol renal bölgede palpabl kitle saptandı.", category: "batin" },
    { id: "batin-kitle-supra", label: "Kitle: Suprapubik", text: "Suprapubik kitle saptandı.", category: "batin" },

    { id: "batin-kvah-yok", label: "KVAH: Yok", text: "Bilateral kostovertebral açı hassasiyeti saptanmadı.", category: "batin" },
    { id: "batin-kvah-sag", label: "KVAH: Sağ (+/-)", text: "Sağ KVAH saptandı.", category: "batin" },
    { id: "batin-kvah-sol", label: "KVAH: Sol (-/+)", text: "Sol KVAH saptandı.", category: "batin" },
    { id: "batin-kvah-bilat", label: "KVAH: Bilat (+/+)", text: "Bilateral KVAH saptandı.", category: "batin" },


    // 2. Penis ve Üretra
    { id: "penis-sunnetli", label: "Sünnetli", text: "Sünnetli, doğal görünümde.", category: "penis" },
    { id: "penis-sunnetsiz", label: "Sünnetsiz", text: "Sünnetsiz doğal görünüm.", category: "penis" },
    { id: "penis-fimozis", label: "Fimozis", text: "Fimozis saptandı.", category: "penis" },
    { id: "penis-parafimozis", label: "Parafimozis", text: "Parafimozis saptandı.", category: "penis" },

    { id: "penis-meatus-sentral", label: "Meatus: Sentral", text: "Üretral meatus sentral yerleşimli.", category: "penis" },
    { id: "penis-hipospadias", label: "Hipospadias", text: "Hipospadias saptandı.", category: "penis" },
    { id: "penis-darlik", label: "Meatus: Stenoz", text: "Meatal stenoz (darlık) gözlendi.", category: "penis" },

    { id: "penis-plak-yok", label: "Plak: Yok", text: "Penis şaftında peyronie plağı saptanmadı.", category: "penis" },
    { id: "penis-plak-dorsal", label: "Plak: Dorsal", text: "Penis dorsalinde fibröz plak palpe edildi.", category: "penis" },
    { id: "penis-plak-ventral", label: "Plak: Ventral", text: "Penis ventralinde fibröz plak palpe edildi.", category: "penis" },
    { id: "penis-plak-lateral", label: "Plak: Lateral", text: "Penis lateralinde fibröz plak palpe edildi.", category: "penis" },

    { id: "penis-lezyon-yok", label: "Lezyon: Yok", text: "Penil cilt ve mukozada lezyon saptanmadı.", category: "penis" },
    { id: "penis-lezyon-hpv", label: "Lezyon: Kondilom", text: "Penil bölgede kondilom (HPV) saptandı.", category: "penis" },
    { id: "penis-lezyon-ulser", label: "Lezyon: Ülseratif", text: "Penil bölgede ülseratif lezyon saptandı.", category: "penis" },
    { id: "penis-lezyon-kitle", label: "Şüpheli Kitle", text: "Penil cilt/mukozada şüpheli lezyon/kitle saptandı.", category: "penis" },

    // 3. Skrotum ve İçeriği
    { id: "skrotum-loc-bilat", label: "Lokalizasyon: Normal", text: "Her iki testis skrotumda doğal yerleşimli.", category: "skrotum" },
    { id: "skrotum-loc-inmemis", label: "İnmemiş Testis", text: "İnmemiş testis saptandı.", category: "skrotum" },
    { id: "skrotum-loc-retraktil", label: "Retraktil Testis", text: "Retraktil testis saptandı.", category: "skrotum" },

    { id: "skrotum-yapi-dogal", label: "Testis Yapısı: Doğal", text: "Testis boyut ve kıvamı bilateral doğal.", category: "skrotum" },
    { id: "skrotum-atrofi", label: "Testis: Atrofi", text: "Testiste atrofi saptandı.", category: "skrotum" },
    { id: "skrotum-sertlik", label: "Testis: Sertlik/Kitle", text: "Testis parankiminde kitle/sertlik palpe edildi.", category: "skrotum" },
    { id: "skrotum-hassas", label: "Testis: Hassas (Orşit)", text: "Testis palpasyonla ağrılı/hassas.", category: "skrotum" },

    { id: "skrotum-epididim-dogal", label: "Epididim: Doğal", text: "Bilateral epididimler doğal palpe edildi.", category: "skrotum" },
    { id: "skrotum-epididim-kist", label: "Epididim: Kist", text: "Epididimal kist / spermatosel palpe edildi.", category: "skrotum" },
    { id: "skrotum-epididim-hassas", label: "Epididim: Hassas", text: "Epididimde sertlik ve hassasiyet mevcut.", category: "skrotum" },

    { id: "skrotum-sivi-yok", label: "Sıvı/Fıtık: Yok", text: "Skrotal sıvı toplanması veya herni saptanmadı.", category: "skrotum" },
    { id: "skrotum-hidrosel", label: "Hidrosel", text: "Hidrosel saptandı.", category: "skrotum" },
    { id: "skrotum-spermatosel", label: "Spermatosel", text: "Spermatosel saptandı.", category: "skrotum" },
    { id: "skrotum-herni", label: "Skrotal Herni", text: "Skrotuma inen herni palpe edildi.", category: "skrotum" },

    // 4. Vasküler
    { id: "vask-sol-yok", label: "Sol Varikosel: Yok", text: "Sol varikosel saptanmadı.", category: "vaskuler" },
    { id: "vask-sol-g1", label: "Sol: Grade 1", text: "Sol grade 1 varikosel saptandı.", category: "vaskuler" },
    { id: "vask-sol-g2", label: "Sol: Grade 2", text: "Sol grade 2 varikosel saptandı.", category: "vaskuler" },
    { id: "vask-sol-g3", label: "Sol: Grade 3", text: "Sol grade 3 (Gözle görülür) varikosel saptandı.", category: "vaskuler" },

    { id: "vask-sag-yok", label: "Sağ Varikosel: Yok", text: "Sağ varikosel saptanmadı.", category: "vaskuler" },
    { id: "vask-sag-g1", label: "Sağ: Grade 1", text: "Sağ grade 1 varikosel saptandı.", category: "vaskuler" },
    { id: "vask-sag-g2", label: "Sağ: Grade 2", text: "Sağ grade 2 varikosel saptandı.", category: "vaskuler" },
    { id: "vask-sag-g3", label: "Sağ: Grade 3", text: "Sağ grade 3 varikosel saptandı.", category: "vaskuler" },

    { id: "vask-reflu-doppler", label: "Reflü: Doppler (+)", text: "Doppler USG ile venöz reflü konfirme edildi.", category: "vaskuler" },
    { id: "vask-reflu-klinik", label: "Klinik Varikosel", text: "Klinik olarak belirgin varikosel mevcut.", category: "vaskuler" },

    // 5. Rektal Tuşe (DRE) ve Prostat
    { id: "dre-yapilmadi", label: "DRE Yapılmadı", text: "Digital rektal muayene (DRE) yapılmadı.", category: "rektal" },
    { id: "dre-red", label: "Hasta Reddetti", text: "Hasta rektal muayeneyi reddetti.", category: "rektal" },
    { id: "dre-yapildi", label: "DRE Yapıldı", text: "Digital rektal muayene (DRE) yapıldı.", category: "rektal" },

    { id: "dre-grade-1", label: "Grade 1", text: "Prostat volümü yaklaşık 20-30 gr (Doğal boyutlar).", category: "rektal" },
    { id: "dre-grade-2", label: "Grade 2", text: "Prostat volümü artmış (yaklaşık 40-50 gr).", category: "rektal" },
    { id: "dre-grade-3", label: "Grade 3", text: "Prostat volümü belirgin artmış (>60 gr).", category: "rektal" },

    { id: "dre-kivam-elastik", label: "Kıvam: Elastik", text: "Prostat kıvamı elastik, benign karakterli.", category: "rektal" },
    { id: "dre-kivam-sert", label: "Kıvam: Sert/Fikse", text: "Prostat dokusunda sertlik/fiksasyon mevcut.", category: "rektal" },
    { id: "dre-kivam-ca", label: "Kıvam: Ca", text: "Prostat Ca sertliğinde.", category: "rektal" },

    { id: "dre-yuzey-duzgun", label: "Yüzey: Düzgün", text: "Prostat yüzeyi düzgün, sulkus açık ve belirgin.", category: "rektal" },
    { id: "dre-yuzey-nodul", label: "Yüzey: Nodüler", text: "Prostat yüzeyinde nodül/ler palpe edildi.", category: "rektal" },
    { id: "dre-yuzey-sulkus", label: "Sulkus Silinmiş", text: "Prostat median sulkusu silinmiş.", category: "rektal" },

    { id: "dre-hassas-yok", label: "Hassasiyet: Yok", text: "DRE esnasında palpasyonla hassasiyet yok.", category: "rektal" },
    { id: "dre-hassas-akut", label: "Akut Prostatit (+)", text: "DRE'de belirgin ısı artışı ve aşırı hassasiyet mevcut.", category: "rektal" },
    { id: "dre-hassas-masaj", label: "Masaj Sekresyonu (+)", text: "Prostatik masajla pürülan/enflamatuar sekresyon izlendi.", category: "rektal" },

    // 6. Nöro-Ürolojik ve Refleksler
    { id: "noro-anal-normal", label: "Anal Tonus: Normal", text: "Anal sfinkter istirahat ve istemli sıkma tonusu normal.", category: "noro" },
    { id: "noro-anal-az", label: "Anal Tonus: Azalmış", text: "Anal sfinkter tonusu azalmış/zayıf.", category: "noro" },
    { id: "noro-anal-atonik", label: "Anal Tonus: Atonik", text: "Anal sfinkter tamamen atonik.", category: "noro" },

    { id: "noro-bcr-var", label: "BCR: Var (+)", text: "Bulbokavernöz refleks (BCR) pozitif olarak alındı.", category: "noro" },
    { id: "noro-bcr-yok", label: "BCR: Yok (-)", text: "Bulbokavernöz refleks (BCR) alınamadı.", category: "noro" },

    { id: "noro-krem-sag", label: "Kremaster: Sağ (+)", text: "Sağ kremasterik refleks alındı.", category: "noro" },
    { id: "noro-krem-sol", label: "Kremaster: Sol (+)", text: "Sol kremasterik refleks alındı.", category: "noro" },
    { id: "noro-krem-yok", label: "Kremaster: Yok (-)", text: "Kremasterik refleks eksiği mevcut.", category: "noro" },

    { id: "noro-duyu-normal", label: "S2-S4 Duyu Normal", text: "Perineal (S2-S4) ve perianal dermatomlarda duyusal defisit yok.", category: "noro" },
    { id: "noro-duyu-defisit", label: "Hipoestezi/Anestezi", text: "Perineal/perianal bölgede anestezi veya hipoestezi saptandı.", category: "noro" },

];

const NORMAL_FINDINGS_IDS = [
    "batin-insizyon-yok", "batin-palp-dogal", "batin-kitle-yok", "batin-kvah-yok",
    "penis-sunnetli", "penis-meatus-sentral", "penis-plak-yok", "penis-lezyon-yok",
    "skrotum-loc-bilat", "skrotum-yapi-dogal", "skrotum-epididim-dogal", "skrotum-sivi-yok",
    "vask-sol-yok", "vask-sag-yok",
    "dre-yapildi", "dre-hacim-20", "dre-kivam-elastik", "dre-yuzey-duzgun", "dre-hassas-yok",
    "noro-anal-normal", "noro-bcr-var", "noro-krem-sag", "noro-krem-sol", "noro-duyu-normal"
];

interface PEFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onExport: (text: string) => void;
}

export const PEFormModal: React.FC<PEFormModalProps> = ({ isOpen, onOpenChange, onExport }) => {
    const { examinationModules } = useSettingsStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("batin");

    const categories = useMemo(() => {
        const base = [
            { id: "batin", label: "1. Batın + ÜÜS", icon: <Activity className="w-4 h-4" /> },
            { id: "penis", label: "2. Penis + Üretra", icon: <Activity className="w-4 h-4" /> },
            { id: "skrotum", label: "3. Skrotum", icon: <Activity className="w-4 h-4" /> },
            { id: "vaskuler", label: "4. Vasküler", icon: <Activity className="w-4 h-4" /> },
            { id: "rektal", label: "5. DRE Prostat", icon: <Activity className="w-4 h-4" /> },
            { id: "noro", label: "6. Nöro-Üroloji", icon: <Activity className="w-4 h-4" /> },
        ];

        if (examinationModules.arapPEModule) {
            base.push({ id: "arap_pe", label: "7. Arap PE (Ejakülasyon)", icon: <Zap className="w-4 h-4" /> });
        }

        return base;
    }, [examinationModules.arapPEModule]);

    const toggleOption = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSetAllNormal = () => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            NORMAL_FINDINGS_IDS.forEach(id => newSet.add(id));
            return Array.from(newSet);
        });
    };

    const generatedText = useMemo(() => {
        if (selectedIds.length === 0) return "";
        const selectedOptions = PE_OPTIONS.filter(opt => selectedIds.includes(opt.id));
        return selectedOptions.map(opt => opt.text).join(" ");
    }, [selectedIds]);

    const handleExport = () => {
        onExport(generatedText);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="p-0 overflow-hidden bg-white shadow-2xl rounded-xl border-0 flex flex-col gap-0 h-[90vh] max-h-[90vh] w-auto aspect-video max-w-[95vw] lg:max-w-[1200px]">
                <DialogTitle className="sr-only">FM: Hızlı Giriş</DialogTitle>
                <DialogDescription className="sr-only">Fizik muayene hızlı giriş ve şablon değerlendirme formu</DialogDescription>
                {/* Header */}
                <header className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-600 rounded-lg text-white">
                            <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">FM: Hızlı Giriş</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSetAllNormal}
                            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 font-bold gap-2 uppercase text-[11px] h-8 px-3 shadow-sm rounded-md flex items-center transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            TÜM BULGULAR DOĞAL
                        </button>
                        <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors ml-2">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                    {/* Left: Category Sidebar */}
                    <aside className="w-full md:w-[220px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto">
                        <div className="p-3 space-y-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={cn(
                                        "w-full flex items-center text-left h-auto py-2.5 px-3 font-bold text-xs uppercase transition-all tracking-wider rounded-md",
                                        activeCategory === cat.id
                                            ? "bg-teal-100 text-teal-800 shadow-sm"
                                            : "text-slate-500 hover:bg-slate-200"
                                    )}
                                >
                                    <div className={cn("p-1.5 rounded-sm mr-2.5", activeCategory === cat.id ? "bg-teal-200 text-teal-800" : "bg-slate-200 text-slate-500")}>
                                        {cat.icon}
                                    </div>
                                    <span className="flex-1 whitespace-normal leading-tight">{cat.label}</span>
                                    {selectedIds.filter(id => PE_OPTIONS.find(o => o.id === id)?.category === cat.id).length > 0 && (
                                        <div className="ml-2 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
                                            {selectedIds.filter(id => PE_OPTIONS.find(o => o.id === id)?.category === cat.id).length}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Right: Options Grid */}
                    <main className="flex-1 bg-white p-5 overflow-y-auto">
                        {categories.filter(cat => cat.id === activeCategory).map(cat => (
                            <div key={cat.id} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {PE_OPTIONS.filter(opt => opt.category === cat.id).map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => toggleOption(opt.id)}
                                            className={cn(
                                                "flex items-center justify-start h-auto min-h-[52px] py-2 px-3 text-left transition-all border rounded-lg",
                                                selectedIds.includes(opt.id)
                                                    ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                                                    : "border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-700 bg-white"
                                            )}
                                        >
                                            <span className="text-xs font-bold leading-snug whitespace-normal">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Preview area for generated text */}
                        <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            <p className="text-[10px] text-slate-400 uppercase font-black mb-2">Canlı Metin Önizleme:</p>
                            <p className="text-sm text-slate-600 italic">
                                {generatedText || "Henüz bir bulgu seçilmedi..."}
                            </p>
                        </div>
                    </main>
                </div>

                {/* Footer */}
                <footer className="p-4 bg-slate-50 border-t border-slate-200 flex gap-4 shrink-0 items-center justify-between z-10">
                    <div className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[11px]">
                            {selectedIds.length}
                        </div>
                        Seçim Yapıldı
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setSelectedIds([])}
                            disabled={selectedIds.length === 0}
                            className="h-10 px-4 flex items-center text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-all disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            TEMİZLE
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={selectedIds.length === 0}
                            className="h-10 px-6 flex items-center bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md gap-2 uppercase tracking-wide disabled:bg-slate-300 disabled:shadow-none rounded-md transition-all"
                        >
                            <Send className="w-4 h-4 mr-1.5" />
                            AKTAR
                        </button>
                    </div>
                </footer>
            </DialogContent>
        </Dialog>
    );
};
