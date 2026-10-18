import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import HeroSlides from "./HeroSlides";
import Footer from "./Footer";
import FeatureRow from "./FeatureRow";
import client from "../api/client";

export default function Register() {
  const [regNumber, setRegNumber] = useState("");
  const [resolved, setResolved] = useState(null); // { faculty_name, department_name }
  const [resolveError, setResolveError] = useState("");
  const [checking, setChecking] = useState(false);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Reset the "verified" state whenever the reg number text changes.
  useEffect(() => {
    setResolved(null);
    setResolveError("");
  }, [regNumber]);

  async function handleCheckRegNumber() {
    setChecking(true);
    setResolveError("");
    setResolved(null);
    try {
      const res = await client.get(`/browse/resolve-reg-number?reg_number=${encodeURIComponent(regNumber)}`);
      setResolved(res.data);
    } catch (err) {
      setResolveError(err.response?.data?.detail || "Could not verify this registration number");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/auth/register/student", {
        reg_number: regNumber,
        full_name: fullName,
        password,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  }

  return (
    <div className="auth">
      <HeroSlides>
          <span className="brand">GenHub</span>
          <h1>Join your department on GenHub.</h1>
          <p>Verify your registration number, set a password, and you are in.</p>

      </HeroSlides>
      <div>
      <div className="card auth-card">
        <img className="login-logo" src="/img/genhub-logo.png" alt="GenHub" />
        <h2>Create your account</h2>
        <p className="muted">You choose your level and semester after you log in.</p>
        {error && <div className="error">{error}</div>}

        <label style={{ fontWeight: 600, fontSize: 14 }}>Registration Number</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="e.g. 24/SCIT/SEN/045"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            autoCapitalize="characters"
            style={{ marginBottom: 8 }}
          />
          <button
            type="button"
            style={{ width: "auto", marginBottom: 8 }}
            onClick={handleCheckRegNumber}
            disabled={!regNumber || checking}
          >
            {checking ? "Checking..." : "Verify"}
          </button>
        </div>
        {resolveError && <div className="error">{resolveError}</div>}
        {resolved && (
          <div className="notice">
            Matched: <strong>{resolved.department_name}</strong>, {resolved.faculty_name}
          </div>
        )}

        {resolved && (
          <form onSubmit={handleSubmit}>
            <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit">Register</button>
          </form>
        )}

        <p style={{ marginBottom: 0 }}>Already have an account? <Link to="/login">Log in</Link></p>
      </div>
      <FeatureRow />
      </div>
      <Footer />
    </div>
  );
}