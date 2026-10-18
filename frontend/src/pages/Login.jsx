import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import HeroSlides from "./HeroSlides";
import Footer from "./Footer";
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
    <div className="auth">
      <HeroSlides>
          <span className="brand">GenHub</span>
          <h1>Your timetable, materials and results in one place.</h1>
          <p>Built for students. Get lecture reminders, study files and your grades on your phone.</p>

      </HeroSlides>
      <div>
      <div className="card auth-card">
        <h2>Log in</h2>
        <p className="muted">Students use their registration number. Admins and lecturers use their username.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Reg number or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoCapitalize="characters"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Log in</button>
        </form>
        <p style={{ marginBottom: 0 }}>New student? <Link to="/register">Create your account</Link></p>
      </div>
      <div className="feature-row">
        <div className="feature"><span>🗓️</span>Lecture alarms</div>
        <div className="feature"><span>📚</span>Study files</div>
        <div className="feature"><span>🎓</span>Your results</div>
      </div>
      </div>
      <Footer />
    </div>
  );
}