import { useEffect, useState } from "react";
import client from "../api/client";
import { StepHead, Empty } from "./StepUi";

// Students who registered but are not on the class list. A class rep or the admin lets them in or turns them down.
export default function PendingApprovals({ base, onCount }) {
  const [data, setData] = useState(null);
  const [names, setNames] = useState({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    client.get(base).then((r) => { setData(r.data); onCount && onCount(r.data.count); })
      .catch((e) => setErr(e.response?.data?.detail || "Could not load the requests"));
  }
  useEffect(() => { load(); }, [base]);

  async function approve(s) {
    setErr(""); setMsg("");
    try {
      await client.post(`${base}/${s.id}/approve`, { full_name: names[s.id] ?? s.full_name });
      setMsg(`${names[s.id] ?? s.full_name} can log in now and is on the class list.`);
      load();
    } catch (e) { setErr(e.response?.data?.detail || "Could not approve"); }
  }
  async function reject(s) {
    if (!window.confirm(`Turn down ${s.full_name}? They may register again later.`)) return;
    setErr(""); setMsg("");
    try { await client.post(`${base}/${s.id}/reject`); setMsg("Request turned down."); load(); }
    catch (e) { setErr(e.response?.data?.detail || "Could not reject"); }
  }

  return (
    <div className="card step" id="approvals">
      <StepHead icon="🕒" title="Waiting for approval"
        sub="These students are not on the class list. Check each name, then let them in or turn them down." />
      {msg && <div className="notice">{msg}</div>}
      {err && <div className="error">{err}</div>}
      {data && data.count === 0 && <Empty icon="✅">Nobody is waiting.</Empty>}
      {data && data.items.map((s) => (
        <div key={s.id} className="pend">
          <div className="pend-top">
            <b className="code-pill">{s.reg_number}</b>
            {s.department_name && <small className="muted">{s.department_name}</small>}
            {s.reject_count > 0 && <em className="sel-tag warn">Turned down {s.reject_count} time{s.reject_count === 1 ? "" : "s"} before</em>}
          </div>
          <input
            value={names[s.id] ?? s.full_name}
            onChange={(e) => setNames({ ...names, [s.id]: e.target.value })}
            aria-label="Student name"
          />
          <div className="pend-actions">
            <button className="mini" style={{ width: "auto" }} onClick={() => approve(s)}>✔ Approve</button>
            <button className="mini danger" style={{ width: "auto" }} onClick={() => reject(s)}>✖ Turn down</button>
          </div>
        </div>
      ))}
      {data && data.count > data.items.length && <p className="step-note">Showing the first {data.items.length} of {data.count}.</p>}
    </div>
  );
}
