"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { insuranceProvisionApi, InsuranceProvisionDTO } from "@/lib/api/insuranceProvision";
import { Printer, Eye, Loader2, FileText } from "lucide-react";
import { ExaminationFormData } from "@/hooks/useExaminationPageLogic";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InsuranceProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hastaId?: string;
  appointmentId?: number;
  examId?: string;
  currentExamData?: Partial<ExaminationFormData> | null;
  onSaved?: () => void;
}

export const InsuranceProvisionModal: React.FC<InsuranceProvisionModalProps> = ({
  isOpen,
  onClose,
  hastaId,
  appointmentId,
  examId,
  currentExamData,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState<InsuranceProvisionDTO>({
    sigorta_sirketi: "",
    provizyon_no: "",
    irtibat_tel: "",
    irtibat_faks: "",
    saglik_kurulusu_adi: "PROF. DR. TAYYAR ALP ÖZKAN",
    kurum_kodu: "",
    telefon_no: "262 321 0141",
    faks_no: "",
    sigortali_adi_soyadi: "",
    dogum_tarihi: "",
    cinsiyet: "Erkek",
    police_no: "",
    kart_musteri_no: "",
    tc_kimlik_no: "",
    eposta: "",
    basvuru_tarihi: "",
    planlanan_yatis_cikis_tarihi: "",
    sikayeti: "",
    oykusu: "",
    sikayet_oyku: "",
    sikayet_baslangic_tarihi: "",
    daha_once_basvuru_var_mi: "",
    gecmis_oyku_ilaclar: "",
    fizik_muayene_bulgulari: "",
    tetkikler_sonuclari: "",
    giris_tipi: "Poliklinik",
    on_tani_tani: "",
    icd10_kodu: "",
    planlanan_tedavi_islem: "",
    anlasma_durumu: "Anlaşmalı",
    operator: "Prof. Dr. Tayyar Alp Özkan",
    anestezi: "",
    asistan: "",
    tarih: new Date().toLocaleDateString("tr-TR"),
    save_to_documents: true,
  });

  const loadPrefillData = React.useCallback(async () => {
    setLoading(true);
    try {
      const prefilled = await insuranceProvisionApi.getPrefill({
        hasta_id: hastaId,
        appointment_id: appointmentId,
        exam_id: examId,
      });

      // If active currentExamData is passed from open examination screen, merge unsaved text
      let overrideSikayeti = prefilled.sikayeti || "";
      let overrideOykusu = prefilled.oykusu || "";
      let overrideGecmis = prefilled.gecmis_oyku_ilaclar;
      let overrideFizik = prefilled.fizik_muayene_bulgulari;
      let overrideTetkikler = prefilled.tetkikler_sonuclari;
      let overrideTani = prefilled.on_tani_tani;
      let overrideIcd = prefilled.icd10_kodu;
      let overrideTedavi = prefilled.planlanan_tedavi_islem;
      let overrideDoctor = prefilled.saglik_kurulusu_adi;

      if (currentExamData) {
        if (typeof currentExamData.sikayet === "string" && currentExamData.sikayet.trim()) {
          overrideSikayeti = currentExamData.sikayet.trim();
        }
        if (typeof currentExamData.oyku === "string" && currentExamData.oyku.trim()) {
          overrideOykusu = currentExamData.oyku.trim();
        }

        const gecmisParts: string[] = [];
        if (currentExamData.ozgecmis && typeof currentExamData.ozgecmis === "string" && currentExamData.ozgecmis.trim()) {
          gecmisParts.push(`Özgeçmiş: ${currentExamData.ozgecmis.trim()}`);
        }
        if (currentExamData.kullandigi_ilaclar && typeof currentExamData.kullandigi_ilaclar === "string" && currentExamData.kullandigi_ilaclar.trim()) {
          gecmisParts.push(`İlaçlar: ${currentExamData.kullandigi_ilaclar.trim()}`);
        }
        if (gecmisParts.length > 0) {
          overrideGecmis = gecmisParts.join("\n");
        }

        if (currentExamData.fizik_muayene || currentExamData.bulgu_notu) {
          overrideFizik = currentExamData.fizik_muayene || currentExamData.bulgu_notu || "";
        }
        if (currentExamData.sonuc || currentExamData.bulgu_notu) {
          overrideTetkikler = currentExamData.sonuc || currentExamData.bulgu_notu || "";
        }
        if (currentExamData.tani1) {
          overrideTani = currentExamData.tani1;
        }
        if (currentExamData.tani1_kodu) {
          overrideIcd = currentExamData.tani1_kodu;
        }

        // Build planned treatment from tedavi + oneriler (plan) + prosedur
        const tedaviParts: string[] = [];
        if (currentExamData.tedavi && typeof currentExamData.tedavi === "string" && currentExamData.tedavi.trim()) {
          tedaviParts.push(currentExamData.tedavi.trim());
        }
        if (currentExamData.oneriler && typeof currentExamData.oneriler === "string" && currentExamData.oneriler.trim()) {
          tedaviParts.push(`Plan/Öneri: ${currentExamData.oneriler.trim()}`);
        }
        if (currentExamData.prosedur && typeof currentExamData.prosedur === "string" && currentExamData.prosedur.trim()) {
          tedaviParts.push(`İşlem: ${currentExamData.prosedur.trim()}`);
        }
        if (tedaviParts.length > 0) {
          overrideTedavi = tedaviParts.join("\n");
        }

        if (currentExamData.doktor && typeof currentExamData.doktor === "string" && currentExamData.doktor.trim()) {
          overrideDoctor = currentExamData.doktor.trim().toUpperCase();
        }
      }

      // Map cinsiyet
      let resolvedCinsiyet = prefilled.cinsiyet || "Erkek";
      const rawCins = resolvedCinsiyet.toLowerCase();
      if (rawCins.includes("kad") || rawCins.includes("bayan") || rawCins === "k" || rawCins === "female") {
        resolvedCinsiyet = "Kadın";
      } else {
        resolvedCinsiyet = "Erkek";
      }

      setFormData((prev) => ({
        ...prev,
        ...prefilled,
        hasta_id: hastaId || prefilled.hasta_id,
        appointment_id: appointmentId || prefilled.appointment_id,
        cinsiyet: resolvedCinsiyet,
        sikayeti: overrideSikayeti || prefilled.sikayeti || prev.sikayeti,
        oykusu: overrideOykusu || prefilled.oykusu || prev.oykusu,
        gecmis_oyku_ilaclar: overrideGecmis ?? prefilled.gecmis_oyku_ilaclar ?? prev.gecmis_oyku_ilaclar,
        fizik_muayene_bulgulari: overrideFizik || prev.fizik_muayene_bulgulari,
        tetkikler_sonuclari: overrideTetkikler || prev.tetkikler_sonuclari,
        on_tani_tani: overrideTani || prev.on_tani_tani,
        icd10_kodu: overrideIcd || prev.icd10_kodu,
        planlanan_tedavi_islem: overrideTedavi || prev.planlanan_tedavi_islem,
        saglik_kurulusu_adi: overrideDoctor || prefilled.saglik_kurulusu_adi || prev.saglik_kurulusu_adi,
        operator: currentExamData?.doktor || prefilled.operator || prev.operator,
      }));
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error("Form verileri yüklenirken hata oluştu: " + (errorObj.message || ""));
    } finally {
      setLoading(false);
    }
  }, [hastaId, appointmentId, examId, currentExamData]);

  useEffect(() => {
    if (isOpen && (hastaId || appointmentId || examId)) {
      loadPrefillData();
    }
  }, [isOpen, hastaId, appointmentId, examId, loadPrefillData]);

  const handleChange = <K extends keyof InsuranceProvisionDTO>(field: K, value: InsuranceProvisionDTO[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async (shouldPrint: boolean) => {
    setGenerating(true);
    try {
      const pdfBlob = await insuranceProvisionApi.generatePDF(formData);
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (shouldPrint) {
        // Open PDF in print window
        const printWindow = window.open(blobUrl, "_blank");
        if (printWindow) {
          printWindow.focus();
        }
        toast.success("PDF üretildi ve hasta belgelerine kaydedildi.");
      } else {
        // Preview PDF
        window.open(blobUrl, "_blank");
        toast.info("PDF önizlemesi açıldı.");
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error("PDF oluşturma hatası: " + (errorObj.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  const girisTipleri = ["Poliklinik", "Cerrahi Yatış", "Acil", "Dahili Yatış"] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[78vw] w-[78vw] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <FileText className="w-6 h-6 text-blue-600" />
            Özel Sağlık Sigortası Hasta Bilgi Formu (Provizyon)
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Veriler yükleniyor...</span>
          </div>
        ) : (
          <Tabs defaultValue="tibbi" className="w-full mt-2">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="tibbi">1. Tıbbi & Klinik</TabsTrigger>
              <TabsTrigger value="hasta">2. Hasta Bilgileri</TabsTrigger>
              <TabsTrigger value="sigorta">3. Sigorta & Kurum</TabsTrigger>
              <TabsTrigger value="secenekler">4. Seçenekler & Ekip</TabsTrigger>
            </TabsList>

            {/* TAB 1: Tıbbi & Klinik (Primary) */}
            <TabsContent value="tibbi" className="space-y-4">
              {/* Giriş Tipi Hızlı Seçim Tuşları */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <Label className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Giriş / Başvuru Tipi (Tek Tıkla Seçiniz)
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {girisTipleri.map((tip) => {
                    const isSelected = formData.giris_tipi === tip;
                    return (
                      <Button
                        key={tip}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-10 text-xs font-bold transition-all rounded-lg",
                          isSelected
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-blue-600"
                            : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-slate-200"
                        )}
                        onClick={() => handleChange("giris_tipi", tip)}
                      >
                        {tip}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 1. Şikayet ve Öykü (2 Ayrı Alan) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-slate-700">Hastanın Şikâyeti</Label>
                  <Textarea
                    rows={3}
                    className="mt-1"
                    value={formData.sikayeti || ""}
                    onChange={(e) => handleChange("sikayeti", e.target.value)}
                    placeholder="Hastanın birincil şikayeti..."
                  />
                </div>
                <div>
                  <Label className="font-semibold text-slate-700">Hastanın Öyküsü / Hikayesi</Label>
                  <Textarea
                    rows={3}
                    className="mt-1"
                    value={formData.oykusu || ""}
                    onChange={(e) => handleChange("oykusu", e.target.value)}
                    placeholder="Hastalığın gelişim öyküsü..."
                  />
                </div>
              </div>

              <div>
                <Label className="font-semibold text-slate-700">Şikâyetin Başlangıç Tarihi</Label>
                <Input
                  className="mt-1"
                  value={formData.sikayet_baslangic_tarihi || ""}
                  onChange={(e) => handleChange("sikayet_baslangic_tarihi", e.target.value)}
                  placeholder="Ör: 3 gün önce / 12.08.2026"
                />
              </div>

              <div>
                <Label className="font-semibold text-slate-700">Özgeçmiş / Kullandığı İlaçlar</Label>
                <Textarea
                  rows={2}
                  className="mt-1"
                  value={formData.gecmis_oyku_ilaclar || ""}
                  onChange={(e) => handleChange("gecmis_oyku_ilaclar", e.target.value)}
                />
              </div>

              <div>
                <Label className="font-semibold text-slate-700">Fizik Muayene Bulguları</Label>
                <Textarea
                  rows={2}
                  className="mt-1"
                  value={formData.fizik_muayene_bulgulari || ""}
                  onChange={(e) => handleChange("fizik_muayene_bulgulari", e.target.value)}
                />
              </div>

              {/* Tetkikler / Sonuçları Alanı */}
              <div>
                <Label className="font-semibold text-slate-700">Tetkikler / Sonuçları</Label>
                <Textarea
                  rows={2}
                  className="mt-1"
                  value={formData.tetkikler_sonuclari || ""}
                  onChange={(e) => handleChange("tetkikler_sonuclari", e.target.value)}
                  placeholder="Laboratuvar, radyoloji ve diğer tetkik bulguları..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label className="font-semibold text-slate-700">Ön Tanı / Tanı</Label>
                  <Input
                    className="mt-1"
                    value={formData.on_tani_tani || ""}
                    onChange={(e) => handleChange("on_tani_tani", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="font-semibold text-slate-700">ICD 10 Kodu</Label>
                  <Input
                    className="mt-1"
                    value={formData.icd10_kodu || ""}
                    onChange={(e) => handleChange("icd10_kodu", e.target.value)}
                    placeholder="Ör: N40, N20.0"
                  />
                </div>
              </div>

              {/* Planlanan Tedavi / Plan Alanı */}
              <div>
                <Label className="font-semibold text-slate-700">Planlanan Tedavi / İşlem / Plan</Label>
                <Textarea
                  rows={2}
                  className="mt-1"
                  value={formData.planlanan_tedavi_islem || ""}
                  onChange={(e) => handleChange("planlanan_tedavi_islem", e.target.value)}
                  placeholder="Ör: Medikal tedavi, operasyon planı veya öneriler..."
                />
              </div>
            </TabsContent>

            {/* TAB 2: Hasta Bilgileri */}
            <TabsContent value="hasta" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sigortalının Adı-Soyadı</Label>
                  <Input
                    value={formData.sigortali_adi_soyadi || ""}
                    onChange={(e) => handleChange("sigortali_adi_soyadi", e.target.value)}
                  />
                </div>
                <div>
                  <Label>TC Kimlik No</Label>
                  <Input
                    value={formData.tc_kimlik_no || ""}
                    onChange={(e) => handleChange("tc_kimlik_no", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Doğum Tarihi</Label>
                  <Input
                    value={formData.dogum_tarihi || ""}
                    onChange={(e) => handleChange("dogum_tarihi", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Cinsiyet</Label>
                  <Select
                    value={formData.cinsiyet || "Erkek"}
                    onValueChange={(val) => handleChange("cinsiyet", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Erkek">Erkek</SelectItem>
                      <SelectItem value="Kadın">Kadın</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Poliçe No</Label>
                  <Input
                    value={formData.police_no || ""}
                    onChange={(e) => handleChange("police_no", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Kart / Müşteri No</Label>
                  <Input
                    value={formData.kart_musteri_no || ""}
                    onChange={(e) => handleChange("kart_musteri_no", e.target.value)}
                  />
                </div>
                <div>
                  <Label>E-Posta Adresi</Label>
                  <Input
                    value={formData.eposta || ""}
                    onChange={(e) => handleChange("eposta", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Sigorta & Kurum */}
            <TabsContent value="sigorta" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sigorta Şirketi</Label>
                  <Input
                    value={formData.sigorta_sirketi || ""}
                    onChange={(e) => handleChange("sigorta_sirketi", e.target.value)}
                    placeholder="Ör: Allianz, Mapfre, Bupa Acıbadem..."
                  />
                </div>
                <div>
                  <Label>Provizyon No</Label>
                  <Input
                    value={formData.provizyon_no || ""}
                    onChange={(e) => handleChange("provizyon_no", e.target.value)}
                    placeholder="Provizyon Takip Numarası"
                  />
                </div>
                <div>
                  <Label>Sağlık Kuruluşu Adı</Label>
                  <Input
                    value={formData.saglik_kurulusu_adi || ""}
                    onChange={(e) => handleChange("saglik_kurulusu_adi", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Kurum Kodu / Tel No</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.kurum_kodu || ""}
                      onChange={(e) => handleChange("kurum_kodu", e.target.value)}
                      placeholder="Kurum Kodu"
                    />
                    <Input
                      value={formData.telefon_no || ""}
                      onChange={(e) => handleChange("telefon_no", e.target.value)}
                      placeholder="Tel No"
                    />
                  </div>
                </div>
                <div>
                  <Label>Başvuru Tarihi</Label>
                  <Input
                    value={formData.basvuru_tarihi || ""}
                    onChange={(e) => handleChange("basvuru_tarihi", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Planlanan Yatış/Çıkış Tarihi</Label>
                  <Input
                    value={formData.planlanan_yatis_cikis_tarihi || ""}
                    onChange={(e) => handleChange("planlanan_yatis_cikis_tarihi", e.target.value)}
                    placeholder="Ör: 17.08.2026 - 18.08.2026"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Seçenekler & Ekip */}
            <TabsContent value="secenekler" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Giriş Tipi</Label>
                  <Select
                    value={formData.giris_tipi || "Poliklinik"}
                    onValueChange={(val) => handleChange("giris_tipi", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Poliklinik">Poliklinik</SelectItem>
                      <SelectItem value="Cerrahi Yatış">Cerrahi Yatış</SelectItem>
                      <SelectItem value="Acil">Acil</SelectItem>
                      <SelectItem value="Dahili Yatış">Dahili Yatış</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Anlaşma Durumu</Label>
                  <Select
                    value={formData.anlasma_durumu || "Anlaşmalı"}
                    onValueChange={(val) => handleChange("anlasma_durumu", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Anlaşmalı">Anlaşmalı</SelectItem>
                      <SelectItem value="Anlaşmasız">Anlaşmasız (*)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Operatör / Hekim</Label>
                  <Input
                    value={formData.operator || ""}
                    onChange={(e) => handleChange("operator", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Anestezi Hekimi</Label>
                  <Input
                    value={formData.anestezi || ""}
                    onChange={(e) => handleChange("anestezi", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Asistan</Label>
                  <Input
                    value={formData.asistan || ""}
                    onChange={(e) => handleChange("asistan", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Form Tarihi</Label>
                  <Input
                    value={formData.tarih || ""}
                    onChange={(e) => handleChange("tarih", e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex items-center space-x-2">
                <Checkbox
                  id="save_docs"
                  checked={formData.save_to_documents}
                  onCheckedChange={(checked) => handleChange("save_to_documents", !!checked)}
                />
                <Label htmlFor="save_docs" className="text-sm font-medium leading-none cursor-pointer">
                  Üretilen PDF formunu hastanın Belgeler arşivine (`HastaDosya`) otomatik kaydet
                </Label>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose} disabled={generating}>
            İptal
          </Button>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleGenerate(false)}
              disabled={generating || loading}
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
              Önizle
            </Button>

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => handleGenerate(true)}
              disabled={generating || loading}
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
              Yazdır & Belgelere Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
