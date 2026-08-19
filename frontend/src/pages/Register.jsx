import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import client from "../api/client";

export default function Register() {
  const [regNumber, setRegNumber] = useState("");
  const [resolved, setResolved] = useState(null); // { faculty_id, faculty_name, department_id, department_name }
  const [resolveError, setResolveError] = useState("");
  const [checking, setChecking] = useState(false);

  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [levelId, setLevelId] = useState("");
  const [semesterId, setSemesterId] = useState("");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Reset everything downstream whenever the reg number text changes.
  useEffect(() => {
    setResolved(null);
    setResolveError("");
    setLevels([]); setLevelId("");
    setSemesters([]); setSemesterId("");
  }, [regNumber]);

  useEffect(() => {
    if (levelId) {
      client.get(`/browse/semesters?level_id=${levelId}`).then((res) => setSemesters(res.data));
    } else {
      setSemesters([]);
    }
    setSemesterId("");
  }, [levelId]);

  async function handleCheckRegNumber() {
    setChecking(true);
    setResolveError("");
    setResolved(null);
    try {
      const res = await client.get(`/browse/resolve-reg-number?reg_number=${encodeURIComponent(regNumber)}`);
      setResolved(res.data);
      const levelsRes = await client.get(`/browse/levels?department_id=${res.data.department_id}`);
      setLevels(levelsRes.data);
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
        level_id: Number(levelId),
        semester_id: Number(semesterId),
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ marginTop: 40 }}>
        <h1>Create your GenHub account</h1>
        {error && <div className="error">{error}</div>}

        <label style={{ fontWeight: 600, fontSize: 14 }}>Registration Number</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="e.g. 24/SCIT/SEN/045"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
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
          <div className="card" style={{ background: "#eef2ff", marginBottom: 16 }}>
            ✓ Matched: <strong>{resolved.department_name}</strong>, {resolved.faculty_name}
          </div>
        )}

        {resolved && (
          <form onSubmit={handleSubmit}>
            <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <select value={levelId} onChange={(e) => setLevelId(e.target.value)} required>
              <option value="">Select Level</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} disabled={!levelId} required>
              <option value="">Select Semester</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <button type="submit">Register</button>
          </form>
        )}

        <p style={{ marginTop: 16 }}>Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
