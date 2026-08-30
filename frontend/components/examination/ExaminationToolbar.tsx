"use client";

import React from "react";
import { Save, Printer, Edit, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseISO } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ExaminationFormData } from "@/hooks/useExaminationPageLogic";

import { ExaminationPrintDialog } from "./ExaminationPrintDialog";
import { InsuranceProvisionModal } from "@/components/modals/InsuranceProvisionModal";
import { FileCheck } from "lucide-react";

interface ExaminationToolbarProps {
    formData: ExaminationFormData;
    setFormData: React.Dispatch<React.SetStateAction<ExaminationFormData>>;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    selectedExamId: string | null;
    doctors: string[];
    onSave: () => void;
    patientId?: string;
    patientName?: string;
}

export function ExaminationToolbar({
    formData,
    setFormData,
    isEditing,
    setIsEditing,
    selectedExamId,
    doctors,
    onSave,
    patientId,
    patientName
}: ExaminationToolbarProps) {
    const [isPrintDialogOpen, setIsPrintDialogOpen] = React.useState(false);
    const [isProvisionModalOpen, setIsProvisionModalOpen] = React.useState(false);
    const activePatientId = patientId || (formData as any).hasta_id || "";

    return (
        <div className="rounded-xl border border-white bg-white shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <DatePicker
                    date={formData.tarih}
                    setDate={(dateStr) => setFormData((prev: any) => ({ ...prev, tarih: parseISO(dateStr) }))}
                    disabled={!isEditing}
                    className="w-[180px]"
                />

                <Select value={formData.doktor} onValueChange={(val) => setFormData((prev: any) => ({ ...prev, doktor: val }))} disabled={!isEditing}>
                    <SelectTrigger className={cn("w-[220px] h-10 bg-slate-50 border-slate-200 font-bold text-slate-700", !isEditing && "opacity-80")}>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <SelectValue placeholder="Doktor Seçiniz" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {doctors.map(doc => (<SelectItem key={doc} value={doc}>{doc}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-3">
                <Button className={cn("h-10 text-white font-bold text-sm px-6 gap-2 shadow-sm transition-all", !isEditing ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200")} onClick={() => isEditing ? onSave() : setIsEditing(true)}>
                    {isEditing ? <><Save className="h-4 w-4" /> KAYDET</> : <><Edit className="h-4 w-4" /> DÜZENLE</>}
                </Button>

                {activePatientId && (
                    <Button
                        variant="outline"
                        className="h-10 w-10 p-0 rounded-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                        onClick={() => setIsProvisionModalOpen(true)}
                        title="Özel Sağlık Sigortası Provizyon Formu Yazdır / Doldur"
                    >
                        <FileCheck className="h-4 w-4 text-blue-600" />
                    </Button>
                )}

                {selectedExamId && (
                    <Button variant="outline" className="h-10 w-10 p-0 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700" onClick={() => setIsPrintDialogOpen(true)} title="Muayene Notunu Yazdır">
                        <Printer className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {selectedExamId && isPrintDialogOpen && (
                <ExaminationPrintDialog
                    isOpen={isPrintDialogOpen}
                    onClose={() => setIsPrintDialogOpen(false)}
                    examId={selectedExamId}
                    patientId={activePatientId}
                    patientName={patientName}
                    examDate={formData.tarih ? formData.tarih.toISOString() : undefined}
                />
            )}

            {isProvisionModalOpen && (
                <InsuranceProvisionModal
                    isOpen={isProvisionModalOpen}
                    onClose={() => setIsProvisionModalOpen(false)}
                    hastaId={activePatientId}
                    examId={selectedExamId || undefined}
                    currentExamData={formData}
                />
            )}
        </div>
    );
}
