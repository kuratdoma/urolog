# PROJECT-CONTEXT.md

Bu dosya, AI ajanlarının ve yeni ekip üyelerinin oturuma aynı temel bağlamla
başlaması için tutulur. Kısa ve güncel kalmalıdır — detay için `AGENTS.md`,
`README.md` ve `docs/` klasörüne bakın.

## Proje Adı ve Amacı

**UroLOG** — üroloji kliniği için elektronik sağlık kaydı (EMR) ve klinik bilgi
yönetim sistemi. Hasta kaydı, randevu, muayene, laboratuvar, finans, stok ve
doküman yönetimini tek uygulamada toplar. Eski DBISAM tabanlı sistemden veri
göçü yapılmaktadır (`03.db_import/`).

## Teknoloji Yığını

**Backend:** FastAPI (Python) · SQLAlchemy · Alembic · PostgreSQL · Redis ·
Celery (worker mevcut, beat scheduler henüz tanımlı değil)
Katmanlı yapı: `app/models` → `app/schemas` → `app/repositories` →
`app/services` → `app/controllers` → `app/api/v1/endpoints`

**Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui +
Radix · TanStack Query · Zustand (`stores/`) · sonner (toast) · date-fns
Bileşenler domain klasörlerine ayrılmıştır (`components/<domain>/`).

**Dağıtım:** Docker / docker-compose, nginx reverse proxy.
Yerel geliştirme: `./start.sh` → frontend `:3000`, backend `:8000/docs`.

## Mevcut Faz

Aktif geliştirme. Var olan domainler: hastalar, randevular, muayene, lab,
finans, stok, dokümanlar, raporlar, audit, RBAC/auth (OAuth dahil).
Halihazırda **bildirim altyapısı ve websocket katmanı yoktur.**

## Kilit Kısıtlar

- **Sağlık verisi:** PHI/KVKK duyarlılığı. Hasta verisine dokunan her yüzey
  RBAC ve audit kapsamındadır.
- **Audit log değiştirilemez:** `AuditLog` kayıtları SQLAlchemy event'leriyle
  UPDATE/DELETE'e karşı korunur. Silme işlemleri audit izini bozmamalıdır.
- **Model değişikliği = Alembic migration.** `backend/app/models` altında
  değişiklik yapıldığında migration üretilip uygulanmalıdır.
- **Zaman:** DB'de UTC saklanır (Celery de UTC). Kullanıcıya gösterim ve
  hesaplama katmanında sunucu saat dilimi uygulanır.
- **CI:** PR diff'i üzerinde lint gate'leri çalışır; backend `pytest`,
  frontend `vitest` (happy-dom) ve Playwright E2E suite'leri mevcuttur.
- **Tip üretimi:** Backend şemalarından frontend tipleri
  `npm run generate-types` ile üretilir — elle düzenlenmez.

## "Bitti" Ne Demek

Bir iş ancak şu koşullarda tamamlanmış sayılır:
1. Model değişikliği varsa Alembic migration üretilmiş ve uygulanmış,
2. Backend `pytest` ve frontend `vitest` yeşil, yeni davranış için test yazılmış,
3. `npm run lint` ve TypeScript tip kontrolü temiz,
4. Hasta verisine dokunuyorsa RBAC kontrolü ve audit kaydı mevcut,
5. Değişiklik `AGENTS.md`/`docs/` ile çelişmiyor, gerekiyorsa dokümante edilmiş.
