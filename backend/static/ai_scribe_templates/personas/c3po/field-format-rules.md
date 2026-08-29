# C-3PO Alan Bazlı Format Kuralları

> Her veritabanı tablosu ve alanı için beklenen format, veri tipi ve yazım kuralları.
> Agent JSON çıktısı üretirken bu kurallara uymalıdır.

## 1. muayeneler Tablosu

### Kimlik ve Meta Alanlar
| Alan | Tip | Format | Açıklama |
|------|-----|--------|----------|
| `id` | UUID | Auto-generated | Otomatik üretilir |
| `hasta_id` | UUID | Mevcut hasta ID | Hasta referansı |
| `tarih` | timestamp | `YYYY-MM-DD HH:MM:SS` | Muayene tarihi |
| `doktor` | text | Tam ad | `Tayyar Alp Özkan` veya `Dr. Alp ÖZKAN` |

### Şikayet ve Öykü
| Alan | Format | Max Uzunluk | Kurallar |
|------|--------|-------------|----------|
| `sikayet` | BÜYÜK HARF, serbest metin | 1-3 satır | Ana şikayet + süre. Kısa ve öz. |
| `oyku` | BÜYÜK HARF, serbest metin | 10-50 satır | Kronolojik anamnez. `\n` ile satır ayrımı. En uzun alan. |
| `bulgu_notu` | BÜYÜK HARF, serbest metin | 1-10 satır | Klinik bulgular özeti |

### Tanılar
| Alan | Format | Kurallar |
|------|--------|----------|
| `tani1` | İlk harf büyük | ICD tanı adı Türkçe: `Nörojen mesane` |
| `tani1_kodu` | ICD-10 | Standart format: `N31.9` |
| `tani_kesin` | İlk harf büyük | Kesin tanı varsa |
| `tani2`–`tani5` | İlk harf büyük | Ek tanılar |
| `tani2_kodu`–`tani5_kodu` | ICD-10 | Ek tanı kodları |

### Tedavi ve Plan
| Alan | Format | Kurallar |
|------|--------|----------|
| `tedavi` | BÜYÜK HARF, satır satır | Tetkik istemleri + ilaçlar + cerrahi plan |
| `recete` | Karışık | İlaç adı + doz: `PROFERT M 3X1` |
| `oneriler` | BÜYÜK HARF, satır satır | Tedavi ile benzer, takip planı |
| `sonuc` | Karışık | Kısa sonuç özeti |
| `prosedur` | BÜYÜK HARF | Yapılan prosedür varsa |

### Özgeçmiş ve İlaçlar
| Alan | Format | Kurallar |
|------|--------|----------|
| `ozgecmis` | BÜYÜK HARF, kısa | Geçmiş hastalıklar + operasyonlar listesi. `\n` ile ayrım. |
| `soygecmis` | BÜYÜK HARF, kısa | Aile hastalık öyküsü |
| `kullandigi_ilaclar` | BÜYÜK HARF | İlaç listesi + dozlar. `\n` ile ayrım. |
| `kan_sulandirici` | integer | `0` = Yok, `1` = Var |
| `allerjiler` | text | Alerji varsa belirtilir |

### Yapılandırılmış Alanlar
| Alan | Format | Örnek |
|------|--------|-------|
| `aliskanliklar` | `Anahtar: DEĞER; Anahtar: DEĞER` | `Alkol: KULLANMIYOR; Sigara: 1X15 PKT` |
| `sistem_sorgu` | `Semptom: DEĞER; Semptom: DEĞER` | `Disuri: YOK; Pollakiuri: 2; Nokturi: 1` |

**Alışkanlıklar anahtarları:** `Alkol`, `Sigara`, `Allerji`
**Alışkanlıklar değerleri:**
- Alkol: `KULLANMIYOR`, `SOSYAL`, `AYDA 1-2 KERE KULLANIYOR`, `HERGÜN 1-2 KADEH`
- Sigara: `KULLANMIYOR`, `[miktar] PKT [süre] YIL`, `[süre] TERK`
- Allerji: Madde adı veya `ÖZ YOK`

**Sistem sorgusu anahtarları:** `Disuri`, `Pollakiuri`, `Nokturi`, `Hematuri`, `GenitalAkinti`, `Kabizlik`, `TasOyku`
**Sistem sorgusu değerleri:** `YOK`, `VAR`, sayısal sıklık (`1`-`5`), açıklama

### Fizik Muayene
| Alan | Format | Değer Örnekleri |
|------|--------|-----------------|
| `fizik_muayene` | Serbest metin | USG bulguları, palpasyon, ölçümler |
| `erektil_islev` | Kısa ifade | `YOK`, `VAR`, `HAFİF ED`, `ERKEN DE-TÜMESANS` |
| `ejakulasyon` | Kısa ifade | `NORMAL`, `KISALMIŞ`, `PREMATÜR` |
| `mshq` | Serbest | MSHQ skoru |
| `ipss_skor` | Sayısal | `0`-`35` |
| `iief_ef_skor` | Sayısal | `0`-`30` |

### Vital ve FM Bulguları
| Alan | Format | Değer Örnekleri |
|------|--------|-----------------|
| `tansiyon` | text | `- / -` veya `120/80` |
| `ates` | text | `YOK` veya derece |
| `kvah` | text | Kalp vuruş sayısı |
| `bobrek_sag` | text | `NONPALPABL`, ölçüm |
| `bobrek_sol` | text | `NONPALPABL`, ölçüm |
| `suprapubik_kitle` | text | `YOK`, varsa açıklama |
| `ego` | text | `DOĞAL, SÜNNETLİ` |
| `rektal_tuse` | text | `GRADE I , BENIGN`, `GRADE 2 benign` |

### Üriner Semptom Alanları
| Alan | Format | Değerler |
|------|--------|----------|
| `disuri` | text | `YOK`, `VAR`, skor (`1`-`5`) |
| `pollakiuri` | text | `YOK`, `VAR`, sıklık sayısı |
| `nokturi` | text | `YOK`, sayı (`1`-`5`) |
| `hematuri` | text | `YOK`, `VAR` |
| `genital_akinti` | text | `YOK`, renk (`SARI`) |
| `kabizlik` | text | `YOK`, `VAR`, `VAR BRİSTOL TİP 4`, `İSHAL` |
| `tas_oyku` | text | `YOK`, `VAR` |
| `catallanma` | text | `YOK`, `VAR` |
| `projeksiyon_azalma` | text | `YOK`, `VAR`, skor |
| `kalibre_incelme` | text | `YOK`, `VAR` |
| `idrar_bas_zorluk` | text | `YOK`, `VAR`, skor |
| `kesik_idrar_yapma` | text | `YOK`, `VAR`, skor |
| `terminal_damlama` | text | `YOK`, `VAR`, skor |
| `residiv_hissi` | text | `YOK`, `VAR`, skor |
| `inkontinans` | text | `YOK`, `VAR`, skor |

---

## 2. operasyonlar Tablosu

| Alan | Format | Kurallar |
|------|--------|----------|
| `ameliyat` | BÜYÜK HARF | Ameliyat adı: `TUR-MT`, `VARİKOSELEKTOMİ (BİLATERAL)` |
| `pre_op_tani` | Karışık | Ön tanı: `BPH`, `Mesane Tm`, `Varikosel` |
| `post_op_tani` | Karışık | Genellikle `Aynı` veya `aynı` |
| `ekip` | Karışık | Cerrah adları: `TAYYAR ALP ÖZKAN`, `Alp Özkan, Zehra` |
| `hemsire` | Karışık | Hemşire adı: `CENGİZ KÖRFEZ MARMARA` |
| `anestezi_ekip` | Karışık | Anestezi ekibi adı |
| `anestezi_tur` | Karışık | `GENEL`, `SPİNAL`, `LOKAL`, `Lokal`, `Genel` |
| `notlar` | Karışık | **Detaylı cerrahi prosedür notu.** Standart format. |
| `patoloji` | Karışık | Patoloji raporu formatı |
| `post_op` | Karışık | Post-op takip notları |
| `hastane_id` | text | Hastane adı: `Körfez Marmara`, `Urotıp`, `Academic Hospital` |
| `asa_skoru` | text | ASA skoru |
| `anestezi_sekli` | text | Anestezi şekli |

---

## 3. notlar Tablosu

| Alan | Format | Kurallar |
|------|--------|----------|
| `tip` | text | Not kategorisi — sabit set |
| `icerik` | Serbest metin | İçerik tipi `tip`'e göre değişir |
| `sembol` | text | `Normal`, `null` |

### Geçerli `tip` Değerleri
`HPV-TAKIP`, `KONTROL`, `TAKİP`, `LAZER`, `LİPUS`, `PSA TAKİBİ`, `GÖRÜŞME`

---

## 4. telefon_gorusmeleri Tablosu

| Alan | Format | Kurallar |
|------|--------|----------|
| `notlar` | BÜYÜK HARF veya karışık | Kısa, sonuç odaklı. Tetkik sonuçları, ilaç değişiklikleri. |
| `doktor` | text | `Dr. Alp ÖZKAN` veya `Tayyar Alp Özkan` |

---

## 5. konsultasyon_raporlari Tablosu

| Alan | Format | Kurallar |
|------|--------|----------|
| `hitap_klinisyen` | text | Hitap edilen klinik/doktor adı |
| `ozgecmis` | Serbest metin | Özgeçmiş özeti |
| `tani` | text | ICD kodu + tanı adı |
| `ilaclar` | text | Mevcut ilaç listesi |
| `sikayet` | text | Başvuru şikayeti |
| `oyku` | text | Klinik öykü |
| `talep` | text | Konsültasyon talebi |
| `doktor` | text | `Dr. Alp ÖZKAN` |
| `rapor_metni` | **Yapılandırılmış formal metin** | Konsültasyon mektubu tam metni |

---

## 6. JSON Çıktı Şeması

Agent'ın ürettiği JSON, ilgili tablonun alanlarına birebir karşılık gelir. Boş/bilinmeyen alanlar `null` olarak verilir.

### Muayene JSON Şeması
```json
{
  "sikayet": "string | null",
  "oyku": "string | null",
  "bulgu_notu": "string | null",
  "tani1": "string | null",
  "tani1_kodu": "string | null",
  "tani_kesin": "string | null",
  "tedavi": "string | null",
  "doktor": "string",
  "recete": "string | null",
  "ozgecmis": "string | null",
  "soygecmis": "string | null",
  "kullandigi_ilaclar": "string | null",
  "kan_sulandirici": "0 | 1",
  "aliskanliklar": "string | null",
  "sistem_sorgu": "string | null",
  "ipss_skor": "string | null",
  "iief_ef_skor": "string | null",
  "fizik_muayene": "string | null",
  "erektil_islev": "string | null",
  "ejakulasyon": "string | null",
  "prosedur": "string | null",
  "allerjiler": "string | null",
  "tani2": "string | null",
  "tani2_kodu": "string | null",
  "oneriler": "string | null",
  "sonuc": "string | null",
  "tansiyon": "string | null",
  "ates": "string | null",
  "bobrek_sag": "string | null",
  "bobrek_sol": "string | null",
  "suprapubik_kitle": "string | null",
  "ego": "string | null",
  "rektal_tuse": "string | null",
  "disuri": "string | null",
  "pollakiuri": "string | null",
  "nokturi": "string | null",
  "hematuri": "string | null",
  "genital_akinti": "string | null",
  "kabizlik": "string | null",
  "tas_oyku": "string | null",
  "catallanma": "string | null",
  "projeksiyon_azalma": "string | null",
  "kalibre_incelme": "string | null",
  "idrar_bas_zorluk": "string | null",
  "kesik_idrar_yapma": "string | null",
  "terminal_damlama": "string | null",
  "residiv_hissi": "string | null",
  "inkontinans": "string | null"
}
```

### Takip Notu JSON Şeması
```json
{
  "tip": "string",
  "icerik": "string",
  "sembol": "string | null"
}
```

### Telefon Görüşmesi JSON Şeması
```json
{
  "notlar": "string",
  "doktor": "string"
}
```
