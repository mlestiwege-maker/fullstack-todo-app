import time

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import User, TodoCreate, TodoItem, TodoUpdate
from .database import (
    init_db,
    user_exists,
    create_user,
    get_password_hash,
    list_todos as db_list_todos,
    create_todo as db_create_todo,
    update_todo as db_update_todo,
    delete_todo as db_delete_todo,
)
from .auth import hash_password, verify_password, create_token, verify_token
from .logger import logger

app = FastAPI()


@app.on_event("startup")
def startup_event() -> None:
    init_db()


def get_current_username(authorization: str | None) -> str:
    if not authorization:
        logger.warning("Authorization missing")
        raise HTTPException(status_code=401, detail="No token provided")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        logger.warning("Malformed Authorization header")
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    try:
        payload = verify_token(token)
    except Exception:
        logger.warning("Invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    return str(username)

# CORS (REQUIRED)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "%s %s -> %s (%sms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response
    except Exception as exc:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.exception(
            "Unhandled error on %s %s (%sms): %s",
            request.method,
            request.url.path,
            duration_ms,
            str(exc),
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Root test
@app.get("/")
def root():
    return {"message": "API running"}

# REGISTER
@app.post("/register")
def register(user: User):
    if user_exists(user.username):
        logger.warning("Register failed (already exists): %s", user.username)
        raise HTTPException(status_code=400, detail="User already exists")

    create_user(user.username, hash_password(user.password))

    logger.info("User registered: %s", user.username)

    return {"message": "User registered successfully"}


# LOGIN
@app.post("/login")
def login(user: User):
    password_hash = get_password_hash(user.username)
    if password_hash is None:
        logger.warning("Login failed (unknown user): %s", user.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, password_hash):
        logger.warning("Login failed (bad password): %s", user.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.username)

    logger.info("User logged in: %s", user.username)

    return {"access_token": token}


# PROTECTED ROUTE
@app.get("/protected")
def protected(Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    logger.info("Protected access granted: %s", username)
    return {"message": f"Welcome {username}"}


@app.get("/todos", response_model=list[TodoItem])
def list_todos(Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    logger.info("Todos listed for: %s", username)
    return db_list_todos(username)


@app.post("/todos", response_model=TodoItem, status_code=201)
def create_todo(todo: TodoCreate, Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    created = db_create_todo(username, todo.title.strip())
    logger.info("Todo created for %s: %s", username, created["title"])
    return created


@app.put("/todos/{todo_id}", response_model=TodoItem)
def update_todo(todo_id: int, todo: TodoUpdate, Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    updated = db_update_todo(
        username,
        todo_id,
        title=todo.title.strip() if todo.title is not None else None,
        completed=todo.completed,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Todo not found")

    logger.info("Todo updated for %s: %s", username, todo_id)
    return updated


@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    if not db_delete_todo(username, todo_id):
        raise HTTPException(status_code=404, detail="Todo not found")

    logger.info("Todo deleted for %s: %s", username, todo_id)
    return {"message": "Todo deleted", "id": todo_id}