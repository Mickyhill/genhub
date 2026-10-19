import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "./PasswordInput";
import client, { clearSession } from "../api/client";
import Footer from "./Footer";

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (next.length < 8) return setError("Your new password needs at least 8 characters.");
    if (next !== again) return setError("The two new passwords do not match.");
    setBusy(true);
    try {
      await client.post("/lecturer/change-password", { current_password: current, new_password: next });
      navigate("/lecturer");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not change the password");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="auth">
      <div className="hero">
        <div className="hero-inner">
          <span className="brand">GenHub</span>
          <h1>Choose your own password.</h1>
          <p>The admin gave you a temporary password. Set a private one before you continue.</p>
        </div>
      </div>
      <div>
        <form className="card auth-card" onSubmit={submit}>
          <h2>New password</h2>
          {error && <div className="error">{error}</div>}
          <PasswordInput placeholder="Temporary password from the admin" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          <PasswordInput placeholder="New password (8 or more characters)" value={next} onChange={(e) => setNext(e.target.value)} required />
          <PasswordInput placeholder="Repeat the new password" value={again} onChange={(e) => setAgain(e.target.value)} required />
          <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
          <button type="button" className="small" style={{ background: "transparent", color: "var(--muted)" }} onClick={logout}>Log out</button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
