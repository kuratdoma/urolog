# 🔒 UroLog EMR V2 Güvenlik Denetim Raporu
**Tarih:** 2026-02-21  
**Denetçi:** Antigravity AI  
**Kapsam:** Backend API, Database, Docker, Frontend

---

## 🔴 KRİTİK - Acil Müdahale Gerekli

### SEC-01: Hardcoded JWT Secret Key
**Dosya:** `backend/app/core/config.py:21`  
**Ciddiyet:** 🔴 KRİTİK  
**Bulgu:**
```python
SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_TO_A_LONG_RANDOM_STRING"
```
**Etki:** Bu anahtar değiştirilmezse, saldırgan herhangi bir kullanıcının JWT tokenını taklit edebilir. Tüm kimlik doğrulama sistemi anlamsızlaşır.  
**Çözüm:**
```bash
# Production .env dosyasına ekle:
SECRET_KEY=$(openssl rand -hex 64)
```
**Kontrol:** `.env.ofis_*` veya production env dosyalarında bu değerin farklı olduğunu doğrula.

---

### SEC-02: Path Traversal - Dosya İndirme Endpoint'leri
**Dosya:** `backend/app/api/v1/endpoints/documents.py:229-241`, `clinical.py:480-489`  
**Ciddiyet:** 🔴 KRİTİK  
**Bulgu:** `download_document` ve `download_photo` endpoint'lerinde dosya yolu doğrudan veritabanından alınıp `os.path.exists()` ve `FileResponse()` ile sunuluyor. Veritabanındaki `dosya_yolu` alanına zararlı değer enjekte edilirse (`../../etc/passwd` gibi), sunucu dosya sistemi açığa çıkar.
```python
file_path = doc.dosya_yolu  # DB'den gelen kontrol dışı değer
relative_path = file_path[1:]  # Path traversal koruması YOK
return FileResponse(path=relative_path)
```
**Not:** `download_document_by_path` endpoint'inde (satır 300) `static/` prefix kontrolü var, ancak `download_document` (ID bazlı) endpointinde bu kontrol **yok**.  
**Çözüm:**
```python
import os
# Path normalize et ve traversal engelle
resolved = os.path.realpath(relative_path)
allowed_base = os.path.realpath("static/")
if not resolved.startswith(allowed_base):
    raise HTTPException(status_code=403, detail="Erişim reddedildi")
```

---

### SEC-03: Traceback Sızıntısı - Production'da Stack Trace
**Dosya:** `backend/app/main.py:41`  
**Ciddiyet:** 🔴 KRİTİK  
**Bulgu:**
```python
content={"detail": "Internal Server Error", "traceback": error_msg if settings.ENVIRONMENT != "production" else None}
```
Bu satır `ENVIRONMENT` değişkeninin doğru ayarlanmasına bağımlı. `.env` dosyasında `ENVIRONMENT=development` olarak set edilmiş. **Production deployment'ta bu değer `production` olarak değiştirilmezse, stack trace'ler kullanıcıya geri döner** — bu da dosya yolları, kütüphane versiyonları ve iç yapı hakkında bilgi sızdırır.  
**Çözüm:** Production `.env`'de `ENVIRONMENT=production` olduğunu doğrula. Ek olarak, savunma derinliği için:
```python
# Her durumda traceback göndermemek daha güvenli
content={"detail": "Internal Server Error"}
```

---

### SEC-04: Docker Container Root Kullanıcısı
**Dosya:** `backend/Dockerfile:46-51`  
**Ciddiyet:** 🟠 YÜKSEK  
**Bulgu:** Container `root` olarak çalışıyor. Yorum satırında uyarı var ama uygulanmamış:
```dockerfile
# RUN adduser -D appuser && chown -R appuser /app
# USER appuser
```
**Etki:** Container escape saldırısında host makinede root erişimi sağlanabilir.  
**Çözüm:** Yorumu aktive et ve production'a deploy et.

---

## 🟠 YÜKSEK - Kısa Vadede Çözülmeli

### SEC-05: Dosya Yükleme - Uzantı Doğrulaması Yetersiz
**Dosya:** `backend/app/api/v1/endpoints/documents.py:29-30`  
**Ciddiyet:** 🟠 YÜKSEK  
**Bulgu:** Yüklenen dosyanın uzantısı kontrol ediliyor ancak **MIME type doğrulaması yetersiz** ve **dosya boyutu limiti yok:**
```python
file_ext = os.path.splitext(file.filename)[1].lower()
# İstemci file.filename'i istediği gibi ayarlayabilir
# .exe, .sh, .py gibi dosyalar yüklenebilir
```
**Etki:** Zararlı dosya yükleme (reverse shell, web shell).  
**Çözüm:**
```python
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.pdf', '.bmp', '.doc', '.docx'}
if file_ext not in ALLOWED_EXTENSIONS:
    raise HTTPException(status_code=400, detail="Desteklenmeyen dosya formatı")

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
content = await file.read()
if len(content) > MAX_FILE_SIZE:
    raise HTTPException(status_code=413, detail="Dosya boyutu çok büyük")
```

---

### SEC-06: Zayıf Şifre Politikası
**Dosya:** `backend/app/api/v1/endpoints/auth.py:260`  
**Ciddiyet:** 🟠 YÜKSEK  
**Bulgu:**
```python
if len(data.new_password) < 6:
    raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalıdır.")
```
6 karakter minimum çok zayıf. Kullanıcı oluşturmada (`create_user`, satır 319) ise **hiçbir şifre validasyonu yok.**  
**Çözüm:** Minimum 8 karakter, en az 1 büyük harf, 1 rakam zorunlu kılınmalı. Her iki endpoint'e de uygulanmalı.

---

### SEC-07: Çift Commit Bug
**Dosya:** `backend/app/api/v1/endpoints/auth.py:337-338, 430-431`  
**Ciddiyet:** 🟡 ORTA (Güvenlik + Stabilite)  
**Bulgu:**
```python
await db.commit()
await db.commit()  # ← Gereksiz çift commit
```
`create_user` ve `update_user` fonksiyonlarında art arda iki commit var. Bu, potansiyel race condition ve audit log tutarsızlığına yol açabilir.  
**Çözüm:** İkinci `await db.commit()` satırını sil.

---

### SEC-08: Kullanıcı Listeleme - Yetki Kontrolü Eksik
**Dosya:** `backend/app/api/v1/endpoints/auth.py:284-294`  
**Ciddiyet:** 🟠 YÜKSEK  
**Bulgu:**
```python
@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    # Optional: Only admins can list all users?
    # For now keep it as is
    result = await db.execute(select(User).filter(User.is_hidden == False).order_by(User.id))
    return result.scalars().all()
```
**Herhangi** bir giriş yapmış kullanıcı tüm kullanıcıları listeleyebilir (e-posta, rol, shard_id dahil).  
**Çözüm:** `if not current_user.is_superuser: raise 403` ekle.

---

### SEC-09: Klinik Endpoint'lerde Auth Eksikliği
**Dosya:** `backend/app/api/v1/endpoints/clinical.py` (çok sayıda endpoint)  
**Ciddiyet:** 🟠 YÜKSEK  
**Bulgu:** Birçok klinik endpoint'te `current_user = Depends(deps.get_current_user)` dependency'si **YOK**. Sadece `db = Depends(deps.get_db)` kullanılıyor. Bu, şu endpoint'lerin `get_sharded_db` yerine `get_db` kullandığını ve doğrudan public schema'ya eriştiğini gösteriyor:
- `POST /photos`, `PUT /photos/{id}`, `DELETE /photos/{id}`
- `POST /imagings`, `GET /imagings/{id}`, `DELETE /imagings/{id}`
- Telefon görüşmeleri, raporlar, biyopsiler vs.

**Etki:** Token olmadan bu endpoint'lere erişilebilir mi? → Hayır, global middleware (SlowAPI) ve OAuth2 scheme uygulanıyor. AMA kullanıcı bilgisi audit log'a kayıt edilemiyor. Ayrıca shard izolasyonu sağlanmıyor.  
**Çözüm:** Tüm endpoint'lere `current_user = Depends(deps.get_current_user)` ekle ve `get_sharded_db` kullan.

---

## 🟡 ORTA - Planlı Sprint'te Çözülmeli

### SEC-10: SQL Injection Riski - Shard Router
**Dosya:** `backend/app/db/shard_router.py:42-45`  
**Ciddiyet:** 🟡 ORTA (Korunmuş ama dikkat gerekli)  
**Bulgu:**
```python
if not re.match(r'^(public|tenant_\d+)$', schema_name):
    raise ValueError(f"Invalid schema name format: {schema_name}")
await session.execute(text(f"SET search_path TO {schema_name}"))
```
Regex koruması mevcut (✅ iyi), ancak `text()` ile f-string kullanımı kötü pratik. `shard_id` JWT'den integer olarak geldiği için mevcut durumda doğrudan bir risk yok, ama gelecekte eklenen farklı routing mekanizmaları riski artırabilir.  
**Çözüm:** Parameterized olarak yeniden yazılabilir veya bilinçli olarak bırakılabilir (regex yeterli koruma sağlıyor).

---

### SEC-11: CORS - Açık Header/Method Politikası
**Dosya:** `backend/app/main.py:65-71`  
**Ciddiyet:** 🟡 ORTA  
**Bulgu:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # ✅ Spesifik originler (iyi)
    allow_credentials=True,
    allow_methods=["*"],             # ⚠️ Tüm HTTP metodları
    allow_headers=["*"],             # ⚠️ Tüm headerlar
)
```
Allow origins iyi kontrol ediliyor, ancak method ve header wildcard'ları gereksiz genişlik sağlıyor.  
**Çözüm:** `allow_methods=["GET", "POST", "PUT", "DELETE"]`, `allow_headers=["Authorization", "Content-Type"]`

---

### SEC-12: ProxyHeadersMiddleware - trusted_hosts="*"
**Dosya:** `backend/app/main.py:48`  
**Ciddiyet:** 🟡 ORTA  
**Bulgu:**
```python
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
```
**Etki:** IP spoofing - saldırgan `X-Forwarded-For` header'ını manipüle ederek rate limiter'ı bypass edebilir.  
**Çözüm:** `trusted_hosts=["127.0.0.1", "nginx"]` olarak daralt.

---

### SEC-13: Error Logging - Dosyaya Hassas Bilgi Yazımı
**Dosya:** `backend/app/api/v1/endpoints/auth.py:77-78`  
**Ciddiyet:** 🟡 ORTA  
**Bulgu:**
```python
with open("backend_error.log", "a") as f:
    f.write(f"\n[{datetime.now()}] Login Error:\n{error_msg}\n")
```
Stack trace'ler düz dosyaya yazılıyor. Docker volume'da `static/` ile birlikte erişime açılabilir.  
**Çözüm:** Strüktürlü logging kullan (`logging` modülü), dosya yerine stdout'a yaz.

---

### SEC-14: Redis Parolasız
**Dosya:** `backend/app/core/config.py:48`, `docker-compose.yml`  
**Ciddiyet:** 🟡 ORTA  
**Bulgu:** Redis şifresiz çalışıyor (`REDIS_PASSWORD: str = ""`). Docker compose'da Redis servisi bile tanımlı değil (harici kurulum bekleniyor).  
**Çözüm:** `requirepass` ile Redis'e şifre ekle.

---

### SEC-15: Database Credentials - docker-compose.yml'de Plaintext
**Dosya:** `backend/docker-compose.yml:10-12`  
**Ciddiyet:** 🟡 ORTA  
**Bulgu:**
```yaml
POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_password}
```
Fallback şifre `secure_password` — eğer `.env` dosyası yoksa bu şifreyle çalışır.  
**Çözüm:** Docker Secrets kullan veya `.env` dosyasının varlığını zorunlu kıl.

---

## 🟢 DÜŞÜK - Farkındalık / Best Practice

### SEC-16: Swagger/API Docs Environment Kontrolü
**Dosya:** `backend/app/main.py:29-30`  
**Bulgu:** `docs_url=None if production` uygulanmış ✅. Ancak `ENVIRONMENT` değişkeninin doğru ayarlanmasına bağımlı.

### SEC-17: Audit Service PII Redaction
**Dosya:** `backend/app/services/audit_service.py:14-22`  
**Bulgu:** KVKK uyumlu PII redaction uygulanmış ✅. `tc_kimlik`, `email`, `telefon` gibi alanlar `[REDACTED]` olarak loglanıyor.

### SEC-18: `datetime.utcnow()` Deprecation
**Dosya:** `backend/app/core/security.py:16,23`  
**Bulgu:** `datetime.utcnow()` Python 3.12+'da deprecated. `datetime.now(UTC)` kullanılmalı.

### SEC-19: Static File Mount Devre Dışı ✅
**Dosya:** `backend/app/main.py:158-162`  
**Bulgu:** Doğru karar — statik dosyalar artık authenticated endpoint'ler üzerinden sunuluyor.

---

## 📊 Özet Tablo

| Kod | Seviye | Konu | Durum |
|-----|--------|------|-------|
| SEC-01 | 🔴 KRİTİK | Hardcoded JWT Secret | ✅ Startup uyarı + prod crash |
| SEC-02 | 🔴 KRİTİK | Path Traversal | ✅ validate_file_path() |
| SEC-03 | 🔴 KRİTİK | Traceback Sızıntısı | ✅ Kaldırıldı |
| SEC-04 | 🟠 YÜKSEK | Docker Root User | ✅ appuser aktif |
| SEC-05 | 🟠 YÜKSEK | Dosya Uzantı Kontrolü | ✅ Whitelist + boyut limiti |
| SEC-06 | 🟠 YÜKSEK | Zayıf Şifre Politikası | ✅ 8 kar + büyük/küçük/rakam |
| SEC-07 | 🟡 ORTA | Çift Commit Bug | ✅ Düzeltildi |
| SEC-08 | 🟠 YÜKSEK | User List Auth Eksik | ✅ Superuser only |
| SEC-09 | 🟠 YÜKSEK | Clinical Auth Eksik | ✅ Router-level auth |
| SEC-10 | 🟡 ORTA | SQL Inject (Korunmuş) | ✅ Yeterli |
| SEC-11 | 🟡 ORTA | CORS Wildcard | ✅ Daraltıldı |
| SEC-12 | 🟡 ORTA | Proxy trusted_hosts | ✅ Daraltıldı |
| SEC-13 | 🟡 ORTA | Error Log Dosyası | ✅ Düzeltildi |
| SEC-14 | 🟡 ORTA | Redis Parolasız | ✅ requirepass aktif |
| SEC-15 | 🟡 ORTA | DB Plaintext Şifre | ✅ env_file zorunlu |
| SEC-16 | 🟢 DÜŞÜK | Swagger Gizleme | ✅ Uygulanmış |
| SEC-17 | 🟢 DÜŞÜK | PII Redaction | ✅ Uygulanmış |
| SEC-18 | 🟢 DÜŞÜK | utcnow Deprecation | ✅ timezone.utc |
| SEC-19 | 🟢 DÜŞÜK | Static Mount Devre Dışı | ✅ Uygulanmış |

---

## 🛡️ Mevcut Güvenlik Güçlü Yönleri

1. ✅ **bcrypt** şifre hashleme
2. ✅ **Rate limiting** (login: 5/min, forgot-password: 3/min, global: 100/min)
3. ✅ **Audit logging** (tüm kritik işlemler loglanıyor)
4. ✅ **Email enumeration koruması** (forgot-password/username her durumda aynı mesaj)
5. ✅ **KVKK-uyumlu PII redaction** (audit loglarında)
6. ✅ **Shard izolasyonu** (regex ile korunmuş schema routing)
7. ✅ **Immutable audit log trigger** (PostgreSQL seviyesinde)
8. ✅ **Password reset token TTL** (5 dakika)
9. ✅ **Self-deletion koruması** (kullanıcı kendini silemez)
10. ✅ **Static file serving devre dışı** (authenticated endpoint'ler üzerinden)

---

## 📋 Önerilen Eylem Planı

### Hafta 1 (Acil):
- [x] SEC-01: Production SECRET_KEY doğrula/değiştir ✅
- [x] SEC-02: Path traversal koruması ekle ✅
- [x] SEC-03: Traceback kaldırıldı ✅
- [x] SEC-07: Çift commit düzeltildi ✅

### Hafta 2-3 (Yüksek):
- [x] SEC-04: Dockerfile non-root user ✅
- [x] SEC-05: Dosya yükleme whitelist + boyut limiti ✅
- [x] SEC-06: Güçlü şifre politikası ✅
- [x] SEC-08: User list endpoint yetkisi ✅
- [x] SEC-09: Clinical/definitions/settings/system endpoint auth ✅

### Sprint Planında:
- [x] SEC-11/12: CORS ve proxy daraltıldı ✅
- [x] SEC-13: Dosya logging kaldırıldı ✅
- [ ] SEC-14/15: Redis ve DB credential güvenliği (kalan)
