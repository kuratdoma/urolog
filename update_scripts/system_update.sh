#!/bin/bash

# =================================================================
# UroLOG Otomatik Güncelleme ve Dağıtım Scripti (Jenerik)
# Dosya Adı: scripts/system_update.sh
# =================================================================

set -e # Herhangi bir hata oluşursa scripti durdur

ACTIVE_USER="${SUDO_USER:-${USER:-$(whoami)}}"
PROJECT_DIR="${PROJECT_DIR:-/home/${ACTIVE_USER}/urolog_code}"
ENV_FILE="${ENV_FILE:-.env}"

# Ortam değişkenlerini .env dosyasından çek (Yedekleme ve Docker için)
ENV_FOUND=false
if [ -f "${PROJECT_DIR}/${ENV_FILE}" ]; then
    set -a
    . "${PROJECT_DIR}/${ENV_FILE}" 2>/dev/null || true
    set +a
    ENV_FOUND=true
fi

# Varsayılan değerler
PROJECT_NAME="${PROJECT_NAME:-urolog}"
# Docker projesi adında geçersiz karakterleri (nokta vb.) temizle
SANITIZED_PROJECT_NAME=$(echo "$PROJECT_NAME" | sed 's/[^a-zA-Z0-9_-]//g' | tr '[:upper:]' '[:lower:]')

CONTAINER_DB_NAME="${CONTAINER_DB_NAME:-${SANITIZED_PROJECT_NAME}_db}"
DB_NAME="${DB_NAME:-urolog}"
DB_USER="${DB_USER:-urologadmin}"
BACKUP_DIR="${BACKUP_DIR:-/home/${ACTIVE_USER}/backup}"
REPO_URL="${REPO_URL:-https://github.com/kuratdoma/urolog}"

# DB Volume Name tespiti ve oluşturulması
if [ -z "$DB_VOLUME_NAME" ]; then
    DETECTED_VOLUME=$(docker volume ls --format "{{.Name}}" | grep -E "(urolog|uro).*db_data" | head -n 1)
    if [ -n "$DETECTED_VOLUME" ]; then
        DB_VOLUME_NAME="$DETECTED_VOLUME"
    else
        DB_VOLUME_NAME="${SANITIZED_PROJECT_NAME}_db_data"
    fi
fi

# Volume mevcut değilse oluştur (docker-compose external: true çökmesini önler)
if ! docker volume ls --format "{{.Name}}" | grep -qx "$DB_VOLUME_NAME"; then
    echo "📦 Docker volume bulunamadı, oluşturuluyor: $DB_VOLUME_NAME"
    docker volume create "$DB_VOLUME_NAME"
fi

echo "==================================================="
echo "🚀 UROLOG SİSTEM GÜNCELLEMESİ BAŞLIYOR"
echo "==================================================="
echo "Tarih        : $(date '+%Y-%m-%d %H:%M:%S')"
echo "Proje Dizini : $PROJECT_DIR"
echo "Veritabanı   : $DB_NAME (User: $DB_USER)"
echo "DB Konteyner : $CONTAINER_DB_NAME"
echo "DB Volume    : $DB_VOLUME_NAME"
echo "Env Dosyası  : $ENV_FILE"
echo "Yedek Dizini : $BACKUP_DIR"
echo "==================================================="
echo ""

# 1. Adım: Veritabanı Yedeği Alma
echo "[1/4] Mevcut veritabanı yedekleniyor..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/urolog_backup_$(date '+%Y-%m-%d_%H-%M-%S').sql"

# Çalışan DB konteynerini bul (eğer tam isim eşleşmezse grep et)
DETECTED_DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "(urolog|uro).*db" | head -n 1)
if [ -n "$DETECTED_DB_CONTAINER" ]; then
    CONTAINER_DB_NAME="$DETECTED_DB_CONTAINER"
fi

if docker ps | grep -q "$CONTAINER_DB_NAME"; then
    echo "DB Konteyneri ($CONTAINER_DB_NAME) üzerinde pg_dump alınıyor..."
    if docker exec "$CONTAINER_DB_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"; then
        echo "✅ Veritabanı yedeği başarıyla alındı: $BACKUP_FILE"
    else
        echo "❌ Hata: Veritabanı dökümü (dump) alınamadı!"
        exit 1
    fi
else
    echo "⚠️ Uyarı: Veritabanı konteyneri ($CONTAINER_DB_NAME) çalışır durumda bulunamadı! Yedek atlanıyor..."
fi

# 2. Adım: GitHub'dan Kodları Çekme (Deploy Key)
echo "[2/4] GitHub'dan güncel kodlar çekiliyor..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"
if [ ! -d ".git" ]; then
    echo "⚠️ Git deposu bulunamadı, init ediliyor..."
    git init
    git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
else
    git remote set-url origin "$REPO_URL" 2>/dev/null || true
fi

echo "Remote güncellemeleri çekiliyor (SSH Deploy Key)..."
if ! git fetch origin; then
    echo "❌ Hata: GitHub erişimi başarısız. Lütfen SSH Deploy Key ve Remote ayarlarını kontrol edin."
    exit 1
fi

echo "Yerel değişiklikler sıfırlanıyor ve origin/main dalına eşitleniyor..."
git reset --hard origin/main

# Statik klasör izinleri
mkdir -p "$PROJECT_DIR/backend/static/documents"
chmod -R 777 "$PROJECT_DIR/backend/static" 2>/dev/null || true

# Port çakışmalarını önleme (Örn: NGINX_HTTP_PORT=3000 ise frontend ile çakışmasın)
if [ "$FRONTEND_PORT_EXTERNAL" = "3000" ] || [ "$FRONTEND_PORT_EXTERNAL" = "$NGINX_HTTP_PORT" ] || [ -z "$FRONTEND_PORT_EXTERNAL" ]; then
    export FRONTEND_PORT_EXTERNAL="3005"
fi

# 3. Adım: Docker Build ve Rolling Update İşlemleri
echo "[3/4] Docker konteynerleri güncelleniyor ve derleniyor..."
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
SSH_AUTH_DIR="${SSH_AUTH_DIR:-${HOME}/.ssh}"
export SSH_AUTH_DIR

# Compose komutunu yapılandır
COMPOSE_ENV_ARG=""
if [ -f "${PROJECT_DIR}/${ENV_FILE}" ]; then
    COMPOSE_ENV_ARG="--env-file ${PROJECT_DIR}/${ENV_FILE}"
elif [ -f "/app/.env" ]; then
    COMPOSE_ENV_ARG="--env-file /app/.env"
fi

COMPOSE_CMD="PROJECT_NAME=${SANITIZED_PROJECT_NAME} DB_VOLUME_NAME=${DB_VOLUME_NAME} FRONTEND_PORT_EXTERNAL=${FRONTEND_PORT_EXTERNAL} SSH_AUTH_DIR=${SSH_AUTH_DIR} GIT_SHA=${GIT_SHA} docker compose ${COMPOSE_ENV_ARG} -p ${SANITIZED_PROJECT_NAME} -f docker-compose.prod.yml"

echo "Yeni frontend ve backend imajları inşa ediliyor (build)..."
eval "$COMPOSE_CMD build frontend backend"

# 4. Adım: Veritabanı Migration ve Servisleri Başlatma
echo "[4/4] Veritabanı başlatılıyor ve migration (Alembic) uygulanıyor..."
eval "$COMPOSE_CMD up -d db redis"

echo "Veritabanının hazır olması bekleniyor (5 saniye)..."
sleep 5

echo "Veritabanı tabloları güncelleniyor (alembic upgrade head)..."
if ! eval "$COMPOSE_CMD run --rm backend alembic upgrade head"; then
    echo "⚠️ Migration sırasında bir uyarı oluştu, işlemlere devam ediliyor..."
fi

echo "Frontend ve Nginx güncellenip başlatılıyor..."
eval "$COMPOSE_CMD up -d --no-deps frontend nginx"

echo "Eski imajlar temizleniyor..."
docker image prune -f 2>/dev/null || true

echo "==================================================="
echo "🎉 GÜNCELLEME BAŞARIYLA TAMAMLANDI!"
echo "Yeni Versiyon (SHA): $GIT_SHA"
echo "Bitiş Tarihi       : $(date '+%Y-%m-%d %H:%M:%S')"
echo "==================================================="
echo "🚀 Backend yeni sürümle yeniden başlatılıyor..."

# Arka planda 2 saniye sonra backend konteynerini devir teslimle yeniden başlat
(sleep 2 && eval "$COMPOSE_CMD up -d --no-deps backend") >/dev/null 2>&1 &
