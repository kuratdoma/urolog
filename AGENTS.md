# AGENTS.md — UroLOG

Bu dosya, depoda çalışan **yapay zekâ ajanları** içindir. Oturum bağlamı için önce
`PROJECT-CONTEXT.md` (kısa özet), ayrıntı için `docs/` okunur. İnsan kurulum rehberi
`README.md` ve `DEPLOYMENT_SETUP.md`'dedir.

> **Bu bir sağlık kaydı sistemidir.** Hasta verisine (PHI) dokunan her değişiklik RBAC,
> audit ve KVKK kapsamındadır. Emin olmadığın klinik davranışı **tahmin etme** — kodu oku
> ya da sor. Yanlış bir tanı satırı, çalışmayan bir düğmeden daha pahalıdır.

---

## 1. Sistem ne yapıyor

**UroLOG** — üroloji kliniği için EMR. Hasta kaydı, randevu, muayene, laboratuvar,
görüntüleme, operasyon, takip, finans, stok, doküman ve raporlama tek uygulamada.
Eski DBISAM sisteminden veri göçü sürüyor (`03.db_import/`).

İki istemcisi var:
- **Web** — `frontend/` (Next.js App Router), birincil yüzey.
- **UroDroid** — ayrı depodaki Android istemcisi (`kuratdoma/urodroid`). Aynı REST
  uçlarını tüketir. Ona özel sunucu davranışı için → bölüm 8.

---

## 2. Depo haritası

```
backend/      FastAPI + SQLAlchemy(async) + Alembic + PostgreSQL + Redis + Celery
frontend/     Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Query + Zustand
nginx/        Reverse proxy yapılandırmaları (conf.d/ altında ortam başına .conf)
docs/         Mimari, dağıtım, ADR'ler, güvenlik denetimi
03.db_import/ Eski DBISAM göç betikleri
update_scripts/, scripts/   Sunucu güncelleme ve bakım betikleri
```

### Backend katmanları

```
app/models/        SQLAlchemy ORM (DB şeması burada tanımlanır)
app/schemas/       Pydantic — istek/yanıt sözleşmeleri
app/repositories/  Sorgular (patient/, clinical/, finance/, analytics/ alt paketleri)
app/services/      İş kuralları (auth, audit, ai_scribe, email, google_calendar …)
app/api/v1/endpoints/   HTTP uçları; clinical/ alt paketi muayene-operasyon-medya-rapor
app/core/          config, security, permissions, audit, download_tokens, pii_scrubber, limiter
app/api/deps.py    Kimlik + yetki bağımlılıkları (get_current_user, require_role, require_permission)
```

`app/controllers/` yalnızca `legacy_adapters` içerir — yeni kod buraya yazılmaz.
Yeni bir uç yazarken zincir: **model → schema → repository → service → endpoint.**

---

## 3. Çalıştırma ve komutlar

Geliştirme **Docker** ile yapılır; `backend/` altında sanal ortam (venv) **yoktur**.

```bash
./start.sh              # backend (docker: db + redis + backend) + frontend (host'ta next dev)
./start.sh -b           # imajları yeniden derleyerek

# Frontend: http://localhost:3000     Backend API dokümanı: http://localhost:8000/docs
```

| İş | Komut |
|---|---|
| Backend testleri | `cd backend && pytest tests/ app/tests/ -q` |
| Frontend testleri | `cd frontend && npm run test -- --run` |
| Tip kontrolü | `cd frontend && npx tsc --noEmit` |
| Lint (yalnız değişen dosyalar) | `cd frontend && npx eslint <dosyalar>` |
| Migration üret | `docker compose exec backend alembic revision --autogenerate -m "…"` |
| Migration uygula | `docker compose exec backend alembic upgrade head` |
| Frontend tipleri üret | `cd frontend && npm run generate-types` |

**İki test kökü BİRLİKTE koşulur** (`tests/` ve `app/tests/`). CI bunu bilerek yapıyor:
paylaşılan uygulama durumu (rate-limit sayaçları, dependency override'ları) yüzünden ayrı
ayrı geçip birlikte düşen testler var — bkz. `backend/conftest.py` ve
`.github/workflows/ci.yml`.

**`npm run lint` bilinçli olarak zorunlu değil:** frontend'de ~600 birikmiş ESLint
sorunu var (2026-09-02 ölçümü). Bunun ~425'i `@typescript-eslint/no-explicit-any`,
~100'ü React hook kuralları — ikisi de mekanik düzeltmeye uygun değil (`strict: false`
altında tip yazmak ayrı iş; hook kurallarını mekanik düzeltmek çalışma zamanı davranışını
değiştirir). CI yalnızca **değişen** dosyalara eslint koşar; yeni borç ekleme.

**Backend lint borcu yoktur:** `cd backend && python -m flake8 app/` **0** vermelidir.
Bu sıfırlandı; kırmızıya dönerse eklenen satır temizlenmeden birleştirilmemeli.

**`npm run generate-types` çalışan bir backend konteyneri ister** (içeride
`scripts/generate_ts.py` çalıştırır). `frontend/types/api-models.ts` **elle düzenlenmez.**

---

## 4. Değiştirilemez kurallar

1. **Yetki her uçta açıkça verilir.** 316 uçtan 292'si kapılıdır; kapısız kalan 24 uç
   bilinçlidir (`auth` public/self-scoped uçları, `setup` bootstrap'ı, `personal_notes`
   satır bazlı yetkilendirmesi). Yeni uç eklerken kapıyı da ekle — `app/api/deps.py`:
   - `require_role(*roles)` — kaba rol kapısı,
   - `require_permission(module, action)` — `app/core/permissions.py` içindeki
     `PERMISSION_MATRIX`'e bakan CRUD kapısı. Modül adları (`patients`, `clinical`,
     `operations`, `imaging`, …) frontend ve Android tarafında da aynen kullanılıyor;
     yeniden adlandırma üç depoyu birden kırar.
   - **401 ≠ 403:** geçersiz/süresi dolmuş token `validate_token` içinde **401** döner;
     **403 yalnızca RBAC kapılarından** gelir. İstemciler bu ayrıma göre davranıyor
     (401 → token yenile, 403 → kullanıcıya "yetkiniz yok"). Bu ayrımı bozma.
2. **Audit log değiştirilemez.** `AuditLog` kayıtları SQLAlchemy event'leriyle
   UPDATE/DELETE'e karşı korunur. Yeni bir silme akışı audit izini bozmamalı; PHI'ye
   dokunan uçlar `app/core/audit.py` içindeki `@audited(...)` ile işaretlenir.
3. **Model değişikliği = Alembic migration.** `app/models/` altında alan eklediysen
   migration üret ve uygula. Sürüm dosyaları `pNNN_…` kalıbıyla adlandırılıyor.
4. **Zaman UTC saklanır** (Celery dahil). Sunucu saat dilimi yalnızca gösterim ve
   hesaplama katmanında uygulanır.
5. **Log'a ve hata mesajına PHI sızmaz.** `app/core/pii_scrubber.py` bunun içindir;
   yeni log satırlarında hasta adı/TC/telefon geçirme.
6. **Sır (secret) commit edilmez.** `app/core/secret_gate.py` ve `.env` ayrımına uy.

---

## 5. Tuzaklar (kod okunarak doğrulandı — tahmin değil)

- **Bazı liste uçlarında `response_model` YOK.** Örnek: `GET /api/v1/patients`
  (`app/api/v1/endpoints/patients.py:326`) şema ile korunmuyor; `GET /patients/{id}` ise
  `PatientLegacyResponse` kullanıyor. Yani alan tipleri sözleşmeyle garanti değil: `id`,
  `protokol_no`, `tc_kimlik`, `cep_tel` string de sayı da dönebilir. İstemciler bunu
  esnek çözümleyicilerle tolere ediyor. Yeni uç yazıyorsan `response_model` KOY; var olan
  uçtan tip garantisi VARSAYMA.
- **Alan adları Türkçe.** Uçlar `muayeneler`, `takip`, `operasyonlar`, `imagings`, `labs`
  karışımıdır (ör. `/api/v1/clinical/muayeneler/{id}`,
  `/api/v1/clinical/patients/{id}/imagings`). İngilizceye çevirme dürtüsüne direnç göster;
  üç istemci bu adlara bağlı.
- **`"Seçiniz..."` bir veri değil, boş sentinel'idir.** Hiçbir çıktıda gösterilmez.
- **IPSS sütunları sayısal puandır** (`pollakiuri`, `nokturi`, `residiv_hissi`,
  `kesik_idrar_yapma`, `projeksiyon_azalma`, `idrar_bas_zorluk`, `urgency` → 0-5). Aynı
  belirtinin "Var/Yok" metni `sistem_sorgu` JSON'undaki `*_text` / `*_sq` anahtarlarındadır.
  Karıştırılırsa "Pollaküri 3" gibi anlamsız bir belirti satırı çıkar.
- **Dosya indirme iki aşamalıdır:** önce kısa ömürlü indirme jetonu
  (`app/core/download_tokens.py`, Redis'te tutulur), sonra `?dt=<token>` ile indirme.
  Bazı medya uçları kimliği **sorgu parametresindeki** token'dan doğrular,
  `Authorization` başlığını okumaz.
- **PDF üretimi tarayıcıda.** 19 print rotasının 18'i `@react-pdf/renderer` ile istemcide
  PDF çiziyor (`frontend/components/pdf/*PDF.tsx`). Backend PDF üretmiyor —
  tek istisna bölüm 8.
- **Refresh token rotasyonu tek kullanımlıktır.** Eşzamanlı iki `/auth/refresh` çağrısı
  replay tespiti tetikleyip kullanıcının TÜM oturumunu iptal ettirebilir; frontend bunu
  `lib/api/client.ts` içindeki modül seviyesi tek uçuş promise'iyle engelliyor. Bu deseni
  bozma.

---

## 6. Frontend notları

- **Next.js sürümü eğitim verinden yeni olabilir.** `frontend/AGENTS.md` bunu söylüyor:
  API yazmadan önce `node_modules/next/dist/docs/` altındaki ilgili rehberi oku.
- Bileşenler domain klasörlerinde (`components/<domain>/`), PDF belgeleri
  `components/pdf/`, API sarmalayıcıları `lib/api/<domain>.ts`.
- `tsconfig.json`'da **`strict: false`**. Ayrık birleşim (discriminated union) daralması
  beklediğin gibi çalışmaz; iyimser tip daraltmasına güvenme, alanları açıkça kontrol et.
- Testler `vitest` + happy-dom; `vitest.config.ts` include deseni yalnızca
  `components/`, `lib/`, `hooks/` altını kapsar. Başka yere yazılan test **koşulmaz**.
- E2E: Playwright (`tests/e2e/`).

---

## 7. Dağıtım

- Üretim: `docker-compose.prod.yml` — `db`, `redis`, `backend`, `frontend`, `nginx`.
  Frontend `output: 'standalone'` ile derlenir; `public/` imaja kopyalanır, çalışma
  dizini `/app`.
- **nginx yönlendirmesi kritik:** `location /api` → `backend:8000`, `location /` →
  `frontend:3000` (`nginx/conf.d/` altındaki her .conf). Yani **`/api/...` altına
  yazılan bir Next.js route handler'a dışarıdan ulaşılamaz** — frontend'te uç açacaksan
  `/api` dışında bir yol seç.
- Ayarlar `app/core/config.py` (pydantic Settings) üzerinden `.env`'den okunur:
  `SECRET_KEY`, `REFRESH_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES` (420 dk),
  `REFRESH_TOKEN_EXPIRE_DAYS` (7), DB/Redis/SMTP, `AI_SCRIBE_*`, Google OAuth.

---

## 8. Android istemcisine (UroDroid) özel yüzey

- Uygulama tüm isteklere **`X-UroDroid: <sürüm>`** başlığı ekler.
- **`GET /mobile-print/examination/{id}`** — muayene formunu **sunucuda** PDF'e basan tek
  uç (`frontend/app/mobile-print/examination/[id]/route.ts`). Web'in aksine PDF Node'da
  üretilir; telefonun react-pdf'i indirip cihazda çizmesi 2 GB RAM'li hedef cihazlarda
  kabul edilemezdi.
  - Üç kapı: `MOBILE_PDF_ENABLED != true` → 404; `X-UroDroid` yok → 404; token yok → 401.
  - **Uçta RBAC kararı verilmez:** çağıranın token'ı backend'e aynen iletilir, 401/403
    olduğu gibi aktarılır.
  - Türev veri hesabı web print sayfasıyla **ortak** modüldedir
    (`frontend/lib/pdf/examination-print-data.ts`). Oradaki mantığı kopyalama —
    kopyalarsan hasta iki farklı rapor alır.
  - Ayrıntı: UroDroid deposundaki `PRINT_README.md`.

---

## 9. "Bitti" ne demek

Bir iş ancak şu koşullarda tamamlanmış sayılır:

1. Model değişikliği varsa Alembic migration üretilmiş **ve uygulanmış**,
2. `pytest tests/ app/tests/ -q` ve `npm run test -- --run` yeşil, **yeni davranış için
   test yazılmış**,
3. `npx tsc --noEmit` temiz; değişen dosyalarda yeni ESLint hatası yok,
4. Hasta verisine dokunuyorsa **RBAC kapısı ve audit kaydı** yerinde,
5. Değişiklik bu dosya ve `docs/` ile çelişmiyor; çelişiyorsa doküman da güncellenmiş.

---

## 10. Ajan davranış kuralları

- **Önce oku, sonra yaz.** Bir uç eklerken benzer bir ucun tamamını oku; bu depoda kalıp
  tutarlılığı tip güvenliğinden daha koruyucu.
- **Sessiz başarısızlık yok.** Yardımcı bir kaynak düşerse ekranı boş bırakma; ne
  eksildiğini söyle. Klinik ekranda "veri yok" ile "veri gelmedi" farklı şeylerdir.
- **Uydurma değer üretme.** Ayrıştırılamayan tarih `null`/`—` olarak gösterilir; tahmini
  tarih basılmaz.
- **Yıkıcı işlem yapma.** Migration geri alma, veri silme, `docker compose down -v`,
  üretim `.env` düzenleme — kullanıcı açıkça istemeden yapılmaz.
- **Bilmediğini söyle.** Doğrulamadığın bir davranışı doğrulanmış gibi raporlama; hangi
  komutu koşup ne gördüğünü yaz.
