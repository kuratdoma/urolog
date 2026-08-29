# Development Guide

This guide covers the local development setup for UroLOG.

## Prerequisites

- **Docker Desktop** (running)
- **Node.js** v20+
- **Python** 3.11+
- **Git**

## Environment Setup

1. **Clone the repository.**
2. **Configure Environment Variables:**
   - Ensure a `.env` file exists in the root directory.
   - For local development, set:

     ```bash
     PROJECT_NAME=V3_lokal
     NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
     DATABASE_URL=postgresql+asyncpg://emr_admin:password@localhost:5441/DrEren_db
     ```

## Running Locally (Docker - Recommended)

The entire stack can be launched using Docker Compose.

```bash
# Build and Start
docker compose -f docker-compose.prod.yml up -d --build

# View Logs
docker compose -f docker-compose.prod.yml logs -f
```

- **Frontend:** [http://localhost:3001](http://localhost:3001)
- **Backend:** [http://localhost:8001/api/v1/docs](http://localhost:8001/api/v1/docs)
- **DB:** Port 5441 (Host) -> 5432 (Container)

## Running Manually (Frontend)

If you need to debug the frontend code specifically:

```bash
cd frontend
npm install
npm run dev
```

*Note: You may need to adjust `.env` to point to the backend.*

## Running Manually (Backend)

If you need to debug the backend code specifically:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Database Management

- **Migrations:** Managed by Alembic.

  ```bash
  # Create new migration
  alembic revision --autogenerate -m "description"
  
  # Apply migrations
  alembic upgrade head
  ```

- **Seeding:** Use scripts in `backend/scripts/` or `03.db_import/`.

## Testing

*(To be implemented)*

- Frontend: `npm run test`
- Backend: `pytest`

## Common Issues

- **Port Conflicts:** Ensure ports 3001, 8001, 5441, and 6380 are free.
- **Database Connection:** Check `DATABASE_URL` matches the Docker port mapping.
