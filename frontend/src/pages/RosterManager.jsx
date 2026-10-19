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
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);
  const dq = departmentId ? { department_id: departmentId } : {};

  function load(text = q) {
    client.get(base, { params: { ...dq, q: text, limit: 100 } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.detail || "Could not load the list"));
  }
  useEffect(() => { setResult(null); setErr(""); load(""); setQ(""); }, [base, departmentId]);
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function upload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setErr("Choose a file first");
    setBusy(true); setErr(""); setResult(null);
    try {
      const fd = new FormData();
      if (departmentId) fd.append("department_id", departmentId);
      fd.append("file", file);
      const r = await client.post(base + "/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(r.data);
      fileRef.current.value = ""; setFileName("");
      load();
    } catch (ex) { setErr(ex.response?.data?.detail || "Upload failed"); }
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
    if (!window.confirm("Remove this student from the list? Their account stays, but a new student with this number cannot register.")) return;
    await client.delete(`${base}/${id}`); load();
  }

  return (
    <div className="card step" id="roster">
      <StepHead icon="📋" title={deptName ? `Class list: ${deptName}` : "Class list"}
        sub="Upload who belongs to your department. Students register with their number and their name fills in by itself." />
      {err && <div className="error">{err}</div>}

      {data && (
        <div className="sem-stats three">
          <div className="sem-stat"><b>{data.total}</b><span>On the list</span></div>
          <div className="sem-stat"><b>{data.registered}</b><span>Registered</span></div>
          <div className="sem-stat"><b>{Math.max(0, data.total - data.registered)}</b><span>Not yet registered</span></div>
        </div>
      )}

      <form onSubmit={upload} className="roster-up">
        <label className="file-pick">
          <span>{fileName ? `📄 ${fileName}` : "📄 Choose Excel or CSV file"}</span>
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.csv,.txt" onChange={(e) => setFileName(e.target.files[0]?.name || "")} />
        </label>
        <button type="submit" disabled={busy}>{busy ? "Reading the file…" : "Upload class list"}</button>
      </form>
      <p className="step-note">Each row needs a registration number and a name, for example 24/SCIT/SEN/045 and Ada Obi. A header row is fine. Uploading again updates names and adds new students. It never deletes anyone.</p>

      {result && (
        <div className="notice">
          Done. Added {result.added}, updated {result.updated}, skipped {result.skipped}.
          {result.problems.length > 0 && (
            <ul className="roster-problems">{result.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
          )}
        </div>
      )}

      <form onSubmit={addOne} className="roster-add">
        <input placeholder="Reg number" value={reg} onChange={(e) => setReg(e.target.value)} autoCapitalize="characters" required />
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="mini" style={{ width: "auto" }}>Add one student</button>
      </form>

      <input placeholder="Search by name or number" value={q} onChange={(e) => setQ(e.target.value)} />
      {data && data.items.length === 0 && (
        <Empty icon="📋">{q ? "No match." : "No list yet. Upload a file above. Until then, students register with the number ranges and type their own names."}</Empty>
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
  );
}
