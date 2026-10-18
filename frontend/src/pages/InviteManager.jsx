import { useEffect, useMemo, useState } from "react";
import client from "../api/client";

// Makes single-use lecturer codes. Used by the admin and by class reps.
// base: "/rep" for reps, "/admin" for the admin.
export default function InviteManager({ base }) {
  const optionsPath = base === "/rep" ? "/rep/course-options" : "/admin/invites/course-options";
  const [options, setOptions] = useState([]);
  const [invites, setInvites] = useState(null);
  const [label, setLabel] = useState("");
  const [picked, setPicked] = useState([]);
  const [days, setDays] = useState(7);
  const [fresh, setFresh] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => client.get(`${base}/invites`).then((r) => setInvites(r.data));
  useEffect(() => {
    client.get(optionsPath).then((r) => setOptions(r.data));
    load();
  }, []);

  const groups = useMemo(() => {
    const g = {};
    options.forEach((o) => {
      const key = base === "/rep" ? `${o.level} level, ${o.semester} semester` : `${o.department}: ${o.level} level, ${o.semester} semester`;
      (g[key] = g[key] || []).push(o);
    });
    return g;
  }, [options, base]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function create(e) {
    e.preventDefault();
    setError(""); setCopied(false);
    if (picked.length === 0) return setError("Tick at least one course.");
    setBusy(true);
    try {
      const r = await client.post(`${base}/invites`, { label, course_ids: picked, days_valid: Number(days) });
      setFresh(r.data); setLabel(""); setPicked([]); load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not make the code");
    } finally { setBusy(false); }
  }

  async function revoke(id) {
    if (!window.confirm("Cancel this code? The lecturer will not be able to use it.")) return;
    await client.delete(`${base}/invites/${id}`); load();
  }

  const shareText = fresh
    ? `GenHub lecturer sign-up: ${window.location.origin}/lecturer-signup\nYour one-time access code: ${fresh.code}\nIt works once and expires on ${new Date(fresh.expires_at + "Z").toLocaleDateString()}.`
    : "";
  async function copy() {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); } catch { setCopied(false); }
  }
  const fmt = (d) => new Date(d + "Z").toLocaleDateString([], { dateStyle: "medium" });

  return (
    <>
      {fresh && (
        <div className="card code-box">
          <h3>Code for {fresh.label}</h3>
          <div className="code-big">{fresh.code}</div>
          <p className="muted">This code is shown only now. Give it to the lecturer in person. It works once and covers: {fresh.courses.map((c) => c.code).join(", ")}.</p>
          <button type="button" className="small" onClick={copy}>{copied ? "Copied" : "Copy message to send"}</button>{" "}
          <button type="button" className="small secondary-dark" onClick={() => setFresh(null)}>Done</button>
        </div>
      )}

      <form className="card" onSubmit={create}>
        <h3>Make a lecturer code</h3>
        <p className="muted">The lecturer signs up once with this code and gets access to the courses you tick.</p>
        {error && <div className="error">{error}</div>}
        <input placeholder="Lecturer's name, e.g. Dr Bello" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} required />
        <div className="check-list">
          {Object.keys(groups).length === 0 && <p className="muted">No courses yet. Add courses first.</p>}
          {Object.entries(groups).map(([name, list]) => (
            <div key={name}>
              <div className="check-group">{name}</div>
              {list.map((o) => (
                <label key={o.id} className="check-row">
                  <input type="checkbox" checked={picked.includes(o.id)} onChange={() => toggle(o.id)} />
                  <span>{o.code} {o.title}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <select value={days} onChange={(e) => setDays(e.target.value)}>
          <option value={1}>Valid for 1 day</option>
          <option value={7}>Valid for 7 days</option>
          <option value={14}>Valid for 14 days</option>
          <option value={30}>Valid for 30 days</option>
        </select>
        <button type="submit" disabled={busy}>{busy ? "Making…" : "Make code"}</button>
      </form>

      <div className="card">
        <h3>Codes made</h3>
        {invites === null && <p className="muted">Loading…</p>}
        {invites && invites.length === 0 && <p className="muted">No codes yet.</p>}
        {invites && invites.map((i) => (
          <div key={i.id} className="lecturer-row">
            <span>
              <strong>{i.label}</strong> <span className={"status " + i.status}>{i.status}</span>
              <br />
              <small className="muted">
                {i.courses.map((c) => c.code).join(", ")} · by {i.created_by} · {i.status === "used" && i.used_by ? `used by ${i.used_by}` : `expires ${fmt(i.expires_at)}`}
              </small>
            </span>
            {i.status === "unused" && <button className="small danger" onClick={() => revoke(i.id)}>Cancel</button>}
          </div>
        ))}
      </div>
    </>
  );
}
