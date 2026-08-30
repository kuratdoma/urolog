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
import { toast } from "sonner";

interface InsuranceProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hastaId?: string;
  appointmentId?: number;
  examId?: string;
  currentExamData?: any;
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
    cinsiyet: "",
    police_no: "",
    kart_musteri_no: "",
    tc_kimlik_no: "",
    eposta: "",
    basvuru_tarihi: "",
    planlanan_yatis_cikis_tarihi: "",
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

  useEffect(() => {
    if (isOpen && (hastaId || appointmentId || examId)) {
      loadPrefillData();
    }
  }, [isOpen, hastaId, appointmentId, examId]);

  const loadPrefillData = async () => {
    setLoading(true);
    try {
      const prefilled = await insuranceProvisionApi.getPrefill({
        hasta_id: hastaId,
        appointment_id: appointmentId,
        exam_id: examId,
      });

      // If active currentExamData is passed from open examination screen, merge unsaved text
      let overrideSikayet = prefilled.sikayet_oyku;
      let overrideGecmis = prefilled.gecmis_oyku_ilaclar;
      let overrideFizik = prefilled.fizik_muayene_bulgulari;
      let overrideTani = prefilled.on_tani_tani;
      let overrideIcd = prefilled.icd10_kodu;
      let overrideTedavi = prefilled.planlanan_tedavi_islem;
      let overrideDoctor = prefilled.saglik_kurulusu_adi;

      if (currentExamData) {
        if (currentExamData.sikayet || currentExamData.oyku) {
          overrideSikayet = `Şikayet: ${currentExamData.sikayet || ''}\nÖykü: ${currentExamData.oyku || ''}`.trim();
        }
        if (currentExamData.ozgecmis || currentExamData.kullandigi_ilaclar) {
          overrideGecmis = `Özgeçmiş: ${currentExamData.ozgecmis || ''}\nİlaçlar: ${currentExamData.kullandigi_ilaclar || ''}`.trim();
        }
        if (currentExamData.fizik_muayene || currentExamData.bulgu_notu) {
          overrideFizik = currentExamData.fizik_muayene || currentExamData.bulgu_notu || "";
        }
        if (currentExamData.tani1 || currentExamData.tani_kesin) {
          overrideTani = currentExamData.tani1 || currentExamData.tani_kesin || "";
        }
        if (currentExamData.tani1_kodu) {
          overrideIcd = currentExamData.tani1_kodu;
        }
        if (currentExamData.tedavi || currentExamData.prosedur) {
          overrideTedavi = currentExamData.tedavi || currentExamData.prosedur || "";
        }
        if (currentExamData.doktor && currentExamData.doktor.trim()) {
          overrideDoctor = currentExamData.doktor.trim().toUpperCase();
        }
      }

      setFormData((prev) => ({
        ...prev,
        ...prefilled,
        hasta_id: hastaId || prefilled.hasta_id,
        appointment_id: appointmentId || prefilled.appointment_id,
        sikayet_oyku: overrideSikayet || prev.sikayet_oyku,
        gecmis_oyku_ilaclar: overrideGecmis || prev.gecmis_oyku_ilaclar,
        fizik_muayene_bulgulari: overrideFizik || prev.fizik_muayene_bulgulari,
        on_tani_tani: overrideTani || prev.on_tani_tani,
        icd10_kodu: overrideIcd || prev.icd10_kodu,
        planlanan_tedavi_islem: overrideTedavi || prev.planlanan_tedavi_islem,
        saglik_kurulusu_adi: overrideDoctor || prev.saglik_kurulusu_adi,
        operator: currentExamData?.doktor || prefilled.operator || prev.operator,
      }));
    } catch (err: any) {
      toast.error("Form verileri yüklenirken hata oluştu: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof InsuranceProvisionDTO, value: any) => {
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
    } catch (err: any) {
      toast.error("PDF oluşturma hatası: " + (err.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[75vw] w-[75vw] max-h-[90vh] overflow-y-auto p-6">
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
          <Tabs defaultValue="sigorta" className="w-full mt-2">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="sigorta">1. Sigorta & Genel</TabsTrigger>
              <TabsTrigger value="hasta">2. Hasta Bilgileri</TabsTrigger>
              <TabsTrigger value="tibbi">3. Tıbbi & Klinik</TabsTrigger>
              <TabsTrigger value="secenekler">4. Seçenekler & Ekip</TabsTrigger>
            </TabsList>

            {/* TAB 1: Sigorta & Genel */}
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
                    value={formData.cinsiyet || "Bay"}
                    onValueChange={(val) => handleChange("cinsiyet", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bay">Bay</SelectItem>
                      <SelectItem value="Bayan">Bayan</SelectItem>
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

            {/* TAB 3: Tıbbi & Klinik */}
            <TabsContent value="tibbi" className="space-y-4">
              <div>
                <Label className="font-semibold text-slate-700">Hastanın Şikâyeti / Öyküsü</Label>
                <Textarea
                  rows={4}
                  className="mt-1"
                  value={formData.sikayet_oyku || ""}
                  onChange={(e) => handleChange("sikayet_oyku", e.target.value)}
                />
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
                  rows={3}
                  className="mt-1"
                  value={formData.gecmis_oyku_ilaclar || ""}
                  onChange={(e) => handleChange("gecmis_oyku_ilaclar", e.target.value)}
                />
              </div>

              <div>
                <Label className="font-semibold text-slate-700">Fizik Muayene Bulguları</Label>
                <Textarea
                  rows={3}
                  className="mt-1"
                  value={formData.fizik_muayene_bulgulari || ""}
                  onChange={(e) => handleChange("fizik_muayene_bulgulari", e.target.value)}
                />
              </div>

              <div>
                <Label className="font-semibold text-slate-700">Tetkikler / Sonuçları</Label>
                <Textarea
                  rows={3}
                  className="mt-1"
                  value={formData.tetkikler_sonuclari || ""}
                  onChange={(e) => handleChange("tetkikler_sonuclari", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>Ön Tanı / Tanı</Label>
                  <Input
                    value={formData.on_tani_tani || ""}
                    onChange={(e) => handleChange("on_tani_tani", e.target.value)}
                  />
                </div>
                <div>
                  <Label>ICD 10 Kodu</Label>
                  <Input
                    value={formData.icd10_kodu || ""}
                    onChange={(e) => handleChange("icd10_kodu", e.target.value)}
                    placeholder="Ör: N40, N20.0"
                  />
                </div>
              </div>

              <div>
                <Label>Planlanan Tedavi / İşlem</Label>
                <Input
                  value={formData.planlanan_tedavi_islem || ""}
                  onChange={(e) => handleChange("planlanan_tedavi_islem", e.target.value)}
                />
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
                  <Label>Operatör</Label>
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
