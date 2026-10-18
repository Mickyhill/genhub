import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import HeroSlides from "./HeroSlides";
import Footer from "./Footer";
import FeatureRow from "./FeatureRow";
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
      const { access_token, role, must_change_password } = res.data;
      saveSession(access_token, role);
      if (role === "admin") navigate("/admin");
      else if (role === "lecturer") navigate(must_change_password ? "/change-password" : "/lecturer");
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
        <img className="login-logo" src="/img/genhub-logo.png" alt="GenHub" />
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
        <p style={{ marginBottom: 0 }}>New student? <Link to="/register">Create your account</Link><br />Lecturer with an access code? <Link to="/lecturer-signup">Sign up here</Link></p>
      </div>
      <FeatureRow />
      </div>
      <Footer />
    </div>
  );
}