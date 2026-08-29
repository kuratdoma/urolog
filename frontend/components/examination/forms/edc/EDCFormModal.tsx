import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ClipboardList, Info, Pill, Smile, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { generateNarrative } from "./logic";
import { EDReferenceInfo } from "./EDReferenceInfo";
import { EDCData } from "./schema";

interface EDCFormModalProps {
    onExport: (text: string) => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const EDCFormModal = ({ onExport, isOpen, onOpenChange }: EDCFormModalProps) => {
    const [answers, setAnswers] = useState<Partial<EDCData>>({});
    const [showInfo, setShowInfo] = useState(false);

    const handleExport = () => {
        const narrative = generateNarrative(answers as EDCData);
        if (!narrative) {
            toast.error("Veri girilmedi.");
            return;
        }
        onExport(narrative);
        onOpenChange(false);
    };

    const renderToggle = (id: keyof EDCData, options: string[]) => (
        <ToggleGroup type="single" value={(answers[id] as string) || ""} onValueChange={(v) => v && setAnswers(prev => ({ ...prev, [id]: v }))} className="justify-start bg-slate-100/50 p-1 rounded-lg border border-slate-200">
            {options.map(opt => (
                <ToggleGroupItem key={opt} value={opt} className="px-3 h-7 text-[10px] font-bold uppercase transition-all data-[state=on]:bg-white data-[state=on]:text-indigo-700 data-[state=on]:shadow-sm border border-transparent data-[state=on]:border-indigo-100 rounded-md flex-1">
                    {opt}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[60vw] !w-[60vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-0 shadow-2xl">
                <DialogHeader className="p-6 bg-white border-b border-slate-100 flex-shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <ClipboardList className="w-8 h-8" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-slate-800">ED FORMU</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-slate-500">Kapsamlı Cinsel Sağlık Değerlendirme Formu</DialogDescription>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowInfo(!showInfo)}
                            className={cn("h-10 w-10 rounded-full transition-all", showInfo ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}
                        >
                            <Info className="w-6 h-6" />
                        </Button>
                    </div>
                </DialogHeader>

                {showInfo && (
                    <div className="p-6 bg-slate-100 border-b border-slate-200 animation-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Muayene Rehberi ve Kriterler</h4>
                            <Button variant="ghost" size="sm" onClick={() => setShowInfo(false)} className="h-6 text-[10px] font-bold">Kapat</Button>
                        </div>
                        <EDReferenceInfo />
                    </div>
                )}

                <ScrollArea className="flex-1 p-6 h-full overflow-y-auto [&_[data-radix-scroll-area-viewport]]:!overflow-y-scroll">
                    <div className="space-y-8 pr-4">
                        {/* 1. Cinsel Öykü */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                1. Cinsel Öykü ve Sorunun Karakteri
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-700">Başlangıç</Label>{renderToggle("c_q1", ["Aniden", "Kademeli"])}</div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700">ED Süresi</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            value={answers["c_q2"] || ""}
                                            onChange={e => setAnswers(prev => ({ ...prev, c_q2: e.target.value }))}
                                            className="h-9 w-16 text-center bg-slate-50 border-slate-200"
                                            placeholder="#"
                                        />
                                        <ToggleGroup type="single" value={answers["c_q2_unit"] || "ay"} onValueChange={(v) => v && setAnswers(prev => ({ ...prev, c_q2_unit: v }))} className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 h-9">
                                            <ToggleGroupItem value="ay" className="px-3 h-7 text-[10px] font-bold data-[state=on]:bg-white data-[state=on]:shadow-sm rounded-md flex-1">AY</ToggleGroupItem>
                                            <ToggleGroupItem value="yıl" className="px-3 h-7 text-[10px] font-bold data-[state=on]:bg-white data-[state=on]:shadow-sm rounded-md flex-1">YIL</ToggleGroupItem>
                                        </ToggleGroup>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700">Son 1 Ay İlişki S.</Label>
                                    <Input value={answers["c_q10"] || ""} onChange={e => setAnswers(prev => ({ ...prev, c_q10: e.target.value }))} className="h-9 bg-slate-50 border-slate-200" placeholder="Sayı..." />
                                </div>
                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-700">Sabah Ereks.</Label>{renderToggle("c_q3", ["Var", "Yok"])}</div>
                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-700">Mastürbasyonda ereksiyon kalitesi</Label>{renderToggle("c_q4", ["İyi", "Yetersiz", "Kötü"])}</div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <Label className="text-xs font-bold text-slate-700">Sertlik Skoru (1-10)</Label>

                                    </div>
                                    <ToggleGroup type="single" value={answers["c_q5"] || ""} onValueChange={(v) => v && setAnswers(prev => ({ ...prev, c_q5: v }))} className="flex gap-0.5 bg-slate-50 p-0.5 rounded-lg border">
                                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map(n => (
                                            <ToggleGroupItem key={n} value={n} className="w-7 h-7 text-[10px] font-bold p-0 data-[state=on]:bg-indigo-600 data-[state=on]:text-white flex-1">{n}</ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </div>

                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-700">Sorun Odağı</Label>{renderToggle("c_q6", ["Sağlama", "Sürdürme"])}</div>
                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-700">Cinsel İstek</Label>{renderToggle("c_q7", ["Normal", "Azalmış", "Yok"])}</div>
                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-700">Boşalma / Orgazm</Label>{renderToggle("c_q8", ["Normal", "Erken", "Geç/Yok"])}</div>

                            </div>
                        </div>

                        {/* 2. Tıbbi Özgeçmiş */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                2. Tıbbi Özgeçmiş ve Risk Faktörleri
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                                {[
                                    { id: "c_m1", l: "Kalp Hast.", o: ["Var", "Yok"] },
                                    { id: "c_m2", l: "Hipertansiyon", o: ["Var", "Yok"] },
                                    { id: "c_m3", l: "Hiperlipidemi", o: ["Var", "Yok"] },
                                    { id: "c_m4", l: "DM", o: ["Var", "Yok"] },
                                    { id: "c_m6", l: "Nörolojik Patoloji", o: ["Var", "Yok"] },
                                    { id: "c_m7", l: "Pelvik Cerrahi", o: ["Var", "Yok"] },
                                    { id: "c_m8", l: "Uyku Apnesi", o: ["Var", "Yok"] },
                                    { id: "c_m9", l: "Hormonal Belirtiler", o: ["Evet", "Hayır"] }
                                ].map(item => (
                                    <div key={item.id} className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">{item.l}</Label>
                                        {renderToggle(item.id as keyof EDCData, item.o)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3 & 4 Compact Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* 3. İlaçlar ve Alışkanlıklar */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <Pill className="w-3.5 h-3.5" />
                                    3. İlaçlar ve Alışkanlıklar
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold text-slate-700 uppercase">Sigara</Label>
                                            <div className="flex gap-1.5">
                                                <div className="w-20 shrink-0">{renderToggle("c_h2", ["Var", "Yok"])}</div>
                                                {answers["c_h2"] === "Var" && <Input className="h-7 w-14 text-[10px] bg-slate-50" placeholder="P/Y" onChange={e => setAnswers(prev => ({ ...prev, c_h2_detail: e.target.value }))} />}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold text-slate-700 uppercase">Alkol</Label>
                                            <div className="w-full">{renderToggle("c_h3", ["Yok", "Sosyal", "Haftada 2+"])}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold text-slate-700 uppercase">Düzenli İlaç Kullanımı</Label>
                                            <div className="flex gap-2">
                                                <div className="w-24 shrink-0">{renderToggle("c_h1", ["Var", "Yok"])}</div>
                                                {answers["c_h1"] === "Var" && <Input className="h-7 flex-1 text-[10px] bg-slate-50" placeholder="Detay..." onChange={e => setAnswers(prev => ({ ...prev, c_h1_detail: e.target.value }))} />}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold text-slate-700 uppercase">Fiziksel Aktivite</Label>
                                            <div className="w-full shrink-0">{renderToggle("c_h5", ["Sedanter", "Aktivite Var"])}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Psikososyal ve İlişki */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <Smile className="w-3.5 h-3.5" />
                                    4. Psikososyal ve İlişki
                                </h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-700 uppercase">Stres / Kaygı</Label>{renderToggle("c_p1", ["Yok", "Hafif", "Şiddetli"])}</div>
                                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-700 uppercase">Partner İlişkisi</Label>{renderToggle("c_p3", ["İyi", "Orta", "Kötü"])}</div>
                                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-700 uppercase">Performans Kaygısı</Label>{renderToggle("c_p2", ["Evet", "Hayır"])}</div>
                                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-700 uppercase">Partner Durumu</Label>{renderToggle("c_p5", ["Var", "Yok"])}</div>
                                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-700 uppercase">Partner Yaklaşımı</Label>{renderToggle("c_p6", ["Destekleyici", "Eleştirel"])}</div>
                                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-700 uppercase">Çekim Kaybı</Label>{renderToggle("c_p7", ["Var", "Yok"])}</div>
                                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-700 uppercase">Depresyon Belirtileri</Label>{renderToggle("c_p4", ["Evet", "Hayır"])}</div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Tedavi Deneyimi */}
                        <div className="bg-slate-900 p-6 rounded-xl shadow-xl space-y-6">
                            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                5. Tedavi Deneyimi ve Beklentiler
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-400">İlaç Deneyimi (Viagra vb.)</Label>{renderToggle("c_t1", ["Evet", "Hayır"])}</div>
                                <div className="space-y-2"><Label className="text-xs font-bold text-slate-400">İlaç Yanıtı</Label>{renderToggle("c_t2", ["Başarılı", "Kısmen", "Yetersiz"])}</div>
                                <div className="space-y-2"><Label className="text-xs font-bold text-red-400">Hızlı Boşalma (Sertlik Kaybı Endişesi)</Label>{renderToggle("c_t3", ["Evet", "Hayır"])}</div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 bg-white border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-8 font-bold text-slate-600">Vazgeç</Button>
                    <Button onClick={handleExport} className="h-10 px-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100">Öyküye Aktar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
