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
          <h3>My todos</h3>
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
                    <span className={todo.completed ? "todo-title completed" : "todo-title"}>
                      {todo.title}
                    </span>
                  </label>

                  <div className="todo-actions">
                    <button
                      className="ghost-button"
                      onClick={() => {
                        const nextTitle = window.prompt("Update todo title", todo.title);
                        if (nextTitle && nextTitle.trim()) {
                          void updateTodo(todo.id, { title: nextTitle.trim() });
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button className="danger-button" onClick={() => void deleteTodo(todo.id)}>
                      Delete
                    </button>
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