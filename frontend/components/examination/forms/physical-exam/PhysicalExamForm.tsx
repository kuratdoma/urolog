import React, { useState } from "react";
import { PhysicalExamData } from "./schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Eye, ClipboardCheck } from "lucide-react";

// --- Local Components ---

const QuickSelectInput = React.memo(({
    value,
    onChange,
    options,
    placeholder,
    className,
    disabled
}: {
    value: string | undefined,
    onChange: (v: string) => void,
    options: string[],
    placeholder?: string,
    className?: string,
    disabled?: boolean
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    return (
        <div className={cn("relative w-full", disabled && "opacity-70 pointer-events-none")}>
            <Input
                value={value || ""}
                disabled={disabled}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => {
                    setIsFocused(true);
                    setShowSuggestions(true);
                }}
                onBlur={() => {
                    setTimeout(() => {
                        setIsFocused(false);
                        setShowSuggestions(false);
                    }, 200);
                }}
                className={cn("h-8 text-xs bg-white font-mono", className)}
                placeholder={placeholder || ""}
            />

            {(isFocused || showSuggestions) && options.length > 0 && (
                <div className="absolute top-full left-0 w-full z-50 bg-white border border-slate-200 rounded-md shadow-xl mt-1 overflow-hidden">
                    {options.map(option => (
                        <div
                            key={option}
                            className="px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 font-medium font-mono"
                            onClick={() => {
                                onChange(option);
                                setShowSuggestions(false);
                            }}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
QuickSelectInput.displayName = "QuickSelectInput";

// UF/PVR segmented giriş — kullanıcı sadece rakam yazar, "UF: X // Y // Z    PVR: N mL"
// formatı otomatik oluşur. Muayene.bulgu_notu alanına düz metin olarak yazılır.
const UF_PVR_RE = /^UF:\s*(\d*)\s*\/\/\s*(\d*)\s*\/\/\s*(\d*)\s+PVR:\s*(\d*)\s*mL\s*$/;

export function parseUroflow(text: string) {
    const m = text.match(UF_PVR_RE);
    if (!m) return { qmax: "", qav: "", vol: "", pvr: "" };
    return { qmax: m[1], qav: m[2], vol: m[3], pvr: m[4] };
}

function buildUroflowText(seg: { qmax: string; qav: string; vol: string; pvr: string }) {
    if (!seg.qmax && !seg.qav && !seg.vol && !seg.pvr) return "";
    return `UF: ${seg.qmax} // ${seg.qav} // ${seg.vol}    PVR: ${seg.pvr} mL`;
}

const UroflowInput = React.memo(({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) => {
    const seg = parseUroflow(value || "");

    const update = (field: "qmax" | "qav" | "vol" | "pvr", raw: string) => {
        const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
        onChange(buildUroflowText({ ...seg, [field]: digits }));
    };

    const segClass = "h-8 w-14 text-xs bg-white font-mono text-center px-1";

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 font-mono">UF:</span>
            <Input value={seg.qmax} disabled={disabled} inputMode="numeric" onChange={(e) => update("qmax", e.target.value)} className={segClass} placeholder="QMax" />
            <span className="text-xs text-slate-400 font-mono">//</span>
            <Input value={seg.qav} disabled={disabled} inputMode="numeric" onChange={(e) => update("qav", e.target.value)} className={segClass} placeholder="Qav" />
            <span className="text-xs text-slate-400 font-mono">//</span>
            <Input value={seg.vol} disabled={disabled} inputMode="numeric" onChange={(e) => update("vol", e.target.value)} className={segClass} placeholder="Vol" />
            <span className="text-xs font-bold text-slate-500 font-mono ml-2">PVR:</span>
            <Input value={seg.pvr} disabled={disabled} inputMode="numeric" onChange={(e) => update("pvr", e.target.value)} className={segClass} placeholder="nn" />
            <span className="text-xs text-slate-400 font-mono">mL</span>
        </div>
    );
});
UroflowInput.displayName = "UroflowInput";

// --- Main Component ---

interface PhysicalExamFormProps {
    value: PhysicalExamData;
    onChange: (data: PhysicalExamData) => void;
    readOnly?: boolean;
    onOpenPEForm?: () => void;
}

export const PhysicalExamForm: React.FC<PhysicalExamFormProps> = ({
    value,
    onChange,
    readOnly = false,
    onOpenPEForm
}) => {
    const [showFM, setShowFM] = useState(false);

    const updateField = (field: keyof PhysicalExamData, val: string) => {
        onChange({ ...value, [field]: val });
    };

    return (
        <div className="space-y-6">
            {/* Toggle & PE Form Button */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 px-3 text-xs font-bold border transition-all",
                        showFM
                            ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                            : "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                    )}
                    onClick={() => setShowFM(!showFM)}
                >
                    {showFM ? 'Kapat' : 'Genişlet'}
                </Button>
                {onOpenPEForm && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenPEForm}
                        className="h-7 px-3 text-xs font-bold text-teal-700 border-teal-200 hover:bg-teal-50 flex items-center gap-1.5 uppercase transition-all shadow-sm bg-white"
                    >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        FM:GİRİŞ
                    </Button>
                )}
            </div>

            {/* UF / PVR — Uroflowmetri quick-entry (Muayene.bulgu_notu alanını kullanır) */}
            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    UF / PVR
                </Label>
                <UroflowInput
                    value={value.bulgu_notu || ""}
                    disabled={readOnly}
                    onChange={(v) => updateField("bulgu_notu", v)}
                />
            </div>

            {/* Expanded Physical Exam Fields */}
            {showFM && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4 animate-in fade-in zoom-in duration-200 shadow-inner">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KVAH</Label>
                            <QuickSelectInput
                                value={value.kvah}
                                disabled={readOnly}
                                onChange={(v) => updateField("kvah", v)}
                                options={["- / -", "- / +", "+ / -", "+ / +"]}
                                placeholder="Seçiniz..."
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">EGO</Label>
                            <QuickSelectInput
                                value={value.ego}
                                disabled={readOnly}
                                onChange={(v) => updateField("ego", v)}
                                options={["Doğal Sünnetli", "Doğal Sünnetsiz"]}
                                placeholder="Seçiniz..."
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sağ Böbrek</Label>
                            <QuickSelectInput
                                value={value.bobrek_sag}
                                disabled={readOnly}
                                onChange={(v) => updateField("bobrek_sag", v)}
                                options={["Palpabl", "NonPalpabl"]}
                                placeholder="Seçiniz..."
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sol Böbrek</Label>
                            <QuickSelectInput
                                value={value.bobrek_sol}
                                disabled={readOnly}
                                onChange={(v) => updateField("bobrek_sol", v)}
                                options={["Palpabl", "NonPalpabl"]}
                                placeholder="Seçiniz..."
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Suprapubik Kitle</Label>
                            <QuickSelectInput
                                value={value.suprapubik_kitle}
                                disabled={readOnly}
                                onChange={(v) => updateField("suprapubik_kitle", v)}
                                options={["Var", "Yok"]}
                                placeholder="Seçiniz..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Textarea - Sistemik Muayene */}
            <Textarea
                value={value.fizik_muayene || ""}
                disabled={readOnly}
                onChange={(e) => updateField("fizik_muayene", e.target.value)}
                className="min-h-[200px] bg-slate-50 border-slate-200 resize-y font-mono text-sm"
                placeholder="Sistemik muayene bulguları..."
            />

            <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">DRE (Parmakla Rektal Muayene)</Label>
                <Textarea
                    value={value.rektal_tuse || ""}
                    disabled={readOnly}
                    onChange={(e) => updateField("rektal_tuse", e.target.value)}
                    rows={3}
                    className="bg-slate-50 border-slate-200 min-h-[60px] resize-y font-mono text-sm focus:bg-white transition-colors"
                    placeholder="Prostat büyüklüğü, kıvamı, nodül..."
                />
            </div>

            <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Yapılan İşlem / Prosedür</Label>
                <Textarea
                    value={value.prosedur || ""}
                    disabled={readOnly}
                    onChange={(e) => updateField("prosedur", e.target.value)}
                    rows={2}
                    className="bg-slate-50 border-slate-200 min-h-[60px] resize-y font-mono text-sm focus:bg-white transition-colors"
                    placeholder="PRP, ESWT, Biyopsi, Sistoskopi vb..."
                />
            </div>
        </div>
    );
};
