# To-Do Auth App (FastAPI + React/TypeScript)

This repository is a full-stack To-Do authentication starter used for the competency task. It includes a Python FastAPI backend and a React + TypeScript frontend.

## Features
- Register, Login endpoints
- Protected route secured by Bearer token
- Request and error logging to `backend/app.log`
- CORS enabled for `http://localhost:3000`

## Setup (local)

Prerequisites:
- Python 3.8+ and `venv`
- Node 18+ and npm

1. Create and activate Python virtual environment (project root):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Create `.env` in the project root (a template is already provided). Modify SECRET_KEY for production:

```env
SECRET_KEY=replace_with_a_long_random_secret
```

4. Start the backend (runs on port 8000):

```bash
cd backend
uvicorn main:app --reload --port 8000
```

5. Install frontend dependencies and start dev server (runs on port 3000):

```bash
cd frontend
npm install
npm run dev
```

If `npm install` fails due to network/connectivity, try:

```bash
npm install --legacy-peer-deps --prefer-offline
```

Or run the frontend on another machine that has internet access and point it to `http://localhost:8000` for API calls.

## API Endpoints
- POST `/register` - body: `{ "username": "your", "password": "secret" }`
- POST `/login` - body: `{ "username": "your", "password": "secret" }` -> returns `{ "access_token": "..." }`
- GET `/protected` - requires header `Authorization: Bearer <token>` -> returns welcome message

## Notes & Troubleshooting
- Passwords are hashed with `passlib` (pbkdf2_sha256) for portability.
- Logs are written to `backend/app.log`.
- If you see bcrypt-related warnings: the project uses `pbkdf2_sha256` to avoid bcrypt binary issues.
- For production, set a strong `SECRET_KEY` and never commit it.

## Next steps (suggested)
- Add persistent storage (SQLite/Postgres) instead of the in-memory `users_db`.
- Add a To-Do model and CRUD endpoints.
- Add unit and integration tests.
