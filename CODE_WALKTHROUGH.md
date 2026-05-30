# Complete Todo App Code Walkthrough

## Overview
This is a **full-stack todo application** with:
- **Backend**: FastAPI (Python) - REST API with authentication and todo CRUD operations
- **Frontend**: React + TypeScript with Vite - Modern UI with routing and state management
- **Database**: SQLite - Persistent storage for users and todos

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Port 3000)                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Login      │  │  Register    │  │  Dashboard   │           │
│  │   Page       │  │  Page        │  │  (Todos)     │           │
│  │ (React)      │  │ (React)      │  │ (React)      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                 │                  │                   │
│         └─────────────────┴──────────────────┘                   │
│                           │                                      │
│                    Axios HTTP Client                             │
│            (with Authorization Headers)                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │  HTTP Requests        │
                 │  (JSON)               │
                 ▼                       ▼
        ┌─────────────────────────────────────────┐
        │   API Server (Port 8000)                │
        │   FastAPI (Python)                      │
        │                                         │
        │  ┌────────────────────────────────────┐ │
        │  │  Authentication Routes             │ │
        │  │  POST /register                    │ │
        │  │  POST /login                       │ │
        │  │  GET /protected                    │ │
        │  └────────────────────────────────────┘ │
        │                                         │
        │  ┌────────────────────────────────────┐ │
        │  │  Todo CRUD Routes                  │ │
        │  │  GET  /todos                       │ │
        │  │  POST /todos                       │ │
        │  │  PUT  /todos/{id}                  │ │
        │  │  DELETE /todos/{id}                │ │
        │  └────────────────────────────────────┘ │
        │                                         │
        │  ┌────────────────────────────────────┐ │
        │  │  Middleware                        │ │
        │  │  • CORS (allow port 3000)          │ │
        │  │  • Logging                         │ │
        │  │  • Auth Token Verification         │ │
        │  └────────────────────────────────────┘ │
        └─────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   SQLite DB      │  │  Logging         │
        │   todo_app.db    │  │  app.log         │
        │                  │  │                  │
        │  • users table   │  │  All requests    │
        │  • todos table   │  │  and errors      │
        └──────────────────┘  └──────────────────┘
```

---

## BACKEND CODE EXPLANATION

### 1. **main.py** - The FastAPI Application

```python
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
```
- **FastAPI**: Web framework for building REST APIs
- **CORSMiddleware**: Allows requests from the React frontend (localhost:3000)

#### Startup Event
```python
@app.on_event("startup")
def startup_event() -> None:
    init_db()
```
- Runs when the server starts
- Initializes the SQLite database (creates tables if they don't exist)

#### Token Verification Function
```python
def get_current_username(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")
    
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
```
- Extracts the JWT token from the "Authorization: Bearer <token>" header
- Raises **401 Unauthorized** if token is missing or invalid
- Used by all protected routes to verify the user

#### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- **allow_origins**: Only accept requests from React frontend on port 3000
- **allow_credentials**: Allow cookies/auth headers
- This allows the frontend to make cross-origin requests safely

#### Logging Middleware
```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start_time) * 1000)
    logger.info("%s %s -> %s (%sms)", request.method, request.url.path, response.status_code, duration_ms)
    return response
```
- Logs every HTTP request with method, path, status code, and duration
- Useful for debugging and auditing

#### Authentication Endpoints

**Register** (`POST /register`)
```python
@app.post("/register")
def register(user: User):
    if user_exists(user.username):
        raise HTTPException(status_code=400, detail="User already exists")
    
    create_user(user.username, hash_password(user.password))
    return {"message": "User registered successfully"}
```
- Takes username and password from request body
- Checks if user already exists (prevents duplicates)
- Hashes password with pbkdf2_sha256 (secure algorithm)
- Stores user in database
- Returns success message

**Login** (`POST /login`)
```python
@app.post("/login")
def login(user: User):
    password_hash = get_password_hash(user.username)
    if password_hash is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user.username)
    return {"access_token": token}
```
- Retrieves stored password hash from database
- Verifies provided password matches stored hash
- Creates JWT token containing username
- Returns token to frontend (frontend stores it in localStorage)
- **Why JWT?** Token is stateless - backend doesn't need to store session data

**Protected Route** (`GET /protected`)
```python
@app.get("/protected")
def protected(Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    return {"message": f"Welcome {username}"}
```
- Simple endpoint to verify authentication works
- Used by frontend to check if user is still logged in

#### Todo CRUD Endpoints

**List Todos** (`GET /todos`)
```python
@app.get("/todos", response_model=list[TodoItem])
def list_todos(Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    return db_list_todos(username)
```
- Verifies token and gets username
- Fetches all todos belonging to that user
- Returns list of TodoItems (id, title, completed status)

**Create Todo** (`POST /todos`)
```python
@app.post("/todos", response_model=TodoItem, status_code=201)
def create_todo(todo: TodoCreate, Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    created = db_create_todo(username, todo.title.strip())
    return created
```
- Receives title in request body
- Creates new todo in database for authenticated user
- Returns created todo with ID and status
- HTTP 201 = "Created" (resource was successfully created)

**Update Todo** (`PUT /todos/{todo_id}`)
```python
@app.put("/todos/{todo_id}", response_model=TodoItem)
def update_todo(todo_id: int, todo: TodoUpdate, Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    updated = db_update_todo(username, todo_id, title=todo.title, completed=todo.completed)
    return updated
```
- `{todo_id}` is a path parameter (URL variable)
- Can update title, completed status, or both
- Updates only belong to authenticated user (security)

**Delete Todo** (`DELETE /todos/{todo_id}`)
```python
@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, Authorization: str = Header(None)):
    username = get_current_username(Authorization)
    success = db_delete_todo(username, todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    return {"message": "Todo deleted", "id": todo_id}
```
- Deletes todo only if it belongs to authenticated user
- Returns 404 if todo doesn't exist

---

### 2. **models.py** - Data Validation (Pydantic)

```python
class User(BaseModel):
    username: str
    password: str
```
- Defines the structure for login/register requests
- FastAPI automatically validates incoming JSON against this model

```python
class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
```
- **Field validation**: Title must be 1-120 characters
- FastAPI rejects requests with invalid data automatically

```python
class TodoItem(BaseModel):
    id: int
    title: str
    completed: bool = False
```
- Defines the response structure
- Used by `response_model` in endpoints to validate and serialize responses

---

### 3. **auth.py** - Password and Token Management

```python
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
```
- **SECRET_KEY**: Used to sign JWT tokens (must be kept secret!)
- **ALGORITHM**: HS256 = HMAC SHA-256 (industry standard)
- **pbkdf2_sha256**: Key derivation function for password hashing

```python
def hash_password(password: str):
    return pwd_context.hash(password)
```
- One-way function: password → hash
- Same password always produces same hash
- Never stores plain password in database

```python
def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)
```
- Checks if plain password matches hash
- Uses timing-safe comparison (prevents timing attacks)

```python
def create_token(username: str):
    return jwt.encode({"sub": username}, SECRET_KEY, algorithm=ALGORITHM)
```
- Creates JWT with username in payload
- **JWT format**: `header.payload.signature`
- Signature proves token wasn't tampered with

```python
def verify_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
```
- Decodes JWT
- Verifies signature using SECRET_KEY
- Returns payload if valid, raises exception if invalid/expired

---

### 4. **database.py** - Data Persistence

```python
DB_PATH = Path(__file__).resolve().parent / "todo_app.db"

def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row  # Access columns by name
    connection.execute("PRAGMA foreign_keys = ON")  # Enable FK constraints
    return connection
```
- **DB_PATH**: SQLite file location in backend directory
- **row_factory**: Makes rows act like dictionaries (easier access)
- **PRAGMA foreign_keys**: Prevents orphaned todos if user is deleted

#### Database Schema

```sql
CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL
)

CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
)
```
- **users**: Primary key is username (unique identifier)
- **todos**: Has foreign key to users (each todo belongs to a user)
- **ON DELETE CASCADE**: If user deleted, all their todos deleted too

#### Key Functions

```python
def list_todos(username: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, title, completed FROM todos WHERE username = ? ORDER BY id DESC",
            (username,),
        ).fetchall()
        return [{"id": row["id"], "title": row["title"], "completed": bool(row["completed"])}
                for row in rows]
```
- Fetches all todos for a user
- **`?` placeholder**: Prevents SQL injection attacks
- **ORDER BY id DESC**: Newest todos first
- Converts SQLite integers (0/1) to Python booleans

```python
def create_todo(username: str, title: str) -> dict:
    with get_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO todos (username, title, completed) VALUES (?, ?, 0)",
            (username, title),
        )
        todo_id = cursor.lastrowid  # Get auto-generated ID
        # Query the created todo and return it
```
- **lastrowid**: Gets the auto-incremented ID
- Returns created todo so frontend can display it immediately

```python
def update_todo(username: str, todo_id: int, *, title: str | None = None, completed: bool | None = None):
    updates: list[str] = []
    values: list[object] = []
    
    if title is not None:
        updates.append("title = ?")
        values.append(title)
    if completed is not None:
        updates.append("completed = ?")
        values.append(1 if completed else 0)
```
- **Flexible update**: Only updates provided fields
- **`*` parameter**: Forces keyword-only arguments (title=, completed=)
- Prevents mistakes and makes code clearer

```python
def delete_todo(username: str, todo_id: int) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM todos WHERE username = ? AND id = ?",
            (username, todo_id),
        )
        return cursor.rowcount > 0  # True if row was deleted
```
- Returns True/False indicating success
- Checks both username AND id (security - user can only delete own todos)

---

## FRONTEND CODE EXPLANATION

### 1. **App.tsx** - Main Router

```typescript
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}
```
- **Router**: Enables client-side routing
- **Routes**: Define URL-to-component mapping
- `/` and `/login` both show Login component
- Protected routes in frontend redirect to `/login` if token missing

---

### 2. **services/api.ts** - API Client

```typescript
const API = axios.create({
  baseURL: "http://localhost:8000",
});
```
- **Axios**: HTTP client library
- **baseURL**: All requests automatically prefix this
- Example: `API.get("/todos")` → `http://localhost:8000/todos`

```typescript
export interface AuthPayload {
  username: string;
  password: string;
}

export interface TodoItem {
  id: number;
  title: string;
  completed: boolean;
}
```
- TypeScript interfaces ensure type safety
- Frontend knows exactly what shape data should be

---

### 3. **pages/Register.tsx** - User Registration

```typescript
const handleRegister = async () => {
  setLoading(true);
  setMessage("");
  setError("");

  try {
    const payload: AuthPayload = { username, password };
    const response = await API.post<RegisterResponse>("/register", payload);
    setMessage(response.data.message);
    setTimeout(() => navigate("/"), 1000);
  } catch (err: unknown) {
    if (err instanceof AxiosError && err.response?.status === 400) {
      setError("User already exists");
    } else {
      setError("Error creating account");
    }
  } finally {
    setLoading(false);
  }
};
```

**Flow:**
1. User enters username and password
2. Click "Register" → `handleRegister()` called
3. Send POST to `/register` with credentials
4. If success: show message, redirect to login after 1 second
5. If error: display error message specific to the status code

**Error Handling:**
- **400 error**: User already exists
- **Other errors**: Generic "Error creating account"

```typescript
<button onClick={handleRegister} disabled={loading || !username || !password}>
  {loading ? "Creating account..." : "Register"}
</button>
```
- Button disabled if loading or fields empty (prevents double-submit)
- Shows "Creating account..." during request

---

### 4. **pages/Login.tsx** - User Login

```typescript
const handleLogin = async () => {
  const res = await API.post<LoginResponse>("/login", payload);
  localStorage.setItem("token", res.data.access_token);
  navigate("/dashboard");
};
```

**Key Difference from Register:**
- Backend returns token
- Frontend saves it in **localStorage** (persists after page refresh!)
- Redirects to dashboard

**Why localStorage?**
- Makes auth persist across page reloads
- On refresh: app reads token from localStorage → auto-logged-in
- Token removed on logout or session expiration

```typescript
<input
  type="password"
  placeholder="Password"
  value={password}
  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
/>
```
- `type="password"` hides characters
- `value={password}` = controlled input (React state controls value)
- `onChange` updates React state on every keystroke

---

### 5. **pages/Dashboard.tsx** - Todo Management

#### Token Management
```typescript
const authHeader = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    navigate("/");
    throw new Error("Missing token");
  }
  return { Authorization: `Bearer ${token}` };
};
```
- Gets token from localStorage
- Creates header object for API requests
- If missing, redirects to login

#### Fetch Todos
```typescript
const fetchTodos = async () => {
  const headers = authHeader();
  const res = await API.get<TodoItem[]>("/todos", { headers });
  setTodos(res.data);
};
```
- Gets token and creates auth header
- Sends GET request with header
- Updates React state with todos

#### Create Todo
```typescript
const createTodo = async () => {
  const title = newTodo.trim();
  if (!title) {
    setTodoError("Please enter a todo title.");
    return;
  }
  
  const payload: TodoCreatePayload = { title };
  const res = await API.post<TodoItem>("/todos", payload, {
    headers: authHeader(),
  });
  
  setTodos((current) => [res.data, ...current]);  // Add to beginning
  setNewTodo("");
};
```
- Validates input (trim whitespace)
- Sends POST with todo data
- **Optimistic update**: Add to front of list immediately
- Clears input field

#### Update Todo (Toggle Completed)
```typescript
const updateTodo = async (todoId: number, payload: TodoUpdatePayload) => {
  const res = await API.put<TodoItem>(`/todos/${todoId}`, payload, {
    headers: authHeader(),
  });
  
  setTodos((current) =>
    current.map((item) => (item.id === todoId ? res.data : item))
  );
};
```
- Sends PUT to `/todos/{id}`
- Updates specific todo in list
- `item.map()`: Returns new array with updated todo

#### Delete Todo
```typescript
const deleteTodo = async (todoId: number) => {
  await API.delete(`/todos/${todoId}`, { headers: authHeader() });
  setTodos((current) => current.filter((item) => item.id !== todoId));
};
```
- Sends DELETE request
- Removes todo from list
- `.filter()`: Creates new array without deleted todo

#### Inline Editing
```typescript
function startEdit(id: number, title: string) {
  setEditingId(id);
  setEditingTitle(title);
}

function cancelEdit() {
  setEditingId(null);
  setEditingTitle("");
}
```
- Click edit → `startEdit()` sets editing state
- Shows text input for that todo
- Cancel → resets editing state
- Save → calls `updateTodo()` then `cancelEdit()`

#### Session Management
```typescript
useEffect(() => {
  void loadDashboard();
}, []);  // Empty dependency array = run once on mount
```
- Runs when component first loads
- Fetches protected data and todos
- If token invalid: redirects to login

If token expired during session:
```typescript
if (err instanceof AxiosError && err.response?.status === 401) {
  localStorage.removeItem("token");
  setTimeout(() => navigate("/login"), 1000);
}
```
- Removes invalid token
- Redirects to login after 1 second

---

## AUTHENTICATION FLOW

### Registration Flow
```
User Input (username, password)
    ↓
Frontend: POST /register {username, password}
    ↓
Backend: Hash password → Store in database
    ↓
Backend Response: {"message": "User registered successfully"}
    ↓
Frontend: Redirect to /login
```

### Login Flow
```
User Input (username, password)
    ↓
Frontend: POST /login {username, password}
    ↓
Backend: Verify password matches hash
    ↓
Backend: Create JWT token containing username
    ↓
Backend Response: {"access_token": "eyJhbGciOiJIUzI1NiI..."}
    ↓
Frontend: Save token to localStorage
    ↓
Frontend: Redirect to /dashboard
```

### Protected Request Flow
```
Frontend needs to access /todos
    ↓
Frontend: GET /todos + Header: "Authorization: Bearer {token}"
    ↓
Backend Middleware: Extract token from header
    ↓
Backend: Verify JWT signature using SECRET_KEY
    ↓
Backend: If valid, get username from token payload
    ↓
Backend: Execute endpoint with username context
    ↓
Backend Response: Data for that user only
    ↓
Frontend: Display to user
```

---

## KEY SECURITY FEATURES

### 1. **Password Security**
- ✅ Passwords hashed with pbkdf2_sha256 (one-way function)
- ✅ Never stored in plain text
- ✅ Timing-safe comparison prevents brute-force attacks

### 2. **JWT Tokens**
- ✅ Stateless (server doesn't store session data)
- ✅ Tamper-proof (signature verifies authenticity)
- ✅ Includes username in payload
- ✅ Sent in Authorization header (not URL)

### 3. **CORS**
- ✅ Only allows requests from `localhost:3000`
- ✅ Prevents malicious websites from accessing API

### 4. **SQL Injection Prevention**
- ✅ All database queries use parameterized queries (`?` placeholders)
- ✅ User input never directly interpolated into SQL

### 5. **User Data Isolation**
- ✅ Every todo operation verifies username matches
- ✅ User can only access/modify their own todos
- ✅ Example: `DELETE FROM todos WHERE username = ? AND id = ?`

---

## DATA FLOW EXAMPLE: Creating a Todo

```
┌─────────────────────────────────┐
│ User types "Buy groceries"      │
│ Clicks "Add Todo"               │
└────────────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────┐
        │ Frontend (React)                │
        │ state: newTodo = "Buy groceries"│
        │ state: token in localStorage    │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────────────┐
        │ sendRequest():                          │
        │ POST http://localhost:8000/todos        │
        │ Headers:                                │
        │   Authorization: Bearer {token}         │
        │ Body: {"title": "Buy groceries"}        │
        └────────────┬────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────────────┐
        │ Backend (FastAPI)                              │
        │ Receives POST request                           │
        │ Extracts token from Authorization header        │
        │ Token verification: verify_token(JWT)           │
        │ Returns username: "john" (from token)           │
        └────────────┬───────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────────────┐
        │ @app.post("/todos")                            │
        │ Calls: db_create_todo("john", "Buy groceries")  │
        └────────────┬───────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────────────┐
        │ Database Query:                                  │
        │ INSERT INTO todos                                │
        │ (username, title, completed)                     │
        │ VALUES ("john", "Buy groceries", 0)              │
        │                                                  │
        │ Returns: id=42 (auto-generated)                  │
        └────────────┬───────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────────────┐
        │ Backend Response:                                │
        │ Status: 201 Created                              │
        │ Body: {                                          │
        │   "id": 42,                                      │
        │   "title": "Buy groceries",                      │
        │   "completed": false                             │
        │ }                                                │
        └────────────┬───────────────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────────────┐
        │ Frontend receives response               │
        │ Updates React state:                    │
        │ setTodos([newTodo, ...oldTodos])        │
        │ Clears input field                      │
        └────────────┬────────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────────────┐
        │ React re-renders                        │
        │ User sees new todo in list!             │
        │ "Buy groceries" appears with id 42      │
        └─────────────────────────────────────────┘
```

---

## QUICK REFERENCE: Important Concepts

| Concept | Explanation |
|---------|-------------|
| **FastAPI** | Python web framework - automatically validates requests, generates docs |
| **JWT** | JSON Web Token - stateless authentication token containing user info |
| **CORS** | Cross-Origin Resource Sharing - security policy for browser requests |
| **React Hooks** | useState (state), useEffect (side effects), useNavigate (routing) |
| **Axios** | HTTP client - simpler than fetch() API |
| **SQLite** | Lightweight database - perfect for learning, stored in single file |
| **Pydantic** | Python validation library - enforces data types and formats |
| **TypeScript** | JavaScript with types - catches errors before runtime |

---

## Things to Emphasize in Interview

### Architecture
- ✅ Separation of concerns: frontend/backend clearly separated
- ✅ REST API architecture with proper HTTP methods (GET, POST, PUT, DELETE)
- ✅ Stateless JWT authentication (scales better than sessions)

### Security
- ✅ Password hashing (never store plain text)
- ✅ Token-based auth with Bearer scheme
- ✅ CORS configured properly
- ✅ SQL injection prevention with parameterized queries
- ✅ User data isolation (can't access others' todos)

### Code Quality
- ✅ Type hints (Python and TypeScript)
- ✅ Error handling with specific status codes
- ✅ Logging for debugging and auditing
- ✅ Validation at multiple layers (Pydantic, frontend UI)

### Full-Stack Understanding
- ✅ Can explain frontend→backend communication
- ✅ Understands HTTP headers and status codes
- ✅ Database design with foreign keys
- ✅ React state management and lifecycle

---

## Potential Interview Questions

1. **How does authentication work in your app?**
   - Explain: User logs in → backend creates JWT → frontend stores in localStorage → frontend sends token in every protected request

2. **Why use JWT instead of sessions?**
   - Stateless, scalable, doesn't require database lookup for every request

3. **How do you prevent SQL injection?**
   - Use parameterized queries with `?` placeholders

4. **What happens if a user tries to delete another user's todo?**
   - Database query includes `WHERE username = ? AND id = ?`, so they can't modify other users' todos

5. **How is the password stored?**
   - One-way hash using pbkdf2_sha256, never stored in plain text

6. **Explain the data flow when creating a todo.**
   - See the diagram above!

7. **Why use React hooks instead of class components?**
   - Simpler syntax, easier to manage state, better code reuse with custom hooks

8. **How do you handle token expiration?**
   - If JWT decode fails, catch 401 error, remove token, redirect to login

9. **What's the purpose of CORS?**
   - Prevents scripts on other domains from accessing your API

10. **How would you deploy this?**
    - Backend: Deploy to a server (Heroku, AWS, etc.) running Python and expose port
    - Frontend: Build with `npm run build`, deploy static files to CDN or web server
    - Update frontend's API baseURL to production backend URL
