# UroLOG - Project Overview

**Project Name:** UroLOG (DrEren EMR)
**Type:** Monorepo (Frontend + Backend + Infrastructure)
**Primary Architecture:** Client-Server (REST API)

## Executive Summary
UroLOG is a comprehensive Electronic Medical Record (EMR) system designed for urology clinics. It manages patient data, clinical examinations, financial records, and operational workflows. The system is built with a modern tech stack focusing on performance, security, and scalability.

## Technology Stack

| Component | Technology | Version | Key Libraries |
|-----------|------------|---------|---------------|
| **Frontend** | Next.js | 16.0 | React 19, TailwindCSS 4, Shadcn UI, Zustand, TanStack Query |
| **Backend** | FastAPI | 0.109+ | SQLAlchemy 2.0, AsyncPG, Pydantic v2, Alembic |
| **Database** | PostgreSQL | 15 | - |
| **Cache** | Redis | 7 | - |
| **Infra** | Docker | - | Docker Compose, Nginx |

## Architecture Overview

### Frontend Architecture (`/frontend`)
The frontend is built using **Next.js App Router**. It features a modular design with specific directories for clinical components, patient management, and shared UI elements.
- **State Management:** Uses **Zustand** for client-side state (auth, settings) and **TanStack Query** for server-state synchronization.
- **UI System:** Built upon **Radix UI** primitives via **shadcn/ui**, styled with **TailwindCSS**.
- **Data Layer:** A centralized `api.ts` handles all HTTP communication with the backend.

### Backend Architecture (`/backend`)
The backend is a **FastAPI** application following a **Repository-Service Pattern**.
- **API Layer:** Handles HTTP requests, validation (Pydantic), and authentication.
- **Service Layer:** Contains business logic and orchestrates data operations.
- **Repository Layer:** Abstract database text interactions using SQLAlchemy.
- **Async First:** Fully asynchronous database operations using `asyncpg`.

## Key Features
1. **Patient Management:** Detailed history, physical exams, and timeline view.
2. **Clinical Modules:** Uroflowmetry parsing, Lab results analysis (PDF parsing), Prescriptions.
3. **Finance:** Ledger system, multi-currency support, invoicing.
4. **Integration:** Google Calendar sync, Brevo SMTP email service.
5. **Security:** Role-Based Access Control (RBAC), Audit Logging, comprehensive input validation.

## Directory Structure Strategy
- `frontend/`: Next.js source code.
- `backend/`: Python FastAPI source code.
- `nginx/`: Reverse proxy configuration.
- `deployment_debian/`: Deployment scripts and guides.
- `_bmad/`: BMAD Agent configuration and workflows.
- `docs/`: Additional documentation.

## Getting Started
See [Development Guide](./development-guide.md) for setup instructions.
