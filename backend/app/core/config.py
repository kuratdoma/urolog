from typing import List, Union
from pydantic import AnyHttpUrl, field_validator, ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Uygulama ayarlarını yöneten sınıf.
    Değerleri öncelik sırasına göre okur:
    1. Environment Variable (Ortam Değişkeni)
    2. .env dosyası
    3. Varsayılan değer (kod içinde tanımlı)
    """

    PROJECT_NAME: str = "UroLOG"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # Options: development, production
    FRONTEND_URL: str = "http://localhost:3000"
    GITHUB_TOKEN: str = ""
    GIT_SHA: str = "latest"

    # --- GÜVENLİK AYARLARI ---
    # Bu anahtar JWT tokenlarını imzalamak için kullanılır.
    # Production'da `openssl rand -hex 64` komutu ile üretilen rastgele bir string olmalıdır.
    # ⚠️ ASLA varsayılan değeri production'da kullanma!
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_TO_A_LONG_RANDOM_STRING"
    REFRESH_SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_TO_A_LONG_RANDOM_STRING"
    ALGORITHM: str = "HS256"

    # Access Token süresi
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 420  # 420 dakika (7 saat)

    # Refresh Token süresi uzun tutulabilir (UX için)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- VERİTABANI AYARLARI ---
    # --- VERİTABANI AYARLARI ---
    DB_USER: str = "emr_admin"
    DB_PASSWORD: str = ""
    DB_NAME: str = "urolog"
    DB_HOST: str = "db"
    DB_PORT: str = "5432"

    # Database Pool Settings
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 3
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_POOL_PRE_PING: bool = True
    DB_STATEMENT_CACHE_SIZE: int = 500  # asyncpg prepared statement cache

    # --- REDIS AYARLARI ---
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""

    @property
    def REDIS_URL(self) -> str:
        """Redis bağlantı URL'sini oluşturur."""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"

    # --- EMAIL (SMTP) AYARLARI ---
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "UroLog EMR"

    # --- AI SCRIBE AYARLARI ---
    AI_SCRIBE_ENABLED: bool = True
    GOOGLE_API_KEY: str = ""
    AI_SCRIBE_MODEL: str = "gemini-2.5-flash-lite"  # Lite model: 10 req/min, ekonomik
    AI_SCRIBE_TIMEOUT: int = 120
    AI_SCRIBE_FALLBACK_ENABLED: bool = True
    LOCAL_WHISPER_ENDPOINT: str = "http://localhost:5000/whisperaudio"
    LOCAL_LLM_ENDPOINT: str = "http://localhost:11434/api/generate"
    LOCAL_LLM_MODEL: str = "mistral:7b"
    AI_SCRIBE_RECORDINGS_PATH: str = "static/recordings"

    # --- GOOGLE CALENDAR AYARLARI ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/google/callback"
    GOOGLE_CALENDAR_NAME: str = "UroLOG-Randevu"

    @property
    def DATABASE_URL(self) -> str:
        """SQLAlchemy için asenkron bağlantı stringi oluşturur."""
        from urllib.parse import quote_plus

        password = quote_plus(self.DB_PASSWORD)
        return f"postgresql+asyncpg://{self.DB_USER}:{password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # --- CORS AYARLARI ---
    # Frontend uygulamasının (React, Vue, vb.) adresi buraya eklenmelidir.
    # Güvenlik nedeniyle Production'da "*" (tüm domainler) kullanılmamalıdır.
    # --- CORS AYARLARI ---
    # Frontend uygulamasının (React, Vue, vb.) adresi buraya eklenmelidir.
    # Güvenlik nedeniyle Production'da "*" (tüm domainler) kullanılmamalıdır.
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Virgülle ayrılmış string'i listeye çevirir."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    def model_post_init(self, __context):
        import os

        # Check if running in Docker
        # This is a heuristic. Docker containers usually have .dockerenv file.
        in_docker = os.path.exists("/.dockerenv")

        # 🔒 SEC-01: Hardcoded JWT Secret uyarısı
        if "CHANGE_THIS" in self.SECRET_KEY:
            print("\n" + "=" * 60)
            print("🔴 GÜVENLİK UYARISI: JWT SECRET_KEY varsayılan değerde!")
            print("Production'da bu değer mutlaka değiştirilmelidir:")
            print("  openssl rand -hex 64")
            print("=" * 60 + "\n")
            if self.ENVIRONMENT == "production":
                raise ValueError(
                    "CRITICAL: SECRET_KEY must be changed in production! Set SECRET_KEY environment variable."
                )

        if "CHANGE_THIS" in getattr(self, "REFRESH_SECRET_KEY", "CHANGE_THIS"):
            if self.ENVIRONMENT == "production":
                print("\n" + "=" * 60)
                print("🔴 GÜVENLİK UYARISI: REFRESH_SECRET_KEY varsayılan değerde!")
                print("=" * 60 + "\n")
                raise ValueError(
                    "CRITICAL: REFRESH_SECRET_KEY must be changed in production!"
                )

        if not getattr(self, "REDIS_PASSWORD", None) and self.ENVIRONMENT == "production":
            print("\n" + "=" * 60)
            print("🔴 GÜVENLİK UYARISI: REDIS_PASSWORD boş!")
            print("Production'da Redis şifresi zorunludur.")
            print("=" * 60 + "\n")
            raise ValueError("CRITICAL: REDIS_PASSWORD must be set in production!")

        # If not in docker, and DB host is set to 'db' (the docker default), switch to localhost
        if not in_docker:
            if self.DB_HOST == "db":
                print(
                    "Detected local environment (no /.dockerenv). Switching DB to localhost:5441"
                )
                self.DB_HOST = "localhost"
                self.DB_PORT = "5441"
            if self.REDIS_HOST == "redis":
                print("Detected local environment. Switching Redis to localhost")
                self.REDIS_HOST = "localhost"

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        from_attributes=True,
        extra="ignore"
    )


settings = Settings()
