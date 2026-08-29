# UroLOG Deployment & Initial Setup Guide

Bu kılavuz, UroLOG sisteminin Debian/Ubuntu tabanlı sunucularda (Hetzner, ofis sunucusu, Acemagic vb.) sıfırdan ilk kurulumunu (initial deploy) ve güncellemelerini açıklar.

## Altyapı ve Standartlar

- **Hedef Repo:** `https://github.com/kuratdoma/urolog`
- **Proje Adı (`PROJECT_NAME`):** `urolog`
- **Proje Dizini (`PROJECT_DIR`):** `/home/<aktif_kullanici>/urolog_code`
- **Yedek Dizini (`BACKUP_DIR`):** `/home/<aktif_kullanici>/backup`
- **Container Runtime:** Docker Engine + Docker Compose (v2)
- **Veritabanı:** PostgreSQL 15 (Container: `urolog_db`, Volume: `urolog_db_data`)

---

## 1. İlk Kurulum Adımları (Initial Deploy)

### Adım 1: Sunucu Gereksinimleri
Sunucuda Docker ve Docker Compose yüklü olmalıdır:
```bash
# Docker ve Compose kurulumu (Debian/Ubuntu)
sudo apt update && sudo apt install -y git curl docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### Adım 2: Kod Deposunu Klonlama
Proje dizini aktif kullanıcının altında `urolog_code` olarak konumlandırılır:
```bash
cd ~
git clone https://github.com/kuratdoma/urolog.git /home/$USER/urolog_code
cd /home/$USER/urolog_code
```

### Adım 3: Ortam Değişkenleri (.env)
Örnek yapılandırma dosyasını kopyalayın ve klinik/sunucu bilgilerinize göre düzenleyin:
```bash
cp backend/.env.example .env
nano .env
```

Önemli `.env` değişkenleri:
```env
PROJECT_NAME=urolog
ENVIRONMENT=production
DB_USER=emr_admin
DB_PASSWORD=GuvendiParolaniz_123!
DB_NAME=urolog
GITHUB_REPO=kuratdoma/urolog
BACKEND_PORT_EXTERNAL=8000
FRONTEND_PORT_EXTERNAL=3005
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

### Adım 4: Docker Volume ve İlk Başlatma
```bash
# Harici volume oluşturulması (veri kaybını önlemek için external volume)
docker volume create urolog_db_data

# Servisleri derleyip başlatma
docker compose -f docker-compose.prod.yml up -d --build

# Veritabanı tablolarını migrate etme (Alembic)
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# İlk yönetici kullanıcısını oluşturma (Seed)
docker compose -f docker-compose.prod.yml run --rm backend python scripts/master_seed.py
```

---

## 2. Güncelleme ve Dağıtım (Update & Deploy)

Her sunucu tipi için `update_scripts/` altında optimize edilmiş güncelleme betikleri mevcuttur:

- **Genel / Tüm Sunucular:** `bash update_scripts/main_system_update.sh`
- **Acemagic Sunucusu:** `bash update_scripts/github_update_acemagic.sh`
- **Hetzner Sunucusu:** `bash update_scripts/github_update_hetzner.sh`
- **Ofis Sunucusu:** `bash update_scripts/github_update_ofis.sh`

Bu scriptler:
1. `/home/<aktif_kullanici>/backup` altına PostgreSQL yedeği alır.
2. `https://github.com/kuratdoma/urolog` reposundan güncel kodları çeker.
3. Docker servislerini yeniden derleyip rolling update ile devreye alır.
4. Alembic migration'larını otomatik çalıştırır.

---

## 3. Sorun Giderme (Troubleshooting)

- **Log Takibi:** `docker compose -f docker-compose.prod.yml logs -f backend`
- **Veritabanı Erişimi:** `docker exec -it urolog_db psql -U emr_admin -d urolog`
- **Konteyner Durumu:** `docker ps --filter "name=urolog"`
