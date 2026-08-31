# UroLOG — 43fc9c2 Versiyon Değişiklik Raporu (Changelog)

**Tarih:** 31 Ağustos 2026  
**Depo:** `https://github.com/kuratdoma/urolog`  
**Hedef Commit (HEAD):** `43fc9c2d6787a2d5b6d836440d925199d6024067`  
**Yazar:** alp  
**Commit Başlığı:** `feat(calendar): ajandadan muayene formuna yönlendirme, yeni kayıt brief desteği ve muayene kartı erişimi`

---

## 📌 Genel Durum & GitHub Senkronizasyonu

GitHub (`origin/main`) deposu incelendiğinde:
- GitHub üzerindeki en güncel commit **`43fc9c2`**'dir.
- Yerel çalışma ortamındaki `main` dalı **`a12d397`** seviyesinde olup, GitHub'daki **`43fc9c2`** sürümünün 4 commit gerisinde kalmıştır (`git pull` ile hızlı ileri sarılabilir).

Bu raporda:
1. **`43fc9c2` commit'inde yapılan çekirdek değişiklikler**,
2. **`a12d397..43fc9c2` arasındaki 4 commit'lik güncel paket (31 Ağustos)**,
3. **Son 48 saatte `43fc9c2`'ye ulaşan tüm mimari ve fonksiyonel iyileştirmeler** detaylandırılmıştır.

---

## 1. `43fc9c2` Commit'inde Yapılan Değişiklikler (Özet & Detay)

Bu commit ile ajanda/takvim üzerinden muayene süreçlerine geçiş hızlandırılmış, yeni hastalar için klinik brief açığı kapatılmış ve arayüz senkronizasyonu güçlendirilmiştir.

### 🔹 Değişen Dosyalar ve Kod İstatistikleri
- **9 Dosya Değişti:** `+300 ekleme`, `-66 silme`

| Dosya | Yapılan Değişiklik |
|---|---|
| `backend/app/repositories/appointment_repository.py` | İlk randevularda ve yeni hastalarda klinik brief çekilmesi için `is_first_appointment` ve `created_at` mantığı genişletildi. |
| `backend/app/schemas/appointment.py` | Randevu şemalarına yeni brief meta alanları eklendi. |
| `frontend/app/(dashboard)/calendar/page.tsx` | Takvim sayfası parametre ve görünüm hizalaması yapıldı. |
| `frontend/app/(dashboard)/patients/[id]/page.tsx` | Hasta detayından muayene sayfasına yönlendirme entegrasyonu sağlandı. |
| `frontend/components/calendar/calendar-agenda.tsx` | Ajanda görünümünde hasta isimlerine direkt muayene bağlantısı, klinik özet rozetleri ve kart tetikleyicileri eklendi. |
| `frontend/components/calendar/calendar-event.tsx` | Takvim kutularında hızlı muayene özet kartı (examination summary) ve muayene formuna direkt geçiş butonu eklendi. |
| `frontend/components/calendar/examination-summary-dialog.tsx` | Randevu içerisinden önceki muayene bulgularını hızlıca görüntüleyen ve yeni muayene açan diyalog zenginleştirildi. |
| `frontend/components/layout/sidebar.tsx` | URL'de `/patients/[id]` tespit edildiğinde Zustand store'daki `activePatient` durumunu otomatik senkronize eden dinleyici eklendi. |
| `frontend/components/patients/patient-detail-panel.tsx` | Üst buton grubu 3'lüye çıkarıldı (`Muayene`, `Detay`, `Randevu`), boş muayene listesine "İlk Muayeneyi Başlat" eylemi ve muayene kartlarına doğrudan link eklendi. |

---

## 2. Son Oturum Commitleri (`a12d397` ➔ `43fc9c2`)

Yerel `a12d397` sürümünden GitHub'daki `43fc9c2` sürümüne kadar ardışık 4 commit eklenmiştir:

### 1️⃣ `4d5b9b6` — `feat(calendar): open examination form on patient name click in agenda`
- **Tarih:** 31 Ağustos 2026 10:58
- **Kapsam:** `frontend/components/calendar/calendar-agenda.tsx`
- **Açıklama:** Ajanda listesindeki hasta adları düz metin olmaktan çıkarıldı. `hasta_id` mevcut olduğunda `/patients/[id]/examination` rotasına giden tıklanabilir bağlantıya dönüştürüldü. Tıklama durumunda etkinlik kartının diğer tetikleyicilerinin engellenmesi için `e.stopPropagation()` uygulandı.

### 2️⃣ `479fc7b` — `feat(hpv-briefing): add medical treatment and immune supplement tracking`
- **Tarih:** 31 Ağustos 2026 11:06
- **Kapsam:** Backend şemaları, servisleri, testleri ve frontend paneli (`5 dosya, +117, -3`)
- **Açıklama:**
  - `MedikalTedavi` modeli tanımlandı (`ahcc`, `ilac`, `immuneks`, `kullanim_sekli`, `notlar`).
  - `hpv_briefing_service.py` servisine hastanın anamnez, muayene notları ve reçetelerinden AHCC, İmmuneks veya antiviral/tıbbi takviyeleri regex/kural tabanlı yakalayan mantık eklendi.
  - HPV Brifing paneline (frontend) "Medikal Tedavi / İlaç & Takviye" takip kartı ve rozetleri eklendi.

### 3️⃣ `427eba5` — `fix(appointments): fix appointment types mapping and duration resolution`
- **Tarih:** 31 Ağustos 2026 13:54
- **Kapsam:** `frontend/components/appointments/useAppointmentForm.ts`
- **Açıklama:** Randevu oluşturma formunda randevu tipi seçildiğinde varsayılan sürenin (`duration_minutes`) doğru çözümlenememesi ve tip eşlemesinde yaşanan senkronizasyon hatası giderildi.

### 4️⃣ `43fc9c2` — `feat(calendar): ajandadan muayene formuna yönlendirme, yeni kayıt brief desteği ve muayene kartı erişimi`
- **Tarih:** 31 Ağustos 2026 16:31
- **Kapsam:** Yukarıdaki Bölüm 1'de detaylandırılan tam entegrasyon paketi.

---

## 3. Yakın Geçmiş Değişiklikleri (30-31 Ağustos Genel Özeti)

`43fc9c2` commit'ine zemin hazırlayan önceki önemli geliştirmeler:

| Commit | Başlık & Kapsam |
|---|---|
| `a12d397` | **Yeni Hasta İletişim Tercihi Uyarısı:** Hasta oluştururken İletişim / Arama / SMS / E-posta tercihlerinden hiçbiri seçilmediğinde formun sessizce kaydolmasını engelleyen uyarı diyaloğu (`AlertDialog`). |
| `6b48b30` | **Kişisel Notlar ve Hatırlatıcılar Modülü:** Kullanıcıya özel notlar, hatırlatma takvimi ve dashboard bildirim altyapısı. |
| `e0c14e1` | **ICD Arama ve Önbellek:** Eksik ICD-10 tanı arama/lookup uç noktalarının bağlanması ve Redis/bellek önbelleklemesi. |
| `5dad7e5` | **Kapsamlı Test & RBAC:** Çekirdek test paketleri, rol bazlı yetkilendirme (RBAC) doğrulamaları ve startup script düzeltmesi. |
| `ba2e953` - `c394d0f` | **CI/CD İyileştirmeleri:** Vitest, happy-dom yapılandırması ve PR diff lint optimizasyonları. |
| `047491b` - `8012977` | **Mimari Modülerleştirme:** Büyük tek parça (monolithic) bileşenlerin ve endpoint'lerin (Definitions, Finance, Followup, Photos, Archive, AI Scribe, Appointments, Patients, Examination) temiz hook ve alt bileşenlere bölünmesi. |
| `c53539e` | **P0, P1, P2 Performans Optimizasyonları:** Veritabanı sorgu optimizasyonları, gereksiz yeniden render'ların engellenmesi. |
| `02db5ca` | **Stok Modülü Sertleştirme:** Yetkilendirme, veri bütünlüğü ve stok takip ekranlarının tamamlanması. |

---

## 4. Yerel Ortamınızı Güncellemek İçin Önerilen Komut

Eğer yerel dalınızı GitHub'daki en güncel sürüm olan `43fc9c2`'ye güncellemek isterseniz:

```bash
git checkout main
git pull origin main
```
