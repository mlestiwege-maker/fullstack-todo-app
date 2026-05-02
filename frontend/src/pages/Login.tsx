import { useState, ChangeEvent } from "react";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import type { AuthPayload, LoginResponse } from "../services/api";

const Login = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const payload: AuthPayload = {
        username,
        password,
      };

      const res = await API.post<LoginResponse>("/login", payload);

      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setError("Invalid credentials");
      } else {
        setError("Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="card">
        <h2>Login</h2>
        <p className="muted">Welcome back. Sign in to access your dashboard.</p>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin} disabled={loading || !username || !password}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {error && <p className="error">{error}</p>}

        <p className="muted">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;