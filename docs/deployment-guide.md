# Deployment Guide

This guide details the deployment process for UroLOG, primarily targeting a Debian-based server (Hetzner).

## Infrastructure Overview

- **Server:** Hetzner Cloud (Debian 12 Bookworm)
- **Container Runtime:** Docker Engine + Docker Compose Plugin
- **Reverse Proxy:** Nginx (running on host)
- **SSL:** Let's Encrypt (Certbot)

## Prerequisites

- SSH access to the server.
- `PROJECT_NAME`, `DB_PASSWORD`, `SECRET_KEY` configured in `.env` on the server.
- Docker installed using the `deployment_debian/DEBIAN_DEPLOYMENT_GUIDE.md`.

## Deployment Flow

1. **Local Push:**
   Backend/Frontend code changes are pushed from the local machine to the server via `rsync`.
   *(Script: `deployment_debian/deploy_hetzner.sh`)*

2. **Remote Build:**
   Docker images are rebuilt on the remote server to ensure architecture compatibility.

3. **Database Migration:**
   Alembic migrations are automatically applied on container startup.

## How to Deploy

Run the deployment script from your local machine:

```bash
./deployment_debian/deploy_hetzner.sh
```

**What the script does:**

1. **Backs up** the remote database.
2. **Synchronizes** local files to the remote server (excluding `node_modules`, `venv`, etc.).
3. **Rebuilds** the containers on the server with `--no-cache`.
4. **Restarts** the services (`docker compose up -d`).
5. **Performs Health Checks** on endpoints.

## Server-Side Configuration

- **Nginx Config:** Located at `/etc/nginx/sites-available/urolog`. Proxies port 80/443 to Docker ports 3001 (Frontend) and 8001 (Backend).
- **Environment:** Production `.env` file should live in `/home/user/UroLog/.env`.

## Troubleshooting

- **Logs:** `docker compose logs -f backend` on the server.
- **Database Access:** `docker exec -it urolog_v3_db psql -U emr_admin -d urolog_db`.
