# DB-Frontend Alan Uyumlama Yol Haritası

## Özet

Bu doküman, `sharded_clinical_muayeneler` tablosu ile frontend Examination formu arasındaki alan uyumsuzluklarını gidermek için hazırlanmış bir yol haritasıdır.

---

## 🔴 Faz 1: Kritik - Veri Kaybı Önleme (Öncelik: YÜKSEK) ✅ TAMAMLANDI

### Eylemler

- [x] `ShardedMuayene` modeline tani3-5 eklendi
- [x] Alembic migration oluşturuldu ve çalıştırıldı (sıfırdan `sharded_v1_initial`)
- [x] API şemaları güncellendi (tani3-5 + kodları mevcut)
- [x] Frontend formData -> API payload eşleşmesi doğrulandı

---

## 🟡 Faz 2: Gizli DB Alanlarını Göster (Öncelik: ORTA) ✅ TAMAMLANDI

### 2.1 `oneriler` Alanı ✅
- DiagnosisForm'a "Öneriler" textarea eklendi

### 2.2 `prosedur` Alanı ✅
- PhysicalExamForm'a "Yapılan İşlem / Prosedür" textarea eklendi
- DRE (Parmakla Rektal Muayene) alanı korundu

### 2.3 `mshq` Alanı ✅
- MSHQ-Ej Dialog bileşeni zaten mevcut (ExaminationDialogs.tsx)
- 4 soru, skor hesabı, öyküye aktarma çalışıyor

---

## 🟢 Faz 3: Alan İsimlendirme Tutarlılığı (Öncelik: DÜŞÜK) ✅ TAMAMLANDI

- [x] `erektil_islev` tüm sistemde tutarlı (DB, API, Frontend)
- [x] `aliskanliklar` mevcut parse mantığı korunuyor

---

## 📋 Ek Altyapı İyileştirmeleri ✅ TAMAMLANDI

- [x] Alembic migration geçmişi temizlendi (24 dosya → 1 temiz initial)
- [x] Schema hard-coding kaldırıldı (`schema="clinical"`, `schema="patient"`)
- [x] ForeignKey referansları temizlendi (`patient.sharded_...` → `sharded_...`)
- [x] TypeScript Interface Jeneratörü oluşturuldu (`npm run generate-types`)
- [x] `docker-compose.yml` fallback isimlendirme eklendi
- [x] `backend/.env` dosyası standardize edildi

---

## Durum: TÜM FAZLAR TAMAMLANDI ✅
Son güncelleme: 2026-02-21
