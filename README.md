# UroLOG — Üroloji Klinik EMR & Bilgi Sistemi

Modern, güvenli ve hızlı klinik elektronik sağlık kaydı (EMR) yönetim sistemi.

- **Frontend:** Next.js, React, Tailwind CSS, TypeScript
- **Backend:** FastAPI (Python), PostgreSQL, Redis, Alembic
- **Depo:** [https://github.com/kuratdoma/urolog](https://github.com/kuratdoma/urolog)

---

## Hızlı Başlangıç (Geliştirme Ortamı)

Lokal ortamda geliştirme başlatıcı betiğini çalıştırabilirsiniz:

```bash
./start.sh
```

Frontend: `http://localhost:3000`  
Backend API Dokümantasyonu: `http://localhost:8000/docs`

---

## Sunucu Kurulumu ve Dağıtım (Production Deploy)

Sunucu tarafında ilk kurulum ve dağıtım standartları:

- **Proje Dizini:** `/home/<user>/urolog_code`
- **Yedek Dizini:** `/home/<user>/backup`
- **Proje Adı:** `urolog`

Detaylı rehberler:
- [Sunucu Kurulum ve Deploy Rehberi (DEPLOYMENT_SETUP.md)](./DEPLOYMENT_SETUP.md)
- [Dağıtım Kılavuzu (docs/deployment-guide.md)](./docs/deployment-guide.md)
- [Güncelleme Scriptleri (update_scripts/)](./update_scripts/)
