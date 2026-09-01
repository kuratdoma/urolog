
#!/bin/bash

# =================================================================
# UroLOG Ofis Sunucusu GitHub Güncelleme ve Dağıtım Scripti
# Dosya Adı: /home/alp/scripts/github.update
# =================================================================

set -e

SERVER_LABEL="Ofis Sunucusu"
PROJECT_DIR="/home/alp/urolog_code"
BACKUP_DIR="/home/alp/backup/files"
PROJECT_NAME="urolog"
ENV_FILE=".env"
REPO_URL="https://github.com/kuratdoma/urolog"

# Docker proje adında geçersiz karakterleri temizle
SANITIZED_PROJECT_NAME=$(echo "$PROJECT_NAME" | sed 's/[^a-zA-Z0-9_-]//g' | tr '[:upper:]' '[:lower:]')

# Ortam değişkenlerini .env dosyasından yükle
ENV_FOUND=false
if [ -f "${PROJECT_DIR}/${ENV_FILE}" ]; then
    set -a
    . "${PROJECT_DIR}/${ENV_FILE}" 2>/dev/null || true
    set +a
    ENV_FOUND=true
fi

DB_NAME="${DB_NAME:-urolog}"
DB_USER="${DB_USER:-urologadmin}"

# Çalışan DB konteynerini bul
CONTAINER_DB_NAME=$(docker ps --format "{{.Names}}" | grep -w "urolog_db" | head -n 1)
if [ -z "$CONTAINER_DB_NAME" ]; then
    CONTAINER_DB_NAME=$(docker ps --format "{{.Names}}" | grep -E "(urolog|uro).*db" | head -n 1 || true)
fi
if [ -z "$CONTAINER_DB_NAME" ]; then
    CONTAINER_DB_NAME="${SANITIZED_PROJECT_NAME}_db"
fi

# DB volume tespiti
if [ -z "${DB_VOLUME_NAME:-}" ]; then
    DETECTED_VOLUME=$(docker volume ls --format "{{.Name}}" | grep -E "(urolog|uro).*db_data" | head -n 1 || true)
    if [ -n "$DETECTED_VOLUME" ]; then
        DB_VOLUME_NAME="$DETECTED_VOLUME"
    else
        DB_VOLUME_NAME="${SANITIZED_PROJECT_NAME}_db_data"
    fi
fi

echo "==================================================="
echo "🚀 UroLOG GITHUB GÜNCELLEME SİSTEMİ (${SERVER_LABEL})"
echo "==================================================="

# 0. Adım: Durum Kontrolü
echo "[*] Sistem durumu analiz ediliyor..."

DIR_EXISTS="❌ YOK"
[ -d "$PROJECT_DIR" ] && DIR_EXISTS="✅ VAR" || true

WRITABLE="❌ HAYIR"
[ -w "$PROJECT_DIR" ] && WRITABLE="✅ EVET" || true

IS_GIT="❌ HAYIR"
[ -d "$PROJECT_DIR/.git" ] && IS_GIT="✅ EVET" || true

CURRENT_REMOTE="Bulunamadı"
if [ "$IS_GIT" = "✅ EVET" ]; then
    CURRENT_REMOTE=$(cd "$PROJECT_DIR" && git remote get-url origin 2>/dev/null || echo "Hata")
fi

echo ""
echo "---------------------------------------------------"
echo "🔍 MEVCUT DURUM ÖZETİ"
echo "---------------------------------------------------"
echo "Sunucu        : $SERVER_LABEL"
echo "Proje Dizini  : $PROJECT_DIR ($DIR_EXISTS)"
echo "Yazma İzni    : $WRITABLE"
echo "Git Deposu    : $IS_GIT"
echo "Git Remote    : $CURRENT_REMOTE"
echo "Hedef Repo    : $REPO_URL"
echo "Env Dosyası   : $ENV_FILE ($( [ "$ENV_FOUND" = true ] && echo "✅ YÜKLENDİ" || echo "⚠️ BULUNAMADI" ))"
echo "Veritabanı    : $DB_NAME (User: $DB_USER)"
echo "Konteyner     : $CONTAINER_DB_NAME"
echo "DB Volume     : $DB_VOLUME_NAME"
echo "Yedek Dizini  : $BACKUP_DIR"
echo "---------------------------------------------------"
echo ""

# 1. Adım: Veritabanı Yedeği
echo "[1/4] Mevcut veritabanı yedekleniyor..."
mkdir -p "$BACKUP_DIR"
BACKUP_TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
SQL_FILENAME="${SANITIZED_PROJECT_NAME}_yedek_${BACKUP_TIMESTAMP}.sql"
BACKUP_FILENAME="${SANITIZED_PROJECT_NAME}_yedek_${BACKUP_TIMESTAMP}.tar.gz"
TEMP_SQL="${BACKUP_DIR}/${SQL_FILENAME}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILENAME}"

if docker ps | grep -q "$CONTAINER_DB_NAME"; then
    if docker exec "$CONTAINER_DB_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$TEMP_SQL"; then
        tar -czf "$BACKUP_FILE" -C "$BACKUP_DIR" "$SQL_FILENAME"
        rm -f "$TEMP_SQL"
        echo "✅ Veritabanı yedeği alındı (tar.gz): $BACKUP_FILE"
    else
        rm -f "$TEMP_SQL"
        echo "❌ Hata: Veritabanı dökümü (dump) alınamadı!"
        exit 1
    fi
else
    echo "⚠️ Uyarı: Veritabanı konteyneri ($CONTAINER_DB_NAME) çalışmıyor, yedek atlanıyor."
fi

# 2. Adım: Github'dan Kodları Çekme
echo "[2/4] Github'dan güncel kodlar çekiliyor..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

if [ ! -d ".git" ]; then
    echo "⚠️ Git deposu bulunamadı, yeniden yapılandırılıyor..."
    git init
    git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
else
    git remote set-url origin "$REPO_URL" 2>/dev/null || true
fi

if ! git fetch origin; then
    echo "❌ Hata: Github erişimi başarısız."
    exit 1
fi

echo "Yerel değişiklikler temizleniyor ve 'main' dalına eşitleniyor..."
git reset --hard origin/main

# Statik ve SSL klasör izinleri
echo "Dosya izinleri ve klasörler ayarlanıyor..."
mkdir -p "$PROJECT_DIR/backend/static/"{documents,photos,imaging,ai_scribe_templates,recordings}
chmod -R 777 "$PROJECT_DIR/backend/static" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/nginx/ssl_managed"

# Docker volume kontrolü
if ! docker volume ls --format "{{.Name}}" | grep -qx "$DB_VOLUME_NAME"; then
    echo "📦 Docker volume oluşturuluyor: $DB_VOLUME_NAME"
    docker volume create "$DB_VOLUME_NAME"
fi

if [ -z "${FRONTEND_PORT_EXTERNAL:-}" ] || [ "${FRONTEND_PORT_EXTERNAL:-}" = "3000" ] || [ "${FRONTEND_PORT_EXTERNAL:-}" = "${NGINX_HTTP_PORT:-}" ]; then
    FRONTEND_PORT_EXTERNAL="3005"
fi

# 3. Adım: Docker Build İşlemleri
echo "[3/4] Docker konteynerleri yeniden oluşturuluyor..."
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

PROJECT_NAME="$SANITIZED_PROJECT_NAME"
COMPOSE_PROJECT_NAME="$SANITIZED_PROJECT_NAME"
export PROJECT_NAME COMPOSE_PROJECT_NAME ENV_FILE GIT_SHA DB_VOLUME_NAME FRONTEND_PORT_EXTERNAL
DC=(docker compose -p "${SANITIZED_PROJECT_NAME}" --env-file "${ENV_FILE}" -f docker-compose.prod.yml)

echo "Servisler durduruluyor ve eski konteynerler temizleniyor..."
"${DC[@]}" down --remove-orphans || true
docker rm -f "${SANITIZED_PROJECT_NAME}_db" "${SANITIZED_PROJECT_NAME}_redis" "${SANITIZED_PROJECT_NAME}_backend" "${SANITIZED_PROJECT_NAME}_frontend" "${SANITIZED_PROJECT_NAME}_nginx" 2>/dev/null || true

echo "Yeni imajlar build ediliyor..."
"${DC[@]}" build

# 4. Adım: Sistemi Başlatma ve Migration
echo "[4/4] Sistem başlatılıyor ve migration uygulanıyor..."

"${DC[@]}" up -d --force-recreate --remove-orphans db redis
echo "Veritabanının hazır olması bekleniyor (10sn)..."
sleep 10

echo "Veritabanı tabloları güncelleniyor (alembic)..."
if ! "${DC[@]}" run --rm backend alembic upgrade head; then
    echo "⚠️ Migration sırasında bir sorun oluştu, ancak işleme devam ediliyor..."
fi

echo "Tüm servisler başlatılıyor..."
"${DC[@]}" up -d --force-recreate --remove-orphans

# Sağlık Kontrolü
echo "[*] Servis sağlık kontrolleri yapılıyor..."
sleep 5
HEALTH_OK=false
for i in {1..6}; do
    if docker exec "${SANITIZED_PROJECT_NAME}_backend" python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" 2>/dev/null; then
        HEALTH_OK=true
        break
    fi
    echo "Backend bekleniyor ($i/6)..."
    sleep 3
done

if [ "$HEALTH_OK" = true ]; then
    echo "✅ Backend ve veritabanı bağlantısı sağlıklı!"
else
    echo "❌ UYARI: Backend başlatılamadı!"
    docker logs "${SANITIZED_PROJECT_NAME}_backend" --tail 30 || true
fi

echo "Kullanılmayan eski Docker imajları temizleniyor..."
docker image prune -f || true

echo "==================================================="
echo "✅ GÜNCELLEME İŞLEMİ TAMAMLANDI!"
echo "Sunucu: $SERVER_LABEL"
echo "Aktif Git Commit: #$GIT_SHA"
echo "Tarih: $(date '+%Y-%m-%d %H:%M:%S')"
echo "==================================================="
