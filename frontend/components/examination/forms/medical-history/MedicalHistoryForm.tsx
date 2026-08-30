import React from "react";
import { propsEqualWithShallowValue } from "@/components/examination/shared/memoValue";
import { MedicalHistoryData } from "./schema";
import { Label } from "@/components/ui/label";
import { DebouncedTextarea } from "@/components/examination/shared/DebouncedText";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SystemQueryCombobox } from "@/components/ui/system-query-combobox";

interface MedicalHistoryFormProps {
    value: MedicalHistoryData;
    onChange: (data: MedicalHistoryData) => void;
    readOnly?: boolean;
    onOpenEDDrugs?: () => void;
    onCopyLastDrugs?: () => void;
}

// Separate section for Özgeçmiş (used standalone in ClinicalCard)
const PastHistorySectionBase: React.FC<MedicalHistoryFormProps> = ({ value, onChange, readOnly }) => (
    <div className="p-1">
        <DebouncedTextarea
            value={value.ozgecmis}
            disabled={readOnly}
            onValueChange={(v) => onChange({ ...value, ozgecmis: v })}
            className="min-h-[120px] bg-transparent border-0 resize-y text-sm font-mono p-0 focus-visible:ring-0 placeholder:text-slate-300"
            placeholder="Hastalıklar, ameliyatlar..."
        />
    </div>
);

// Main Tıbbi Geçmiş section with integrated habits (per design mockup)
const MedicalHistorySectionBase: React.FC<MedicalHistoryFormProps> = ({ value, onChange, readOnly, onCopyLastDrugs }) => (
    <div className="space-y-6">
        {/* Kullandığı İlaçlar */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">İlaçlar</Label>
                    {!readOnly && onCopyLastDrugs && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={onCopyLastDrugs}
                            className="h-7 px-3 text-xs font-bold transition-all bg-emerald-500 text-white border border-emerald-500 hover:bg-emerald-600 rounded cursor-pointer shadow-sm"
                        >
                            Geçmiş İlaçlar
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2 bg-slate-50/50 px-2 py-0.5 rounded-full border border-slate-100">
                    <input
                        type="checkbox"
                        id="kan-sulandirici-main"
                        disabled={readOnly}
                        checked={value.kan_sulandirici}
                        onChange={(e) => onChange({ ...value, kan_sulandirici: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <label htmlFor="kan-sulandirici-main" className={cn("text-[10px] font-black px-2.5 py-1 rounded shadow-sm cursor-pointer uppercase transition-all", value.kan_sulandirici ? "bg-yellow-400 text-slate-900" : "bg-slate-200 text-slate-500")}>Kan Sulandırıcı (+)</label>
                </div>
            </div>
            <DebouncedTextarea
                value={value.kullandigi_ilaclar}
                disabled={readOnly}
                onValueChange={(v) => onChange({ ...value, kullandigi_ilaclar: v })}
                className="min-h-[100px] bg-slate-50 border-slate-200 resize-y font-mono text-sm"
                placeholder="İlaç listesi..."
            />
        </div>

        {/* Aile Hikayesi & Allerjiler - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Aile Hikayesi</Label>
                <DebouncedTextarea
                    value={value.soygecmis}
                    disabled={readOnly}
                    onValueChange={(v) => onChange({ ...value, soygecmis: v })}
                    className="bg-slate-50 border-slate-200 min-h-[80px] resize-y font-mono text-sm"
                    placeholder="DM, HT, PCa vs..."
                />
            </div>

            <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Allerjiler</Label>
                <DebouncedTextarea
                    value={value.allerjiler || ""}
                    disabled={readOnly}
                    onValueChange={(v) => onChange({ ...value, allerjiler: v })}
                    className={cn(
                        "bg-blue-50 border-blue-200 min-h-[80px] resize-y font-mono text-sm transition-colors",
                        value.allerjiler ? "text-red-600 font-bold" : "text-slate-600"
                    )}
                    placeholder="İlaç, gıda, lateks vb..."
                />
            </div>
        </div>

        {/* Alışkanlıklar */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
            <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Alışkanlıklar</Label>
            <div className="space-y-2">
                <SystemQueryCombobox
                    label="SİGARA"
                    value={value.sigara || ""}
                    onChange={(val) => onChange({ ...value, sigara: val })}
                    options={["Kullanmıyor", "Bırakmış", "1 Paket/Yıl", "5 Paket/Yıl", "10 Paket/Yıl", "20 Paket/Yıl", "30+ Paket/Yıl"]}
                    placeholder="Paket/Yıl"
                    disabled={readOnly}
                />
                <SystemQueryCombobox
                    label="ALKOL"
                    value={value.alkol || ""}
                    onChange={(val) => onChange({ ...value, alkol: val })}
                    options={["Kullanmıyor", "Sosyal", "Haftada < 3 gün", "Haftada > 3 gün", "Hergün düzenli", "Alkolizm"]}
                    placeholder="Seçiniz..."
                    disabled={readOnly}
                />
            </div>
        </div>
    </div>
);

export const PastHistorySection = React.memo(PastHistorySectionBase, propsEqualWithShallowValue);
PastHistorySection.displayName = "PastHistorySection";

export const MedicalHistorySection = React.memo(MedicalHistorySectionBase, propsEqualWithShallowValue);
MedicalHistorySection.displayName = "MedicalHistorySection";
