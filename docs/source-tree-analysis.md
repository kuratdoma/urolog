# Source Tree Analysis

## Project Root

| Directory | Description |
|-----------|-------------|
| `frontend/` | Next.js source code (React, TypeScript). |
| `backend/` | FastAPI source code (Python). |
| `nginx/` | Nginx configuration for reverse proxy and SSL. |
| `deployment_debian/` | Scripts for deploying to the Hetzner Debian server. |
| `_bmad/` | BMAD Agent configuration. |
| `docs/` | Project documentation. |
| `03.db_import/` | Scripts for data migration and seeding. |

## Frontend Structure (`frontend/`)

| Path | Purpose | Key Files |
|------|---------|-----------|
| `app/` | Next.js App Router pages and layouts. | `layout.tsx`, `page.tsx` |
| `components/` | React components. | |
| `components/ui/` | Reusable generic UI elements (shadcn/ui). | `button.tsx`, `card.tsx` |
| `components/clinical/` | Clinical domain components. | `examination-form.tsx` |
| `lib/` | Utilities and API client. | `api.ts`, `utils.ts` |
| `stores/` | State management stores (Zustand). | `auth-store.ts`, `patient-store.ts` |
| `hooks/` | Custom React hooks. | `useExaminationPageLogic.ts` |

## Backend Structure (`backend/`)

| Path | Purpose | Key Files |
|------|---------|-----------|
| `app/` | Main application package. | `main.py` |
| `app/routers/` | API route definitions. | `auth.py`, `patients.py` |
| `app/models/` | SQLAlchemy database models. | `user.py`, `patient.py` |
| `app/schemas/` | Pydantic data schemas. | `token.py`, `patient_schema.py` |
| `app/services/` | Business logic layer. | `pdf_service.py` |
| `app/core/` | Core configuration and security. | `config.py`, `security.py` |
| `alembic/` | Database migration versions. | |

## Critical Files

- **`frontend/lib/api.ts`**: The central nervous system for frontend-backend communication.
- **`backend/app/main.py`**: The entry point for the FastAPI application.
- **`docker-compose.prod.yml`**: Defines the production/local infrastructure stack.
- **`.env`**: Configuration of secrets and environment-specific variables.
