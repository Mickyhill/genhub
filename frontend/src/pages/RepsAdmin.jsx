import { useEffect, useState } from "react";
import client from "../api/client";
import InviteManager from "./InviteManager";

// Admin tab: choose class reps and manage lecturer codes for any department.
export default function RepsAdmin() {
  const [reps, setReps] = useState(null);
  const [reg, setReg] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const load = () => client.get("/admin/reps").then((r) => setReps(r.data));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const r = await client.post("/admin/reps", { reg_number: reg });
      setMsg(`${r.data.full_name} is now the class rep for ${r.data.department}.`);
      setReg(""); load();
    } catch (ex) { setErr(ex.response?.data?.detail || "Could not add"); }
  }
  async function remove(r) {
    if (!window.confirm(`Remove ${r.full_name} as class rep?`)) return;
    await client.delete(`/admin/reps/${r.id}`); load();
  }

  return (
    <>
      <div className="card">
        <h3>Class reps</h3>
        <p className="muted">A class rep logs in as a student and gets extra tools for their own department: lecturer codes, class notices, forum clean-up and password help. They cannot touch results or other departments.</p>
        {msg && <div className="notice">{msg}</div>}
        {err && <div className="error">{err}</div>}
        <form onSubmit={add} className="inline-form">
          <input placeholder="Student reg number, e.g. 24/SCIT/SEN/045" value={reg} onChange={(e) => setReg(e.target.value)} autoCapitalize="characters" required />
          <button type="submit" className="small">Make class rep</button>
        </form>
        {reps && reps.length === 0 && <p className="muted">No class reps yet.</p>}
        {reps && reps.map((r) => (
          <div key={r.id} className="lecturer-row">
            <span><strong>{r.full_name}</strong> <small className="muted">({r.reg_number}) · {r.department}</small></span>
            <button className="small danger" onClick={() => remove(r)}>Remove</button>
          </div>
        ))}
      </div>
      <InviteManager base="/admin" />
    </>
  );
}
