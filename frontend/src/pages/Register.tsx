import { useState, ChangeEvent } from "react";
import { AxiosError } from "axios";
import API from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import type { AuthPayload, RegisterResponse } from "../services/api";

const Register = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload: AuthPayload = {
        username,
        password,
      };

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

  return (
    <div className="page-wrap">
      <div className="card">
        <h2>Register</h2>
        <p className="muted">Create a new account to continue.</p>

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

        <button onClick={handleRegister} disabled={loading || !username || !password}>
          {loading ? "Creating account..." : "Register"}
        </button>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <p className="muted">
          Already registered? <Link to="/login">Go to login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;