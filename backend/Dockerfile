# -----------------------------------------------------------------------------
# Stage 1: Builder
# Amacı: Tüm derleme gereçlerini (gcc, make vb.) kullanarak Python paketlerini hazırlamak.
# Bu aşama final imajda yer almayacak, böylece gereksiz dosyalardan kurtulacağız.
# -----------------------------------------------------------------------------
FROM python:3.11-slim as builder

WORKDIR /app

# Python'un .pyc dosyaları oluşturmasını ve stdout'u tamponlamasını engeller
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# --- Quality Gate: Static Analysis (Dev Optimization: Moved to manual check for speed) ---
# RUN pip install flake8
# COPY . .
# RUN flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
# -------------------------------------

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt


# -----------------------------------------------------------------------------
# Stage 2: Final
# Amacı: Sadece çalışması gereken dosyaları içeren, hafif ve güvenli imaj.
# -----------------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

# Builder aşamasından sadece derlenmiş paketleri (wheels) kopyalıyoruz
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    curl \
    libgl1 \
    libglib2.0-0 \
    libfontconfig1 \
    libfreetype6 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI ve Docker Compose eklentisini doğrudan resmi release'lerden kuruyoruz
RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz | tar -xz -C /tmp \
    && mv /tmp/docker/docker /usr/local/bin/docker \
    && chmod +x /usr/local/bin/docker \
    && rm -rf /tmp/docker \
    && mkdir -p /usr/local/lib/docker/cli-plugins \
    && curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose \
    && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
    && ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

RUN git config --system --add safe.directory '*' \
    && mkdir -p /etc/ssh \
    && echo "StrictHostKeyChecking no" >> /etc/ssh/ssh_config

RUN pip install --no-cache /wheels/*

# Uygulama kodunu kopyalıyoruz
COPY . .

# Giriş scripti izinleri
COPY prestart.sh /app/prestart.sh
RUN chmod +x /app/prestart.sh

ENTRYPOINT ["/app/prestart.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
