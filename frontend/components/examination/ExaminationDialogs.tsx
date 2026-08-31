"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ExaminationFormData } from "@/hooks/useExaminationPageLogic";
import { Patient, Muayene } from "@/lib/api";
import { IPSSForm, ipssAdapter } from "@/components/examination/forms/ipss";
import { IIEFForm, iiefAdapter } from "@/components/examination/forms/iief";
import { PrescriptionDialog } from "@/components/examination/prescription-dialog";
import { PEFormModal } from "@/components/modals/PEFormModal";
import { EDDrugsFormModal } from "@/components/examination/forms/ed-drugs";
import { EDCFormModal } from "@/components/examination/forms/edc";
import { PEQuestion } from "@/components/examination/shared/PEQuestion";
import { Zap } from "lucide-react";

interface ExaminationDialogsProps {
    formData: ExaminationFormData;
    setFormData: React.Dispatch<React.SetStateAction<ExaminationFormData>>;
    isEditing: boolean;
    dialogs: {
        deleteDialogOpen: boolean; setDeleteDialogOpen: (v: boolean) => void;
        isPEFormOpen: boolean; setIsPEFormOpen: (v: boolean) => void;
        isEDCFormOpen: boolean; setIsEDCFormOpen: (v: boolean) => void;
        isEDDrugsOpen: boolean; setIsEDDrugsOpen: (v: boolean) => void;
        prescriptionPopoverOpen: boolean; setPrescriptionPopoverOpen: (v: boolean) => void;
        appointmentNote: string | null; isNoteOpen: boolean; setIsNoteOpen: (v: boolean) => void;
        ipssDialogOpen: boolean; setIpssDialogOpen: (v: boolean) => void;
        iiefDialogOpen: boolean; setIiefDialogOpen: (v: boolean) => void;
        mshqDialogOpen: boolean; setMshqDialogOpen: (v: boolean) => void;
    };
    patient: Patient | null;
    pastExaminations: Muayene[];
    definitions: Record<string, unknown>;

    // Derived values needed
    ipssTotal: number;
    iiefTotal: number;
    iiefAnswers: Record<string, unknown>;
    setIiefAnswers: (val: Record<string, unknown>) => void;
    // Local states passed from page for now, or extracted? 
    // Wait, some dialogs (PEDT, PE Form) were local to page.tsx. 
    // They should ideally be moved here OR kept in page if they are not global. 
    // The plan said "Extract ExaminationDialogs". 
    // I will accept props for all dialog controls. 

    // Additional Props for Local Dialogs (Page.tsx managed)
    pedtValues: {
        open: boolean;
        setOpen: (v: boolean) => void;
        answers: Record<string, unknown>;
        setAnswers: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
        total: number;
        filled: boolean;
        severity: { label: string, color: string };
        onExport: () => void;
    };
    peFormValues: {
        open: boolean;
        setOpen: (v: boolean) => void;
        answers: Record<string, unknown>;
        setAnswers: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
        filled: boolean;
        onExport: () => void;
    };
    // IIEF Export Logic
    onIIEFExport: () => void;
    iiefFilled: boolean;

    // Confirm Delete
    onConfirmDelete: () => void;
}

export function ExaminationDialogs({
    formData,
    setFormData,
    isEditing,
    dialogs,
    patient,
    pastExaminations,
    definitions,
    ipssTotal,
    iiefTotal,
    iiefAnswers,
    setIiefAnswers,
    pedtValues,
    peFormValues,
    onIIEFExport,
    iiefFilled,
    onConfirmDelete
}: ExaminationDialogsProps) {
    const {
        deleteDialogOpen, setDeleteDialogOpen,
        isPEFormOpen, setIsPEFormOpen,
        isEDCFormOpen, setIsEDCFormOpen,
        isEDDrugsOpen, setIsEDDrugsOpen,
        prescriptionPopoverOpen, setPrescriptionPopoverOpen,
        appointmentNote, isNoteOpen, setIsNoteOpen,
        ipssDialogOpen, setIpssDialogOpen,
        iiefDialogOpen, setIiefDialogOpen,
        mshqDialogOpen, setMshqDialogOpen
    } = dialogs;

    const { doctorDetails, prescriptionTemplates, savePrescriptionTemplate } = definitions;

    return (
        <>
            {/* IPSS Dialog */}
            <Dialog open={ipssDialogOpen} onOpenChange={setIpssDialogOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 gap-0">
                    <DialogHeader className="p-4 bg-slate-50">
                        <DialogTitle>IPSS Değerlendirmesi ({ipssTotal})</DialogTitle>
                        <DialogDescription className="sr-only">IPSS prostat semptom skoru değerlendirme formu</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] p-4">
                        <IPSSForm value={ipssAdapter.toNew(formData)} onChange={(d) => setFormData((prev: ExaminationFormData) => ({ ...prev, ...ipssAdapter.toLegacy(d) }))} readOnly={!isEditing} />
                    </ScrollArea>
                    <DialogFooter className="p-4">
                        <Button onClick={() => setIpssDialogOpen(false)}>Tamam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* IIEF Dialog */}
            <Dialog open={iiefDialogOpen} onOpenChange={setIiefDialogOpen}>
                <DialogContent className="max-w-4xl bg-white p-0 gap-0">
                    <DialogHeader className="p-4 bg-indigo-50">
                        <DialogTitle>IIEF-EF ({iiefTotal})</DialogTitle>
                        <DialogDescription className="sr-only">Uluslararası erektil fonksiyon indeksi formu</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[55vh] p-4">
                        <IIEFForm value={iiefAdapter.toNew({ iief_ef_answers: JSON.stringify(iiefAnswers) })} onChange={(d) => { const legacy = iiefAdapter.toLegacy(d); if (legacy.iief_ef_answers) setIiefAnswers(JSON.parse(legacy.iief_ef_answers)); }} readOnly={!isEditing} />
                    </ScrollArea>
                    <DialogFooter className="p-4">
                        <Button variant="outline" onClick={onIIEFExport} disabled={!iiefFilled}>Öyküye Aktar</Button>
                        <Button onClick={() => setIiefDialogOpen(false)}>Tamam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MSHQ Dialog */}
            <Dialog open={mshqDialogOpen} onOpenChange={setMshqDialogOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 gap-0">
                    <DialogHeader className="p-4 bg-orange-50">
                        <DialogTitle>MSHQ-Ej Değerlendirmesi ({formData.mshq})</DialogTitle>
                        <DialogDescription className="sr-only">Erkek cinsel sağlık anketi formu</DialogDescription>
                    </DialogHeader><ScrollArea className="max-h-[55vh] p-4">
                    <div className="p-4 space-y-6">
                        <div className="space-y-4">
                            <PEQuestion
                                label="1. BOŞALMA YETENEĞİ"
                                description="Son 4 hafta içinde ne sıklıkta boşalabildiniz (orgazm olduğunuzda meni gelmesi)?"
                                value={String((formData.mshq_answers as Record<string, unknown>)?.q1 || "0")}
                                onChange={(v) => setFormData((prev: any) => ({ ...prev, mshq_answers: { ...(prev.mshq_answers as any), q1: v } }))}
                                options={[
                                    { value: "0", label: "Hiçbir zaman" },
                                    { value: "1", label: "Nadiren" },
                                    { value: "2", label: "Bazen" },
                                    { value: "3", label: "Çoğu zaman" },
                                    { value: "4", label: "Her zaman" }
                                ]}
                                disabled={!isEditing}
                            />
                            <PEQuestion
                                label="2. MENİ MİKTARI"
                                description="Gelen meni miktarı hakkında ne düşünüyorsunuz?"
                                value={String((formData.mshq_answers as Record<string, unknown>)?.q2 || "0")}
                                onChange={(v) => setFormData((prev: any) => ({ ...prev, mshq_answers: { ...(prev.mshq_answers as any), q2: v } }))}
                                options={[
                                    { value: "1", label: "Aşırı Az" },
                                    { value: "2", label: "Az" },
                                    { value: "3", label: "Normal" },
                                    { value: "4", label: "Bol" }
                                ]}
                                disabled={!isEditing}
                            />
                            <PEQuestion
                                label="3. BOŞALMA ŞİDDETİ"
                                description="Boşalma sırasındaki 'fışkırma' kuvveti ne düzeyde?"
                                value={String((formData.mshq_answers as Record<string, unknown>)?.q3 || "0")}
                                onChange={(v) => setFormData((prev: any) => ({ ...prev, mshq_answers: { ...(prev.mshq_answers as any), q3: v } }))}
                                options={[
                                    { value: "1", label: "Çok Zayıf" },
                                    { value: "2", label: "Zayıf" },
                                    { value: "3", label: "Orta" },
                                    { value: "4", label: "Kuvvetli" }
                                ]}
                                disabled={!isEditing}
                            />
                            <PEQuestion
                                label="4. HAZ / DOYUM"
                                description="Boşalma anındaki zevk / tatmin düzeyi nedir?"
                                value={String((formData.mshq_answers as Record<string, unknown>)?.q4 || "0")}
                                onChange={(v) => setFormData((prev: any) => ({ ...prev, mshq_answers: { ...(prev.mshq_answers as any), q4: v } }))}
                                options={[
                                    { value: "1", label: "Hiç Yok" },
                                    { value: "2", label: "Az" },
                                    { value: "3", label: "Orta" },
                                    { value: "4", label: "Çok İyi" }
                                ]}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">TOPLAM SKOR:</span>
                            <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-lg font-bold">
                                {Object.values(formData.mshq_answers || {}).reduce((acc, val) => acc + (parseInt(val as string) || 0), 0)}
                            </div>
                        </div>
                    </div>
                </ScrollArea><DialogFooter className="p-4">
                        <Button variant="outline" onClick={() => {
                            const score = Object.values(formData.mshq_answers || {}).reduce((acc, val) => acc + (parseInt(val as string) || 0), 0);
                            setFormData((prev: any) => ({ ...prev, mshq: String(score), oyku: (prev.oyku || "") + `\n[MSHQ-Ej] Skor: ${score}/16\n` }));
                            setMshqDialogOpen(false);
                            toast.success("MSHQ skoru kaydedildi ve öyküye eklendi.");
                        }}>Kaydet ve Öyküye Aktar</Button>
                        <Button onClick={() => setMshqDialogOpen(false)}>Kapat</Button>
                    </DialogFooter></DialogContent>
            </Dialog>

            {/* PEDT Dialog */}
            <Dialog open={pedtValues.open} onOpenChange={pedtValues.setOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 gap-0">
                    <DialogHeader className="p-4 bg-rose-50">
                        <DialogTitle>PEDT ({pedtValues.total})</DialogTitle>
                        <DialogDescription className="sr-only">Prematür ejakülasyon tanı aracı formu</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[55vh] p-4">
                        <PEQuestion label="1. KONTROL ZORLUĞU" description="Boşalmayı geciktirmek sizin için ne kadar zor?" value={pedtValues.answers.q1} onChange={(v) => pedtValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, q1: v }))} options={[{ value: "0", label: "Hiç zor değil" }, { value: "1", label: "Biraz zor" }, { value: "2", label: "Orta" }, { value: "3", label: "Çok zor" }, { value: "4", label: "Aşırı" }]} disabled={!isEditing} />
                        <PEQuestion label="2. BOŞALMA SIKLIĞI" description="Partneriniz istediği süreden önce ne sıklıkla boşalıyorsunuz?" value={pedtValues.answers.q2} onChange={(v) => pedtValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, q2: v }))} options={[{ value: "0", label: "Hiçbir zaman" }, { value: "1", label: "Nadiren" }, { value: "2", label: "Bazen" }, { value: "3", label: "Sıklıkla" }, { value: "4", label: "Her zaman" }]} disabled={!isEditing} />
                        <PEQuestion label="3. MİNİMAL UYARI" description="Çok az bir cinsel uyarıyla boşalma ne sıklıkla oluyor?" value={pedtValues.answers.q3} onChange={(v) => pedtValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, q3: v }))} options={[{ value: "0", label: "Hiçbir zaman" }, { value: "1", label: "Nadiren" }, { value: "2", label: "Bazen" }, { value: "3", label: "Sıklıkla" }, { value: "4", label: "Her zaman" }]} disabled={!isEditing} />
                        <PEQuestion label="4. SIKINTI DÜZEYİ" description="Erken boşalma ne kadar sıkıntı veriyor?" value={pedtValues.answers.q4} onChange={(v) => pedtValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, q4: v }))} options={[{ value: "0", label: "Hiç" }, { value: "1", label: "Biraz" }, { value: "2", label: "Orta" }, { value: "3", label: "Çok" }, { value: "4", label: "Aşırı" }]} disabled={!isEditing} />
                        <PEQuestion label="5. PARTNER MEMNUNİYETSİZLİĞİ" description="Partnerinizin boşalma zamanlamasından memnun olmadığı konusunda ne kadar endişeleniyorsunuz?" value={pedtValues.answers.q5} onChange={(v) => pedtValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, q5: v }))} options={[{ value: "0", label: "Hiç" }, { value: "1", label: "Biraz" }, { value: "2", label: "Orta" }, { value: "3", label: "Çok" }, { value: "4", label: "Aşırı" }]} disabled={!isEditing} />
                    </ScrollArea>
                    <DialogFooter className="p-4">
                        <Button variant="outline" onClick={pedtValues.onExport} disabled={!pedtValues.filled}>Öyküye Aktar</Button>
                        <Button onClick={() => pedtValues.setOpen(false)}>Tamam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PE Clinical Dialog */}
            <Dialog open={peFormValues.open} onOpenChange={peFormValues.setOpen}>
                <DialogContent className="!max-w-[90vw] !w-[50vw] min-w-[600px] max-h-[90vh] p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-5 bg-cyan-50 flex flex-row items-center gap-3">
                        <div className="p-2 bg-cyan-100 rounded-lg">
                            <Zap className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div className="flex flex-col">
                            <DialogTitle className="text-lg font-bold text-slate-900">PE Klinik Değerlendirme Formu</DialogTitle>
                            <DialogDescription className="text-sm text-cyan-700 italic">Prematür Ejakülasyon - Klinik Öykü ve Ayırıcı Tanı</DialogDescription>
                        </div>
                    </DialogHeader>
                    <ScrollArea className="flex-1 w-full overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                        <div className="p-5 space-y-6">
                            <div className="space-y-2">
                                <h4 className="font-bold text-[10px] text-cyan-700 border-b border-cyan-100 pb-1.5 flex items-center gap-2 uppercase tracking-tight">
                                    <span className="bg-cyan-100 text-cyan-700 rounded-full w-4 h-4 flex items-center justify-center text-[9px]">1</span>
                                    Temel Tanısal Sorular
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    <PEQuestion label="BOŞALMA SÜRESİ (IELT)" description="Vajinal penetrasyon sonrası boşalma süreniz nedir?" value={peFormValues.answers.ielt} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, ielt: v }))} options={[{ value: "1", label: "1 dakikadan az" }, { value: "2", label: "1-2 dakika" }, { value: "3", label: "2-3 dakika" }, { value: "4", label: "3 dakikadan fazla" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                    <PEQuestion label="BAŞLANGIÇ ZAMANI" description="Sorun ne zaman başladı?" value={peFormValues.answers.baslangic} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, baslangic: v }))} options={[{ value: "lifelong", label: "İlk ilişkiden beri (Yaşam Boyu)" }, { value: "acquired", label: "Sonradan Gelişti (Edinilmiş)" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                    <PEQuestion label="DURUMSAL TUTARLILIK" description="Sorun hangi durumlarda görülüyor?" value={peFormValues.answers.tutarlilik} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, tutarlilik: v }))} options={[{ value: "general", label: "Her ilişkide (Genel)" }, { value: "situational", label: "Belli partner/durumlarda (Durumsal)" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                    <PEQuestion label="SIKLIK" description="Ne sıklıkla erken boşalma yaşanıyor?" value={peFormValues.answers.siklik} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, siklik: v }))} options={[{ value: "always", label: "Her ilişkide" }, { value: "intermittent", label: "Zaman zaman / Aralıklı" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-[10px] text-cyan-700 border-b border-cyan-100 pb-1.5 flex items-center gap-2 uppercase tracking-tight">
                                    <span className="bg-cyan-100 text-cyan-700 rounded-full w-4 h-4 flex items-center justify-center text-[9px]">2</span>
                                    Ayırıcı Tanı ve Eşlik Eden Durumlar
                                </h4>
                                <div className="grid grid-cols-1 gap-2">
                                    <PEQuestion label="SERTLEŞME SORUNU (ED)" description="Sertleşme kaybı eşlik ediyor mu?" value={peFormValues.answers.ed_var} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, ed_var: v }))} options={[{ value: "yes", label: "Evet, ED eşlik ediyor" }, { value: "no", label: "Hayır, sertleşme normal" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                    <PEQuestion label="SERTLİK KAYBI KORKUSU" description="Ereksiyonu kaybetmemek için acele ediyor musunuz?" value={peFormValues.answers.ed_korku} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, ed_korku: v }))} options={[{ value: "yes", label: "Evet, acele ediyorum" }, { value: "no", label: "Hayır" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                    <PEQuestion label="İLAÇ / MADDE" description="Düzenli ilaç veya madde kullanımı var mı?" value={peFormValues.answers.ilac} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, ilac: v }))} options={[{ value: "yes", label: "Evet" }, { value: "no", label: "Hayır" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                    <PEQuestion label="İLİŞKİ KALİTESİ" description="Partner ilişkiniz nasıl?" value={peFormValues.answers.iliski} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, iliski: v }))} options={[{ value: "good", label: "İyi / Sorunsuz" }, { value: "problems", label: "İlişkisel sorunlar mevcut" }]} disabled={!isEditing} compact activeColor="cyan" hideValue />
                                    <PEQuestion label="PERFORMANS KAYGISI" description="İlişki öncesi yoğun kaygı ve stres var mı?" value={peFormValues.answers.kaygi} onChange={(v) => peFormValues.setAnswers((prev: Record<string, unknown>) => ({ ...prev, kaygi: v }))} options={[{ value: "yes", label: "Evet, yoğun kaygı var" }, { value: "no", label: "Hayır" }]} disabled={!isEditing} compact activeColor="rose" hideValue />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-3">
                        <Button variant="outline" onClick={peFormValues.onExport} disabled={!peFormValues.filled}>Öyküye Aktar</Button>
                        <Button onClick={() => peFormValues.setOpen(false)}>Tamam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Muayene Kaydı Silinsin mi?</DialogTitle>
                        <DialogDescription>
                            Muayene formu silinecek. Bu işlem geri alınamaz. Emin misiniz?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
                        <Button className="bg-red-600 text-white hover:bg-red-700" onClick={onConfirmDelete}>Evet, Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Randevu Notu</DialogTitle>
                        <DialogDescription className="sr-only">Randevu notu detayları</DialogDescription>
                    </DialogHeader>
                    <div className="p-6">{appointmentNote}</div>
                </DialogContent>
            </Dialog>

            <EDCFormModal isOpen={isEDCFormOpen} onOpenChange={setIsEDCFormOpen} onExport={(t) => setFormData((prev: ExaminationFormData) => ({ ...prev, oyku: prev.oyku + t }))} />
            <EDDrugsFormModal isOpen={isEDDrugsOpen} onOpenChange={setIsEDDrugsOpen} onDrugsSelected={(drugs) => setFormData((prev: ExaminationFormData) => ({ ...prev, kullandigi_ilaclar: prev.kullandigi_ilaclar + ", " + drugs.join(", ") }))} onExport={(t) => setFormData((prev: ExaminationFormData) => ({ ...prev, oyku: prev.oyku + t }))} />

            <PrescriptionDialog
                open={prescriptionPopoverOpen} onOpenChange={setPrescriptionPopoverOpen}
                patient={patient || {}}
                pastPrescriptions={pastExaminations.filter((e: Muayene) => e.recete).map((e: Muayene) => ({ date: e.tarih ? new Date(e.tarih).toLocaleDateString() : '-', content: e.recete || '', doctorName: e.doktor || '' }))}
                doctors={doctorDetails as string[]} templates={prescriptionTemplates as string[]}
                onCommit={(t) => setFormData((prev: ExaminationFormData) => ({ ...prev, recete: prev.recete ? prev.recete + "\n" + t : t }))}
                onSaveTemplate={savePrescriptionTemplate as any} initialDoctorName={formData.doktor}
            />

            <PEFormModal isOpen={isPEFormOpen} onOpenChange={setIsPEFormOpen} onExport={(t) => { setFormData((prev: ExaminationFormData) => ({ ...prev, fizik_muayene: prev.fizik_muayene + " " + t })); toast.success("Aktarıldı."); }} />
        </>
    );
}
