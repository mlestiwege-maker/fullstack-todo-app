# 2-Minute Demo Checklist

Use this as a quick script to present the project confidently.

## 0:00 - 0:15 | Project intro
- "This is a full-stack To-Do application with authentication."
- "Backend: FastAPI + SQLite. Frontend: React + TypeScript + Vite."

## 0:15 - 0:35 | Show login/register flow
- Open app home/login page.
- Register a new user (or login with an existing one).
- Mention: password hashing and token-based auth are used.

## 0:35 - 1:20 | Show protected dashboard + CRUD
- After login, show dashboard (protected route).
- Create a todo.
- Mark todo completed.
- Edit todo title inline.
- Delete a todo.
- Highlight that todos are persisted in SQLite (`backend/todo_app.db`).

## 1:20 - 1:40 | Show evidence of quality checks
- Mention frontend production build passes.
- Mention backend tests pass (`11 passed`).
- Point to `CHANGELOG.md` and `SUBMISSION_NOTE.md` for verification record.

## 1:40 - 2:00 | Close strong
- "Core requirements are complete: auth, protected routes, persistent todos, and tested backend logic."
- "Code and submission docs are pushed to GitHub and ready for review."

---

## Optional backup talking points (if asked)
- API endpoints:
  - `POST /register`
  - `POST /login`
  - `GET /protected`
  - `GET/POST/PUT/DELETE /todos`
- Security basics:
  - Passwords are hashed.
  - Access to protected resources requires `Authorization: Bearer <token>`.
- Maintainability:
  - TypeScript strictness/casing checks enabled.
  - Backend tests cover auth and todo data operations.
