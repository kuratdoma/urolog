#!/bin/bash

# =================================================================
# UroLOG Otomatik Güncelleme ve Dağıtım Scripti (Jenerik)
# Dosya Adı: update_scripts/system_update.sh
# Sunucu: Ortam değişkenleriyle belirlenir (herhangi bir host)
#
# Şablon: github_update_acemagic.sh ile aynı gövde.
# Fark: Tüm ayarlar env ile override edilebilir ve varsayılan olarak
#       etkileşimsiz çalışır (AUTO_CONFIRM=1) — cron/otomasyon için.
#
# Örnek: SERVER_LABEL="Ofis" PROJECT_DIR=/opt/urolog ./system_update.sh
#        AUTO_CONFIRM=0 ./system_update.sh   # onay sorsun
# =================================================================

set -e # Herhangi bir hata oluşursa scripti durdur

# --- Sunucuya Özgü Ayarlar (env ile override edilebilir) ---
SERVER_LABEL="${SERVER_LABEL:-Jenerik}"
ACTIVE_USER="${SUDO_USER:-${USER:-$(whoami)}}"
PROJECT_DIR="${PROJECT_DIR:-/home/${ACTIVE_USER}/urolog_code}"
BACKUP_DIR="${BACKUP_DIR:-/home/${ACTIVE_USER}/backup/files}"

# --- Ortak Yapılandırma (tüm sunucularda aynı) ---
PROJECT_NAME="${PROJECT_NAME:-urolog}"
ENV_FILE="${ENV_FILE:-.env}"
REPO_URL="${REPO_URL:-https://github.com/kuratdoma/urolog}"
AUTO_CONFIRM="${AUTO_CONFIRM:-1}"   # Jenerik script varsayılan olarak etkileşimsiz

# Docker proje adında geçersiz karakterleri (nokta, boşluk vb.) temizle
SANITIZED_PROJECT_NAME=$(echo "$PROJECT_NAME" | sed 's/[^a-zA-Z0-9_-]//g' | tr '[:upper:]' '[:lower:]')

# Ortam değişkenlerini .env dosyasından çek (Yedekleme ve Docker için)
ENV_FOUND=false
if [ -f "${PROJECT_DIR}/${ENV_FILE}" ]; then
    set -a
    # shellcheck source=/dev/null
    . "${PROJECT_DIR}/${ENV_FILE}" 2>/dev/null || true
    set +a
    ENV_FOUND=true
fi

# .env'den gelmediyse yedekleme komutu için varsayılanlar
DB_NAME="${DB_NAME:-urolog}"
DB_USER="${DB_USER:-urologadmin}"

# Çalışan DB konteyner ismini dinamik tespit et
CONTAINER_DB_NAME=$(docker ps --format "{{.Names}}" | grep -E "(urolog|uro).*db" | head -n 1 || true)
if [ -z "$CONTAINER_DB_NAME" ]; then
    CONTAINER_DB_NAME="${SANITIZED_PROJECT_NAME}_db"
fi

# DB volume tespiti (docker-compose "external: true" çökmesini önler)
if [ -z "${DB_VOLUME_NAME:-}" ]; then
    DETECTED_VOLUME=$(docker volume ls --format "{{.Name}}" | grep -E "(urolog|uro).*db_data" | head -n 1 || true)
    if [ -n "$DETECTED_VOLUME" ]; then
        DB_VOLUME_NAME="$DETECTED_VOLUME"
    else
        DB_VOLUME_NAME="${SANITIZED_PROJECT_NAME}_db_data"
    fi
fi

# Build sırasında SSH anahtarı gerekirse
SSH_AUTH_DIR="${SSH_AUTH_DIR:-${HOME}/.ssh}"

[ "$AUTO_CONFIRM" = "1" ] || clear 2>/dev/null || true
echo "==================================================="
echo "🚀 UroLOG GITHUB GÜNCELLEME SİSTEMİ (${SERVER_LABEL})"
echo "==================================================="

# 0. Adım: Durum Kontrolü (Bilgi Toplama)
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

# --- Özet Tablosu ---
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

# Kullanıcı Onayı (AUTO_CONFIRM=1 ise atlanır)
if [ "$AUTO_CONFIRM" != "1" ]; then
    read -p "⚠️  Yukarıdaki bilgiler doğru mu? Güncelleme başlatılsın mı? (y/n): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "❌ İşlem kullanıcı tarafından iptal edildi."
        exit 0
    fi
fi

echo "---------------------------------------------------"
echo "🔄 İşlem Başlıyor..."

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
    echo "⚠️  Uyarı: Veritabanı konteyneri ($CONTAINER_DB_NAME) çalışmıyor!"
    if [ "$AUTO_CONFIRM" = "1" ]; then
        echo "   AUTO_CONFIRM=1 → yedek atlanarak devam ediliyor."
    else
        read -p "Yedek alınmadan devam edilsin mi? (y/n): " confirm_no_backup
        if [[ $confirm_no_backup != [yY] ]]; then exit 1; fi
    fi
fi

# 2. Adım: Github'dan Kodları Çekme
echo "[2/4] Github'dan güncel kodlar çekiliyor..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Git deposu kontrolü ve tamiri (Eğer rsync ile geldiyse .git olmayabilir)
if [ ! -d ".git" ]; then
    echo "⚠️  Git deposu bulunamadı, sistem yeniden yapılandırılıyor..."
    git init
    git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
    echo "✅ Git deposu oluşturuldu ve Remote ($REPO_URL) bağlandı."
else
    git remote set-url origin "$REPO_URL" 2>/dev/null || true
fi

# Git fetch
if ! git fetch origin; then
    echo "❌ Hata: Github erişimi başarısız. Lütfen Token/Deploy Key izinlerini kontrol edin."
    exit 1
fi

echo "Yerel değişiklikler temizleniyor ve 'main' dalına eşitleniyor..."
git reset --hard origin/main

# Env dosyası sembolik bağı oluşturuluyor
if [ "$ENV_FILE" != ".env" ]; then
    echo "Ortam dosyası (.env) için sembolik bağ oluşturuluyor: ${ENV_FILE} -> .env"
    ln -sf "${PROJECT_DIR}/${ENV_FILE}" "${PROJECT_DIR}/.env"
fi

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

# Port çakışmasını önle (Örn: NGINX_HTTP_PORT ile frontend çakışmasın)
if [ -z "${FRONTEND_PORT_EXTERNAL:-}" ] || [ "${FRONTEND_PORT_EXTERNAL:-}" = "3000" ] || [ "${FRONTEND_PORT_EXTERNAL:-}" = "${NGINX_HTTP_PORT:-}" ]; then
    FRONTEND_PORT_EXTERNAL="3005"
fi

# 3. Adım: Docker Build İşlemleri
echo "[3/4] Docker konteynerleri yeniden oluşturuluyor..."
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

# Docker Compose ortam değişkenleri ve argümanları
PROJECT_NAME="$SANITIZED_PROJECT_NAME"
COMPOSE_PROJECT_NAME="$SANITIZED_PROJECT_NAME"
export PROJECT_NAME COMPOSE_PROJECT_NAME ENV_FILE GIT_SHA DB_VOLUME_NAME FRONTEND_PORT_EXTERNAL SSH_AUTH_DIR
DC=(docker compose -p "${SANITIZED_PROJECT_NAME}" --env-file "${ENV_FILE}" -f docker-compose.prod.yml)

echo "Servisler durduruluyor ve eski konteynerler temizleniyor..."
"${DC[@]}" down --remove-orphans || true

# Olası isim çakışmalarını (Conflict) kesin olarak önlemek için eski konteynerleri temizle
docker rm -f "${SANITIZED_PROJECT_NAME}_db" "${SANITIZED_PROJECT_NAME}_redis" "${SANITIZED_PROJECT_NAME}_backend" "${SANITIZED_PROJECT_NAME}_frontend" "${SANITIZED_PROJECT_NAME}_nginx" 2>/dev/null || true

echo "Yeni imajlar build ediliyor (Bu işlem zaman alabilir)..."
"${DC[@]}" build

# 4. Adım: Sistemi Başlatma ve Migration
echo "[4/4] Sistem başlatılıyor ve migration uygulanıyor..."

# Önce DB ve Redis'i başlat
"${DC[@]}" up -d --force-recreate --remove-orphans db redis

echo "Veritabanının hazır olması bekleniyor (10sn)..."
sleep 10

# Migration (Alembic) çalıştır
echo "Veritabanı tabloları güncelleniyor (alembic)..."
if ! "${DC[@]}" run --rm backend alembic upgrade head; then
    echo "⚠️  Migration sırasında bir sorun oluştu, ancak işleme devam ediliyor..."
fi

# Tüm sistemi başlat
echo "Tüm servisler (Frontend, Backend, Nginx, Redis) başlatılıyor..."
"${DC[@]}" up -d --force-recreate --remove-orphans

# Backend Sağlık Kontrolü
echo "[*] Backend ve servis sağlık kontrolleri yapılıyor..."
sleep 5
HEALTH_OK=false
for i in {1..6}; do
    if docker exec "${SANITIZED_PROJECT_NAME}_backend" python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" 2>/dev/null; then
        HEALTH_OK=true
        break
    fi
    echo "Backend'in ayağa kalkması bekleniyor ($i/6)..."
    sleep 3
done

if [ "$HEALTH_OK" = true ]; then
    echo "✅ Backend ve veritabanı bağlantısı sağlıklı!"
else
    echo "❌ UYARI: Backend başlatılamadı veya çöküyor! Son loglar:"
    docker logs "${SANITIZED_PROJECT_NAME}_backend" --tail 30 || true
fi

# Eski imajları temizle
echo "Kullanılmayan eski Docker imajları temizleniyor..."
docker image prune -f || true

echo "==================================================="
echo "✅ GÜNCELLEME İŞLEMİ TAMAMLANDI!"
echo "Sunucu: $SERVER_LABEL"
echo "Aktif Git Commit: #$GIT_SHA"
echo "Tarih: $(date '+%Y-%m-%d %H:%M:%S')"
echo "==================================================="
