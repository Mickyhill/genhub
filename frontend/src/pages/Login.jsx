import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import client, { saveSession } from "../api/client";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await client.post("/auth/login", { identifier, password });
      const { access_token, role } = res.data;
      saveSession(access_token, role);
      if (role === "admin") navigate("/admin");
      else if (role === "lecturer") navigate("/lecturer");
      else navigate("/student");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: 60 }}>
        <h1>GenHub</h1>
        <p>Students: sign in with your registration number. Admins: use your username.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Registration Number (e.g. 24/SCIT/SEN/045) or Admin Username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Log In</button>
        </form>
        <p>
          New student? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
