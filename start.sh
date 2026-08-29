
#!/bin/bash

# ──────────────────────────────────────────────────────────────
# UroLOG — Lokal Geliştirme Başlatıcı
# Backend (Docker) + Frontend (Next.js) birleşik başlatma scripti

# ──────────────────────────────────────────────────────────────

# 0. Absolute path resolution & configuration
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PROJECT_NAME="${PROJECT_NAME:-urolog}"

# Komut satırı argümanları
BUILD_FLAG=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -b|--build) BUILD_FLAG="--build"; shift ;;
        -h|--help) 
            echo "Kullanım: ./start.sh [-b|--build]"
            echo "  -b, --build    Görüntüleri (Docker) yeniden derler."
            echo "  -h, --help     Bu yardım mesajını gösterir."
            exit 0
            ;;
        *) shift ;;
    esac
done

# Terminal renk kodları
NC='\033[0m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════╗"
echo "║         UroLOG  —  Lokal Başlatıcı         ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Dizin : ${BLUE}${ROOT_DIR}${NC}"
echo -e "  Proje : ${BLUE}${PROJECT_NAME}${NC}"
echo ""

# ──────────────────────────────────────────────────────────────
# Cleanup: Ctrl+C ile düzgün kapanma
# ──────────────────────────────────────────────────────────────
cleanup() {
    echo -e "\n${RED}🛑 Sistem kapatılıyor...${NC}"

    # Frontend Next.js sürecini öldür
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
        wait "$FRONTEND_PID" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} Frontend (PID $FRONTEND_PID) durduruldu."
    fi

    # Port 3001'de kalan zombie süreçleri temizle
    lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null

    echo -e "${GREEN}✅ Sistem başarıyla kapatıldı.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ──────────────────────────────────────────────────────────────
# 1. Docker Engine kontrolü
# ──────────────────────────────────────────────────────────────
echo -e "${BLUE}[1/5] Docker Engine kontrol ediliyor...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker çalışmıyor. Docker Desktop'ı başlatın.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker Engine aktif."

# ──────────────────────────────────────────────────────────────
# 1.5 Frontend Bağımlılık Kontrolü (Arka planda)
# ──────────────────────────────────────────────────────────────
echo -e "${BLUE}[1.5/5] Frontend hazırlığı başlatılıyor...${NC}"
if [ ! -d "${ROOT_DIR}/frontend/node_modules" ]; then
    echo -e "  📦 Bağımlılıklar eksik, arka planda yükleniyor (npm install)..."
    (cd "${ROOT_DIR}/frontend" && npm install > /dev/null 2>&1) &
    NPM_INSTALL_PID=$!
else
    echo -e "  ${GREEN}✓${NC} Frontend bağımlılıkları mevcut."
fi

# ──────────────────────────────────────────────────────────────
# 2. Port 3001 zombie temizliği (eski Next.js süreçleri)
# ──────────────────────────────────────────────────────────────
echo -e "${BLUE}[2/5] Port 3001 kontrol ediliyor...${NC}"
OLD_PID=$(lsof -ti :3001 2>/dev/null)
if [ -n "$OLD_PID" ]; then
    echo -e "  ${YELLOW}⚠${NC}  Port 3001 meşgul (PID: $OLD_PID). Temizleniyor..."
    kill -9 $OLD_PID 2>/dev/null
    sleep 1
    echo -e "  ${GREEN}✓${NC} Port 3001 serbest bırakıldı."
else
    echo -e "  ${GREEN}✓${NC} Port 3001 müsait."
fi

# Next.js lock dosyasını temizle (stale lock)
LOCK_FILE="${ROOT_DIR}/frontend/.next/dev/lock"
if [ -f "$LOCK_FILE" ]; then
    rm -f "$LOCK_FILE"
    echo -e "  ${GREEN}✓${NC} Stale .next/dev/lock dosyası temizlendi."
fi

# ──────────────────────────────────────────────────────────────
# 3. Backend (Docker Compose) başlatma
# ──────────────────────────────────────────────────────────────
echo -e "${BLUE}[3/5] Backend servisleri (Docker) başlatılıyor...${NC}"
cd "${ROOT_DIR}/backend"

if [ -n "$BUILD_FLAG" ]; then
    echo -e "  🏗️  Görüntüler yeniden derleniyor (bu işlem zaman alabilir)..."
fi

docker compose up -d $BUILD_FLAG 2>&1 | tail -n 5

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend başlatılamadı. 'docker compose logs backend' ile kontrol edin.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Backend konteynerleri çalışıyor."

# Veritabanı sağlık kontrolü
echo -ne "  ⏳ Veritabanı hazır olması bekleniyor"
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T db pg_isready -U urologadmin -d "${DB_NAME:-urolog}" > /dev/null 2>&1; then
        echo -e "\n  ${GREEN}✓${NC} Veritabanı hazır (Port: 5434)."
        break
    fi
    echo -n "."
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "\n${RED}❌ Veritabanı bağlantısı zaman aşımına uğradı.${NC}"
    exit 1
fi

# ──────────────────────────────────────────────────────────────
# 4. Backend login çalışıyor mu kontrol
# ──────────────────────────────────────────────────────────────
echo -e "${BLUE}[4/5] Backend API sağlık kontrolü...${NC}"
HEALTH_RETRIES=10
HEALTH_COUNT=0
while [ $HEALTH_COUNT -lt $HEALTH_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/auth/me 2>/dev/null)
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
        echo -e "  ${GREEN}✓${NC} Backend API yanıt veriyor (HTTP $HTTP_CODE)."
        break
    fi
    HEALTH_COUNT=$((HEALTH_COUNT + 1))
    sleep 1
done

if [ $HEALTH_COUNT -eq $HEALTH_RETRIES ]; then
    echo -e "  ${YELLOW}⚠${NC}  Backend API henüz yanıt vermiyor, devam ediliyor..."
fi

# ──────────────────────────────────────────────────────────────
# 5. Frontend (Next.js) başlatma
# ──────────────────────────────────────────────────────────────
echo -e "${BLUE}[5/5] Frontend (Next.js) başlatılıyor...${NC}"
cd "${ROOT_DIR}/frontend"

# Eğer arka planda npm install çalışıyorsa bekle
if [ -n "$NPM_INSTALL_PID" ]; then
    echo -ne "  ⏳ Bağımlılıkların yüklenmesi bekleniyor"
    while ps -p $NPM_INSTALL_PID > /dev/null; do
        echo -n "."
        sleep 1
    done
    echo -e "\n  ${GREEN}✓${NC} Bağımlılıklar güncel."
fi

# Lokal geliştirme ortam değişkenleri
export NEXT_PUBLIC_GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")
export BACKEND_URL="http://127.0.0.1:8000"

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
echo -e "  ${BOLD}UroLOG${NC} — ${GREEN}Sistem Aktif${NC}"
echo -e "  🏷️  Git Commit: #${NEXT_PUBLIC_GIT_SHA}"
echo -e "  🎨 Frontend  : ${BLUE}http://localhost:3001${NC}"
echo -e "  🐘 Backend   : ${BLUE}http://localhost:8000${NC}"
echo -e "  📊 DB (PG)   : ${BLUE}localhost:5434${NC}"
echo -e "  🔑 Login     : .env dosyasındaki SEED_USER_EMAIL"
echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
echo -e "  Backend logları: ${YELLOW}cd backend && docker compose logs -f${NC}"
echo -e "  Çıkmak için   : ${RED}Ctrl+C${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
echo ""

# Frontend hazır olunca tarayıcıyı otomatik aç (arka planda bekler)
(
    for i in $(seq 1 60); do
        if curl -s -o /dev/null "http://localhost:3001"; then
            open "http://localhost:3001" 2>/dev/null
            break
        fi
        sleep 1
    done
) &

# Frontend'i foreground'da başlat (Ctrl+C ile durur → cleanup tetiklenir)
npm run dev -- -p 3001 &
FRONTEND_PID=$!
wait $FRONTEND_PID

# Eğer npm beklenmedik şekilde durursa
cleanup
