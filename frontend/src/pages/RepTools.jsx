import { useEffect, useState } from "react";
import PasswordInput from "./PasswordInput";
import client from "../api/client";
import Tabs from "./Tabs";
import InviteManager from "./InviteManager";

const fmt = (d) => new Date(d + "Z").toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

// Everything a class rep may do, always inside their own department.
export default function RepTools() {
  const [tab, setTab] = useState("codes");
  return (
    <>
      <div className="card rep-note">
        <strong>Class rep tools.</strong> These apply to your department only.
      </div>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[["codes", "Lecturer codes"], ["news", "Class notices"], ["forum", "Forum"], ["students", "Student passwords"]]}
      />
      {tab === "codes" && <InviteManager base="/rep" />}
      {tab === "news" && <Notices />}
      {tab === "forum" && <ForumModeration />}
      {tab === "students" && <StudentPasswords />}
    </>
  );
}

function Notices() {
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const load = () => client.get("/rep/announcements").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  async function send(e) {
    e.preventDefault();
    await client.post("/rep/announcements", { title, body });
    setTitle(""); setBody(""); load();
  }
  async function remove(id) {
    if (!window.confirm("Delete this notice?")) return;
    await client.delete(`/rep/announcements/${id}`); load();
  }
  return (
    <>
      <form className="card" onSubmit={send}>
        <h3>Post a class notice</h3>
        <p className="muted">Only students in your department see it.</p>
        <input placeholder="Title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
        <textarea rows={4} placeholder="Message" value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} required />
        <button type="submit">Post notice</button>
      </form>
      {items && items.map((a) => (
        <div className="card" key={a.id}>
          <h3>{a.title}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
          <small className="muted">{fmt(a.created_at)}</small>{" "}
          <button className="small danger" onClick={() => remove(a.id)}>Delete</button>
        </div>
      ))}
      {items && items.length === 0 && <div className="card muted">No notices yet.</div>}
    </>
  );
}

function ForumModeration() {
  const [posts, setPosts] = useState(null);
  const load = () => client.get("/rep/forum").then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);
  async function remove(id) {
    if (!window.confirm("Delete this post for everyone?")) return;
    await client.delete(`/rep/forum/${id}`); load();
  }
  if (!posts) return <div className="card">Loading…</div>;
  if (posts.length === 0) return <div className="card muted">No forum posts from your department yet.</div>;
  return posts.map((p) => (
    <div className="card" key={p.id}>
      <strong>{p.author_name}</strong> <small className="muted">({p.author_reg_number}) · {fmt(p.created_at)}</small>
      <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
      <button className="small danger" onClick={() => remove(p.id)}>Delete post</button>
    </div>
  ));
}

function StudentPasswords() {
  const [reg, setReg] = useState("");
  const [found, setFound] = useState(null);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function lookup(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setFound(null);
    try {
      const r = await client.get(`/rep/students/lookup?reg_number=${encodeURIComponent(reg)}`);
      setFound(r.data);
    } catch (ex) { setErr(ex.response?.data?.detail || "Not found"); }
  }
  async function reset(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await client.post("/rep/students/reset-password", { reg_number: found.reg_number, password: pw });
      setMsg(`Done. ${found.full_name} can log in with the new password. Tell them in person.`);
      setFound(null); setPw(""); setReg("");
    } catch (ex) { setErr(ex.response?.data?.detail || "Could not reset"); }
  }
  return (
    <div className="card">
      <h3>Help a classmate who forgot a password</h3>
      <p className="muted">Works for students in your department. Give the new password to them in person.</p>
      {msg && <div className="notice">{msg}</div>}
      {err && <div className="error">{err}</div>}
      <form onSubmit={lookup} className="inline-form">
        <input placeholder="Reg number, e.g. 24/SCIT/SEN/045" value={reg} onChange={(e) => setReg(e.target.value)} autoCapitalize="characters" required />
        <button type="submit" className="small">Look up</button>
      </form>
      {found && (
        <form onSubmit={reset}>
          <div className="notice">Found: <strong>{found.full_name}</strong></div>
          <PasswordInput placeholder="New password (6 or more characters)" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <button type="submit">Set new password</button>
        </form>
      )}
    </div>
  );
}
