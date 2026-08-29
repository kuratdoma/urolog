# AGENTS.md for UroLOG Project

This file provides guidance for AI coding agents working on the UroLOG EMR project.

## Project Structure

- `frontend/`: *Next.js* frontend application.
- `backend/`: FastAPI backend application.
- `01.boilerplate/`: Project setup and documentation files.
- `03.db_import/`: Scripts for importing data from the old DBISAM database.
- `README.md`: Main project README with setup instructions (including Docker).

## Development Environment Tips

### Backend (FastAPI - Python)

- Navigate to the `backend/` directory.
- Activate the virtual environment: `source venv/bin/activate` (Linux/macOS) or `venv\Scripts\activate` (Windows).
- Run the development server: `uvicorn app.main:app --reload`.
- Access API docs at `http://localhost:8000/docs`.
- Use `alembic upgrade head` for database migrations after model changes.

### Frontend (Next.js - TypeScript)

- Navigate to the `frontend/` directory.
- Install dependencies: `npm install`.
- Run the development server: `npm run dev`.
- Access the app at `http://localhost:3000`.

### Docker (Backend + DB)

- Navigate to the `backend/` directory.
- Start services: `docker-compose up --build`.
- Backend will be at `http://localhost:8000`, DB at `localhost:5440` (from host).

## Testing Instructions

- **Backend**: Testing setup is yet to be fully defined. Look for `pytest` configurations or tests within the `backend/app/tests` directory (if it exists).
- **Frontend**: Look for test scripts within `frontend/package.json` and run them using `npm test` or `npm run test:<type>`. Check for Jest or Cypress configurations.
- Ensure linting passes: `npm run lint` within the `frontend` directory.
- Address any type errors from TypeScript.

## General Guidance

- Refer to `README.md` for detailed setup and running instructions for different environments.
- When modifying database models in `backend/app/models`, generate and apply migrations using Alembic.
- Keep frontend components modular and refer to `shadcn/ui` and `Tailwind CSS` documentation for UI development.
