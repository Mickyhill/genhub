import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import { StepHead, Empty } from "./StepUi";

// The department's official class list. Upload an Excel or CSV file with reg numbers and names.
// Students then register with their number and the name fills in from this list.
export default function RosterManager({ base, departmentId, deptName }) {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [reg, setReg] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(""); // "", "list", "add", "help"
  const fileRef = useRef(null);
  const dq = departmentId ? { department_id: departmentId } : {};
  const toggle = (k) => setOpen(open === k ? "" : k);

  function load(text = q) {
    client.get(base, { params: { ...dq, q: text, limit: 100 } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.detail || "Could not load the list"));
  }
  useEffect(() => { setResult(null); setErr(""); setOpen(""); load(""); setQ(""); }, [base, departmentId]);
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // One tap: pick the file and it goes straight in.
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const fd = new FormData();
      if (departmentId) fd.append("department_id", departmentId);
      fd.append("file", file);
      const r = await client.post(base + "/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(r.data);
      load();
    } catch (ex) { setErr(ex.response?.data?.detail || "Upload failed"); }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
  }

  async function addOne(e) {
    e.preventDefault();
    setErr(""); setResult(null);
    try {
      await client.post(base, { reg_number: reg, full_name: name }, { params: dq });
      setReg(""); setName(""); load();
    } catch (ex) { setErr(ex.response?.data?.detail || "Could not add"); }
  }

  async function remove(id) {
    if (!window.confirm("Remove this student from the list? Their account stays.")) return;
    await client.delete(`${base}/${id}`); load();
  }

  return (
    <div className="card step" id="roster">
      <StepHead icon="📋" title={deptName ? `Class list: ${deptName}` : "Class list"}
        sub="Students on this list register straight away and their names fill in by themselves." />
      {err && <div className="error">{err}</div>}

      {data && (
        <div className="sem-stats three">
          <div className="sem-stat"><b>{data.total}</b><span>On the list</span></div>
          <div className="sem-stat"><b>{data.registered}</b><span>Registered</span></div>
          <div className="sem-stat"><b>{Math.max(0, data.total - data.registered)}</b><span>Not yet registered</span></div>
        </div>
      )}

      <label className={"upload-btn" + (busy ? " busy" : "")}>
        <span>{busy ? "⏳ Adding the list…" : "⬆ Upload class list (Excel or CSV)"}</span>
        <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.csv,.txt" onChange={upload} disabled={busy} />
      </label>

      {result && (
        <div className="notice">
          Done. {result.added} added, {result.updated} updated, {result.skipped} skipped.
          {result.problems.length > 0 && (
            <ul className="roster-problems">{result.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
          )}
        </div>
      )}

      <div className="roster-links">
        <button type="button" className={"link-btn" + (open === "list" ? " on" : "")} onClick={() => toggle("list")}>👥 View list ({data ? data.total : 0})</button>
        <button type="button" className={"link-btn" + (open === "add" ? " on" : "")} onClick={() => toggle("add")}>➕ Add one student</button>
        <button type="button" className={"link-btn" + (open === "help" ? " on" : "")} onClick={() => toggle("help")}>ℹ️ File format</button>
      </div>

      {open === "help" && (
        <p className="step-note">Each row needs a registration number and a name, for example 24/SCIT/SEN/045 and Ada Obi. A header row is fine. Uploading again updates names and adds new students. Nobody is deleted.</p>
      )}

      {open === "add" && (
        <form onSubmit={addOne} className="roster-add">
          <input placeholder="Reg number" value={reg} onChange={(e) => setReg(e.target.value)} autoCapitalize="characters" required />
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <button type="submit" className="mini" style={{ width: "auto" }}>Add</button>
        </form>
      )}

      {open === "list" && (
        <div className="roster-scroll">
          <input placeholder="Search by name or number" value={q} onChange={(e) => setQ(e.target.value)} />
          {data && data.items.length === 0 && (
            <Empty icon="📋">{q ? "No match." : "No list yet. Tap the upload button above."}</Empty>
          )}
          {data && data.items.map((r) => (
            <div key={r.id} className="material-row item">
              <span className="item-main"><b className="code-pill">{r.reg_number.split("/").slice(-1)[0]}</b>
                <span className="item-name">{r.full_name} <small className="muted">{r.reg_number}</small></span></span>
              <button className="mini danger" style={{ width: "auto" }} onClick={() => remove(r.id)} aria-label="Remove">🗑</button>
            </div>
          ))}
          {data && data.total > data.items.length && !q && <p className="step-note">Showing the first {data.items.length}. Search to find others.</p>}
        </div>
      )}
    </div>
  );
}
