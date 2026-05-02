import time

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import User
from database import users_db
from auth import hash_password, verify_password, create_token, verify_token
from logger import logger

app = FastAPI()

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
    if user.username in users_db:
        logger.warning("Register failed (already exists): %s", user.username)
        raise HTTPException(status_code=400, detail="User already exists")

    users_db[user.username] = hash_password(user.password)

    logger.info("User registered: %s", user.username)

    return {"message": "User registered successfully"}


# LOGIN
@app.post("/login")
def login(user: User):
    if user.username not in users_db:
        logger.warning("Login failed (unknown user): %s", user.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, users_db[user.username]):
        logger.warning("Login failed (bad password): %s", user.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.username)

    logger.info("User logged in: %s", user.username)

    return {"access_token": token}


# PROTECTED ROUTE
@app.get("/protected")
def protected(Authorization: str = Header(None)):
    if not Authorization:
        logger.warning("Protected access denied: missing Authorization header")
        raise HTTPException(status_code=401, detail="No token provided")

    scheme, _, token = Authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        logger.warning("Protected access denied: malformed Authorization header")
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    try:
        payload = verify_token(token)
    except Exception:
        logger.warning("Protected access denied: invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")

    logger.info("Protected access granted: %s", payload.get("sub", "unknown"))
    return {"message": f"Welcome {payload['sub']}"}