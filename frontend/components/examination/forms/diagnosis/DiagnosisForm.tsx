import React from "react";
import { DiagnosisData, DiagnosisItem } from "./schema";
import { DiagnosisICDCombobox } from "./DiagnosisICDCombobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tag, Plus, Trash2, Pill, Printer, FileText } from "lucide-react";
import { cn } from "@/lib/utils";


interface DiagnosisFormProps {
    value: DiagnosisData;
    onChange: (data: DiagnosisData) => void;
    readOnly?: boolean;
    patientId: string;
    onOpenPrescription: () => void;
}

export const DiagnosisForm: React.FC<DiagnosisFormProps> = ({
    value,
    onChange,
    readOnly = false,
    patientId,
    onOpenPrescription
}) => {

    // ... logic ...
    const updateDiagnosis = (index: number, field: keyof DiagnosisItem, val: string) => {
        const newDiagnoses = [...value.diagnoses];
        if (!newDiagnoses[index]) {
            newDiagnoses[index] = { name: "", code: "" };
        }
        newDiagnoses[index] = { ...newDiagnoses[index], [field]: val };
        onChange({ ...value, diagnoses: newDiagnoses });
    };

    const addDiagnosis = () => {
        if (value.diagnoses.length >= 5) return;
        onChange({ ...value, diagnoses: [...value.diagnoses, { name: "", code: "" }] });
    };

    const removeDiagnosis = (index: number) => {
        const newDiagnoses = value.diagnoses.filter((_, i) => i !== index);
        if (newDiagnoses.length === 0) {
            newDiagnoses.push({ name: "", code: "" });
        }
        onChange({ ...value, diagnoses: newDiagnoses });
    };

    const updateField = (field: keyof DiagnosisData, val: string) => {
        onChange({ ...value, [field]: val });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Column: Diagnosis & Result */}
            <div className="rounded-xl border border-white bg-white p-1 flex flex-col shadow-sm h-full">
                <div className="px-3 py-2 border-b border-slate-50 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <h3 className="text-sm font-bold text-slate-700">Tanı ve Sonuç</h3>
                </div>
                <div className="p-4 space-y-4 flex-1">
                    <div className="space-y-4">
                        {value.diagnoses.map((diag, index) => (
                            <div key={index} className="flex gap-2 items-start group">
                                <div className="flex-1">
                                    <DiagnosisICDCombobox
                                        label={`TANI ${index + 1}`}
                                        value={diag.name}
                                        code={diag.code || ""}
                                        disabled={readOnly}
                                        onValueChange={(v) => updateDiagnosis(index, "name", v)}
                                        onCodeChange={(c) => updateDiagnosis(index, "code", c)}
                                        placeholder={`Tanı ${index + 1} ara veya gir...`}
                                    />
                                </div>
                                {!readOnly && value.diagnoses.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 mt-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => removeDiagnosis(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        {value.diagnoses.length < 5 && !readOnly && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addDiagnosis}
                                className="w-full h-8 text-xs text-slate-500 border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-700"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Yeni Tanı Ekle
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Sonuç / Karar</Label>
                        <Textarea
                            value={value.sonuc || ""}
                            disabled={readOnly}
                            onChange={(e) => updateField("sonuc", e.target.value)}
                            className="bg-slate-50 border-slate-100 min-h-[60px] resize-y font-mono text-sm"
                            placeholder="Takip, Operasyon, Konsültasyon, Tetkik..."
                        />
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Öneriler</Label>
                        <Textarea
                            value={value.oneriler || ""}
                            disabled={readOnly}
                            onChange={(e) => updateField("oneriler", e.target.value)}
                            className="bg-slate-50 border-slate-100 min-h-[60px] resize-y font-mono text-sm"
                            placeholder="Hastaya verilen öneriler..."
                        />
                    </div>
                </div>
            </div>

            {/* Right Column: Treatment & Prescription */}
            <div className="rounded-xl border border-white bg-white p-1 flex flex-col shadow-sm h-full">
                <div className="px-3 py-2 border-b border-slate-50 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-700">Tedavi Planı</h3>
                </div>
                <div className="p-4 space-y-4 flex-1">
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Tedavi / Plan</Label>
                        <Textarea
                            value={value.tedavi || ""}
                            disabled={readOnly}
                            onChange={(e) => updateField("tedavi", e.target.value)}
                            className="min-h-[120px] bg-slate-50 border-slate-100 resize-y font-mono text-sm"
                            placeholder="Tedavi planı detayları..."
                        />
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/print/recommendations/diyet?patientId=${patientId}`, '_blank')}
                                className="h-7 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200"
                            >
                                🍊 Diyet
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateField("tedavi", value.tedavi + "\n\n[EGZERSİZ ÖNERİLERİ]\n- Günde 30 dk yürüyüş\n- Pelvik taban egzersizleri")}
                                className="h-7 text-xs font-bold text-lime-600 bg-lime-50 hover:bg-lime-100 border-lime-200"
                            >
                                🏃 Egzersiz
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/print/recommendations/aam?patientId=${patientId}`, '_blank')}
                                className="h-7 text-xs font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                            >
                                🌟 AAM
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateField("tedavi", value.tedavi + "\n\n[HPV BİLGİLENDİRME]\n- HPV aşısı önerildi")}
                                className="h-7 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
                            >
                                🍀 HPV
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/print/recommendations/mens_health_diet?patientId=${patientId}`, '_blank')}
                                className="h-7 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                            >
                                🚀 ED Diyet
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider">Reçete</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onOpenPrescription}
                                className="h-7 px-3 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 bg-white"
                            >
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                HAZIRLA
                            </Button>
                        </div>
                        <Textarea
                            value={value.recete || ""}
                            disabled={readOnly}
                            onChange={(e) => updateField("recete", e.target.value)}
                            className="bg-slate-50 border-slate-100 min-h-[100px] resize-y font-mono text-sm"
                            placeholder="İlaç isimleri, doz..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
