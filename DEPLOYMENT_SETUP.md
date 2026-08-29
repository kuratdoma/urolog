# UroLOG Sunucu Kurulum ve Deploy Key Rehberi

Bu belge, UroLOG sisteminin sıfırdan sunucu kurulumu (initial deploy), SSH Deploy Key yapılandırması ve otomatik güncelleme adımlarını içerir.

---

## 1. Sistem Standartları

- **Depo Adresi:** `https://github.com/kuratdoma/urolog`
- **Proje Adı:** `urolog`
- **Proje Çalışma Dizini:** `/home/<user>/urolog_code`
- **Yedek Dizini:** `/home/<user>/backup`
- **Docker Konteynerleri:** `urolog_backend`, `urolog_frontend`, `urolog_db`, `urolog_redis`, `urolog_nginx`
- **Veritabanı Adı:** `urolog` (User: `emr_admin` veya `urologadmin`)

---

## 2. İlk Sunucu Kurulumu (Initial Setup)

Sunucunuza SSH ile bağlandıktan sonra:

```bash
# 1. Gerekli paketleri ve Docker'ı yükleyin
sudo apt update && sudo apt install -y git curl docker.io docker-compose-plugin
sudo usermod -aG docker $USER

# 2. Proje dizinini oluşturup repoyu klonlayın
cd ~
git clone https://github.com/kuratdoma/urolog.git /home/$USER/urolog_code
cd /home/$USER/urolog_code

# 3. Ortam değişkenlerini oluşturun
cp backend/.env.example .env
nano .env

# 4. Kalıcı veritabanı volume'unu oluşturun
docker volume create urolog_db_data

# 5. Sistemi derleyip başlatın
docker compose -f docker-compose.prod.yml up -d --build

# 6. Veritabanı tablolarını güncelleyin
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

---

## 3. SSH Deploy Key Yapılandırması (Otomatik Güncellemeler İçin)

Admin paneli üzerinden veya `update_scripts` ile otomatik güncelleme yapabilmek için sunucuda bir SSH anahtarı oluşturulup GitHub reposuna Deploy Key olarak eklenmelidir:

```bash
# 1. Sunucuda SSH anahtarı üretin (parolasız)
ssh-keygen -t ed25519 -C "deploy@urolog-server" -f ~/.ssh/id_ed25519 -N ""

# 2. Oluşturulan anahtarın içeriğini kopyalayın
cat ~/.ssh/id_ed25519.pub
```

3. GitHub'da **kuratdoma/urolog** deposuna gidin:
   - **Settings** -> **Deploy Keys** -> **Add deploy key**
   - Title: `UroLOG Sunucu (Deploy)`
   - Key: Kopyaladığınız genel anahtarı (`id_ed25519.pub`) yapıştırın.
   - *Allow write access* seçeneğini boş bırakabilirsiniz (sadece okuma yetkisi yeterlidir).

4. Bağlantıyı test edin:
```bash
ssh -T git@github.com
# "Hi kuratdoma/urolog! You've successfully authenticated..." mesajını görmelisiniz.
```

---

## 4. Güncelleme Scriptleri

Sistemi güncellemek için aktif kullanıcınızla:
```bash
cd /home/$USER/urolog_code
bash update_scripts/main_system_update.sh
```

Veya sunucunuza özel scripti çalıştırabilirsiniz:
- Acemagic: `bash update_scripts/github_update_acemagic.sh`
- Hetzner: `bash update_scripts/github_update_hetzner.sh`
- Ofis: `bash update_scripts/github_update_ofis.sh`
