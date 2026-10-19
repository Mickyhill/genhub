import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PasswordInput from "./PasswordInput";
import client, { saveSession } from "../api/client";
import HeroSlides from "./HeroSlides";
import Footer from "./Footer";

export default function LecturerSignup() {
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Your password needs at least 8 characters.");
    if (password !== again) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const res = await client.post("/auth/register/lecturer", { code, full_name: fullName, username, password });
      saveSession(res.data.access_token, res.data.role);
      navigate("/lecturer");
    } catch (err) {
      setError(err.response?.data?.detail || "Sign-up failed. Check your code and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <HeroSlides>
        <span className="brand">GenHub</span>
        <h1>Lecturer sign-up.</h1>
        <p>Use the one-time access code your class rep or the admin gave you. It covers the courses you teach.</p>
      </HeroSlides>
      <div>
        <form className="card auth-card" onSubmit={submit}>
          <h2>Create your lecturer account</h2>
          {error && <div className="error">{error}</div>}
          <input placeholder="Access code (GH-XXXX-XXXX)" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" required />
          <input placeholder="Full name, e.g. Dr Ade Bello" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" required />
          <PasswordInput placeholder="Choose a password (8 or more characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <PasswordInput placeholder="Repeat the password" value={again} onChange={(e) => setAgain(e.target.value)} required />
          <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
          <p style={{ marginBottom: 0 }}>Already signed up? <Link to="/login">Log in</Link></p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
