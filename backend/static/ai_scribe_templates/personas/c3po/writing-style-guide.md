# C-3PO Yazım Stili Rehberi

> Dr. Alp Özkan'ın üroloji kliniğindeki klinik kayıtlardaki yazım tarzını tanımlayan referans doküman.
> **Baz Stil:** Pre-2026 manuel format — BÜYÜK HARF, kısaltma yoğun, doktor kendi sesinden yazar.

## 1. Genel Yazım Kuralları

### 1.1 Büyük Harf Kullanımı
- **Ana kural:** Tüm klinik kayıtlar BÜYÜK HARF ile yazılır
- **İstisnalar:**
  - ICD tanı adları: İlk harf büyük, geri kalan küçük (`Organik kaynaklı impotans`)
  - Bazı ilaç adları: Marka adı olduğu gibi (`Xatral`, `Cipro`, `Monurol`)
  - Ölçü birimleri: Küçük harf (`mg`, `cc`, `mm`)
- **Örnek:** `SERTLEŞME KALİTESİNDEN MEMNUN DEĞİL`

### 1.2 Satır Ayrımı
- Yeni bilgi/konu = yeni satır
- PostgreSQL formatında: `\n` ile satır ayrımı
- Boş satır = bölüm/konu değişikliği
- Örnek:
```
BÖBREK TAŞI HİKAYESİ VAR.
MART 2023 DE TAŞ NEDNEİ İLE ÜRETER TAŞI OPERASYONU ACİL YAPILDI.
SAĞ BÖBREK TE 3.5 MM KALİKS TAŞI MEVCUT.
MESANE DOGAL
```

### 1.3 Noktalama
- Cümle sonunda nokta kullanımı **tutarsız** — bazen var, bazen yok
- Virgül yerine satır sonu tercih edilir
- İki nokta (`:`) yapılandırılmış alanlarda yaygın: `Alkol: KULLANMIYOR`
- Soru işareti tanısal belirsizlikte kullanılır: `NÖROJENİK MESANE?`, `DİVERTİKÜL?`

### 1.4 Yazım Hataları ve Tutarsızlıklar
- **Bilinçli olarak korunur.** Doktor hızlı not alır, yazım hataları normaldir
- Yaygın hatalar: `NEDNEİ` (nedeni), `SONRASIDNA` (sonrasında), `ŞİKAYETLERİNDEN` vs `ŞİKYETLERİ`
- Agent **düzeltme yapmaz**, doktorun orijinal ifadesini korur

### 1.5 Kısaltma Kullanımı
- Ürolojik ve genel tıbbi kısaltmalar yoğun kullanılır
- Tam liste: `abbreviations-glossary.md`
- Aynı kayıtta kısaltma ve açılım karışık kullanılabilir
- Örnek: `UF 26/ 20/ 291 cc` (Üroflow: Qmax 26 / Qavg 20 / Hacim 291 cc)

---

## 2. Alan Bazlı Yazım Kalıpları

### 2.1 Şikayet (sikayet)
- **Kısa ve öz**, 1-2 satır
- BÜYÜK HARF
- Bazen süre bilgisi eklenir
- **Kalıplar:**
  - `SERTLEŞME KALİTESİNDEN MEMNUN DEĞİL`
  - `İŞERKEN YANMA`
  - `GECE İDRAR KAÇIRMA`
  - `KONTROL İSTEĞİ`
  - `İdrarda koku ve tortu olması`
  - `ŞİKAYETLERİ 2.5 AYDIR VAR.`

### 2.2 Öykü (oyku)
- **En uzun alan** — doktorun kendi sesiyle kronolojik anlatım
- Her bilgi parçası ayrı satırda
- Zaman referansları: `2-3 YILDIR`, `1 HAFTA ÖNCE`, `TEMMUZ 2020 DE`
- Hastanın ifadelerinin dolaylı aktarımı
- Diğer doktor referansları: `DR ÖNDER REZİDÜ OLDUĞUNU SÖYLEMİŞ`
- Yaşam stili: sıvı alımı, spor, cinsel aktivite detayları
- Urgency bilgisi: `U: +` veya `URGENCY: YOK`
- **Tipik yapı:**
  1. Ana şikayet ve süre
  2. Geçmiş tıbbi öykü (ilgili)
  3. Önceki tedaviler ve sonuçları
  4. Yaşam stili ve alışkanlıklar
  5. Ek bilgiler / dış konsültasyonlar

### 2.3 Tedavi / Öneriler (tedavi, oneriler)
- Satır satır, kısa direktifler
- Tetkik istemleri, ilaç reçeteleri, cerrahi planlar
- **Kalıplar:**
```
TİT + İK İSTENDİ.
UROFLOW + PVR
1 AY SONRA KONTROL
XATRAL 10 MG BAŞLANDI.
SİSTOSKOPİ PLANLANDI.
```

### 2.4 Alışkanlıklar (aliskanliklar)
- **Yapılandırılmış format:** `Anahtar: DEĞER; Anahtar: DEĞER`
- **Sabit yapı:**
```
Alkol: KULLANMIYOR; Sigara: 1X15 PKT
Alkol: HERGÜN 1-2 KADEH; Sigara: 12 YIL; Allerji: ÖZ YOK
Alkol: SOSYAL; Sigara: KULLANMIYOR
Alkol: AYDA 1-2 KERE KULLANIYOR; Sigara: 5 YIL 1/4 PAKET 1.5 YIL TERK
```

### 2.5 Sistem Sorgusu (sistem_sorgu)
- **Yapılandırılmış format:** `Semptom: DEĞER; Semptom: DEĞER`
- Değerler: `YOK`, `VAR`, sayısal (sıklık/şiddet skoru), açıklama
- **Sabit yapı:**
```
Disuri: YOK; Pollakiuri: VAR; Nokturi: 3; Kabizlik: YOK
Disuri: VAR; Pollakiuri: 2; Nokturi: 1; Hematuri: YOK; GenitalAkinti: YOK; Kabizlik: YOK; TasOyku: YOK
```

### 2.6 Fizik Muayene (fizik_muayene)
- USG bulguları sıklıkla dahil edilir
- **Kalıplar:**
```
BİLATERAL TESTİS DOGAL
VX YOK
USG DE SOL 3.2 MM
SAĞ 3.1 MM
REFLÜ YOK.
GÖBEK ÇEVRESİ 130 CM
115 KG
184 CM
```
- Böbrek: `NONPALPABL` veya ölçüm
- Prostat: `GRADE I , BENIGN` veya `GRADE 2 benign`
- EGO: `DOĞAL, SÜNNETLİ`

### 2.7 Operasyon Notu (operasyonlar.notlar)
- **En detaylı alan** — standart cerrahi rapor formatı
- Adım adım prosedür
- Pozisyon → Anestezi → Giriş → Bulgular → İşlem → Kapanış → Komplikasyon
- **Başlangıç kalıbı:** `GENEL ANESTEZİ ALTINDA LİTOTOMİ POZİSYONUNDA UYGUN ALAN ARITIMI VE ÖRTÜMÜ YAPILDI.`
- **Bitiş kalıbı:** `KOMPLİKASYON OLMADI.` veya `HASTA AMELİYATHANEYİ UYANIK TERK ETTİ.`

### 2.8 Takip Notu (notlar.icerik)
- Tip bazlı değişen uzunluk
- **HPV-TAKIP:** Lezyon durumu, yeni lezyon var/yok, kriyoterapi uygulaması
- **KONTROL:** Kısa durum güncellemesi + plan
- **TAKİP:** Semptom güncellemesi + tedavi yönlendirmesi
- **LAZER:** Uygulama notu
- **PSA TAKİBİ:** Tarih-değer tablosu

### 2.9 Telefon Notu (telefon_gorusmeleri.notlar)
- En kısa alan — sonuç odaklı
- Tetkik sonuçları, ilaç değişiklikleri, randevu planları
- **Kalıplar:**
```
PSA WHATSAPP DEN GÖNDERDİ. 7.13 NG/ML SAPTANDI.
TELEFONDA PSA TEKRAR ÖNERİLDİ.
```

### 2.10 Konsültasyon Mektubu (konsultasyon_raporlari.rapor_metni)
- **Formal format** — diğer alanlardan farklı olarak yapılandırılmış
- Hitap: `Sayın [Klinik/Doktor Adı]`
- Hasta tanıtımı: `Hastamız [AD SOYAD] bugün [şikayet] ile başvurdu.`
- Ön tanı: `Hastamıza [ICD kodu - tanı adı] ön tanısı konuldu.`
- Klinik özet
- Talep: `...konusunda tarafınızca değerlendirilmesini rica ederim.`
- Kapanış: `Gösterdiğiniz ilgi için teşekkür ederim.` + İmza

---

## 3. Üroflow Sonuç Formatı

Üroflow (UF) sonuçları tutarlı bir kısa formatta kaydedilir:
```
UF: Qmax // Qavg // Volume cc PVR: X cc
```
Örnekler:
- `UF 26/ 20/ 291 cc`
- `UF: 24//13//263 cc`
- `UF: 14/5.7/199 CC`
- `2.6 // 5 / 44 CC PVR: 80 CC`

---

## 4. Tanı ve ICD Kodu Formatı

- `tani1`: Türkçe tanı adı, ilk harf büyük: `Nörojen mesane`, `Organik kaynaklı impotans`
- `tani1_kodu`: ICD-10 formatı: `N31.9`, `N48.4`, `I86.1`, `A63.0`
- Birden fazla tanı varsa `tani2`, `tani3` vb. alanlar kullanılır
- Post-op tanı genellikle `Aynı` veya `aynı`

---

## 5. Semptom Skoru Formatı

### IPSS (ipss_skor)
- Sayısal değer: `2`, `4`, `7`, `24`

### IIEF-EF (iief_ef_skor)
- Sayısal değer: `29` (0-30 arası)

### Üriner Semptomlar
Yapılandırılmış alanlar (`disuri`, `pollakiuri`, `nokturi` vb.):
- `YOK` veya `0` — semptom yok
- `VAR` — semptom var (skor verilmemiş)
- Sayısal değer (`1`-`5`) — şiddet/sıklık skoru
- Açıklama: `VAR BRİSTOL TİP 4`, `İSHAL`, `SARI`
