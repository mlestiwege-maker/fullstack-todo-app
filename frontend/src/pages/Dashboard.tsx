import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { AxiosError } from "axios";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import type {
  ProtectedResponse,
  TodoCreatePayload,
  TodoDeleteResponse,
  TodoItem,
  TodoUpdatePayload,
} from "../services/api";

const Dashboard = () => {
  const [data, setData] = useState<string>("");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [todoError, setTodoError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [todoLoading, setTodoLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const authHeader = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      throw new Error("Missing token");
    }

    return { Authorization: `Bearer ${token}` };
  };

  const fetchProtected = async () => {
    const headers = authHeader();

    try {
      const res = await API.get<ProtectedResponse>("/protected", {
        headers,
      });

      setData(res.data.message);
      setError("");
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError("Unable to load protected data.");
      }
      localStorage.removeItem("token");
      setTimeout(() => navigate("/login"), 1000);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodos = async () => {
    const headers = authHeader();

    try {
      const res = await API.get<TodoItem[]>("/todos", { headers });
      setTodos(res.data);
      setTodoError("");
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setTodoError("Session expired. Please login again.");
      } else {
        setTodoError("Unable to load your todos.");
      }
      localStorage.removeItem("token");
      setTimeout(() => navigate("/login"), 1000);
    }
  };

  const loadDashboard = async () => {
    await Promise.all([fetchProtected(), fetchTodos()]);
  };

  const createTodo = async () => {
    const title = newTodo.trim();
    if (!title) {
      setTodoError("Please enter a todo title.");
      return;
    }

    setTodoLoading(true);
    setTodoError("");

    try {
      const payload: TodoCreatePayload = { title };
      const res = await API.post<TodoItem>("/todos", payload, {
        headers: authHeader(),
      });

      setTodos((current: TodoItem[]) => [res.data, ...current]);
      setNewTodo("");
    } catch {
      setTodoError("Unable to create todo.");
    } finally {
      setTodoLoading(false);
    }
  };

  const updateTodo = async (todoId: number, payload: TodoUpdatePayload) => {
    try {
      const res = await API.put<TodoItem>(`/todos/${todoId}`, payload, {
        headers: authHeader(),
      });

      setTodos((current: TodoItem[]) =>
        current.map((item: TodoItem) => (item.id === todoId ? res.data : item)),
      );
    } catch {
      setTodoError("Unable to update todo.");
    }
  };

  const deleteTodo = async (todoId: number) => {
    try {
      await API.delete<TodoDeleteResponse>(`/todos/${todoId}`, {
        headers: authHeader(),
      });

      setTodos((current: TodoItem[]) => current.filter((item: TodoItem) => item.id !== todoId));
    } catch {
      setTodoError("Unable to delete todo.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  function startEdit(id: number, title: string) {
    setEditingId(id);
    setEditingTitle(title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setTodoError("");
  }

  async function saveEdit(id: number) {
    const title = editingTitle.trim();
    if (!title) {
      setTodoError("Please enter a todo title.");
      return;
    }

    try {
      await updateTodo(id, { title });
      setEditingId(null);
      setEditingTitle("");
      setTodoError("");
    } catch (e) {
      // updateTodo already sets error, but ensure editing state cleared
      setTodoError("Unable to save todo.");
    }
  }

  return (
    <div className="page-wrap">
      <div className="card dashboard-card">
        <div className="dashboard-header">
          <div>
            <h2>Dashboard</h2>
            <p className="muted">Protected route ✅</p>
          </div>
          <button className="secondary-button" onClick={logout}>
            Logout
          </button>
        </div>

        {loading ? <p>Loading protected data...</p> : <p>{data}</p>}
        {error && <p className="error">{error}</p>}

        <section className="todo-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3>My todos</h3>
            <span style={{ background: "#e0e7ff", color: "#1e40af", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: "600" }}>
              {todos.length} {todos.length === 1 ? "todo" : "todos"}
            </span>
          </div>
          <div className="todo-form">
            <input
              type="text"
              placeholder="Add a new todo"
              value={newTodo}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTodo(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  void createTodo();
                }
              }}
            />
            <button onClick={() => void createTodo()} disabled={todoLoading || !newTodo.trim()}>
              {todoLoading ? "Saving..." : "Add todo"}
            </button>
          </div>

          {todoError && <p className="error">{todoError}</p>}

          <div className="todo-list">
            {todos.length === 0 ? (
              <p className="muted">No todos yet. Add one above to get started.</p>
            ) : (
              todos.map((todo: TodoItem) => (
                <article key={todo.id} className="todo-item">
                  <label className="todo-label">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => void updateTodo(todo.id, { completed: !todo.completed })}
                    />

                    {editingId === todo.id ? (
                      <input
                        className={"todo-title-edit"}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") void saveEdit(todo.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className={todo.completed ? "todo-title completed" : "todo-title"}>
                        {todo.title}
                      </span>
                    )}
                  </label>

                  <div className="todo-actions">
                    {editingId === todo.id ? (
                      <>
                        <button
                          className="ghost-button"
                          onClick={() => void saveEdit(todo.id)}
                          disabled={!editingTitle.trim()}
                        >
                          Save
                        </button>
                        <button className="ghost-button" onClick={() => cancelEdit()}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="ghost-button"
                          onClick={() => startEdit(todo.id, todo.title)}
                        >
                          Edit
                        </button>
                        <button className="danger-button" onClick={() => void deleteTodo(todo.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;