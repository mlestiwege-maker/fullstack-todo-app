import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import type { ProtectedResponse } from "../services/api";

const Dashboard = () => {
  const [data, setData] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchProtected = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    try {
      const res = await API.get<ProtectedResponse>("/protected", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    void fetchProtected();
  }, []);

  return (
    <div className="page-wrap">
      <div className="card">
        <h2>Dashboard</h2>
        <p className="muted">Protected route ✅</p>

        {loading ? <p>Loading protected data...</p> : <p>{data}</p>}
        {error && <p className="error">{error}</p>}

        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
};

export default Dashboard;