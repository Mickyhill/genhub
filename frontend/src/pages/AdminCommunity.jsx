import { useEffect, useState } from "react";
import client from "../api/client";
import Tabs from "./Tabs";

const fmt = (d) => new Date(d + "Z").toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export default function AdminCommunity() {
  const [tab, setTab] = useState("news");
  return (
    <>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[["news", "Announcements"], ["forum", "Forum"], ["inbox", "Inbox"], ["suggest", "Suggestions"]]}
      />
      {tab === "news" && <News />}
      {tab === "forum" && <Forum />}
      {tab === "inbox" && <Inbox />}
      {tab === "suggest" && <Suggestions />}
    </>
  );
}

function News() {
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const load = () => client.get("/admin/community/announcements").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  async function send(e) {
    e.preventDefault();
    await client.post("/admin/community/announcements", { title, body });
    setTitle(""); setBody(""); load();
  }
  async function remove(id) {
    if (!confirm("Delete this announcement?")) return;
    await client.delete(`/admin/community/announcements/${id}`); load();
  }
  return (
    <>
      <form className="card" onSubmit={send}>
        <h3>New announcement</h3>
        <p className="muted">Shown to all students. Lecturers do not see announcements.</p>
        <input placeholder="Title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
        <textarea rows={4} placeholder="Message" value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} required />
        <button type="submit">Publish</button>
      </form>
      {items && items.map((a) => (
        <div className="card" key={a.id}>
          <h3>{a.title}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
          <small className="muted">{fmt(a.created_at)}</small>{" "}
          <button className="danger small" onClick={() => remove(a.id)}>Delete</button>
        </div>
      ))}
    </>
  );
}

function Forum() {
  const [posts, setPosts] = useState(null);
  const load = () => client.get("/admin/community/forum").then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);
  async function remove(id) {
    if (!confirm("Delete this post for everyone?")) return;
    await client.delete(`/admin/community/forum/${id}`); load();
  }
  if (!posts) return <div className="card">Loading…</div>;
  if (!posts.length) return <div className="card muted">No forum posts yet.</div>;
  return posts.map((p) => (
    <div className="card" key={p.id}>
      <strong>{p.author_name}</strong> <small className="muted">({p.author_reg_number}) · {fmt(p.created_at)}</small>
      <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
      <button className="danger small" onClick={() => remove(p.id)}>Delete post</button>
    </div>
  ));
}

function Inbox() {
  const [threads, setThreads] = useState(null);
  const [open, setOpen] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const loadThreads = () => client.get("/admin/community/support").then((r) => setThreads(r.data));
  useEffect(() => { loadThreads(); }, []);
  async function openThread(t) {
    setOpen(t);
    const r = await client.get(`/admin/community/support/${t.student_id}`);
    setMsgs(r.data);
  }
  async function reply(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await client.post(`/admin/community/support/${open.student_id}`, { body: text });
    setText(""); openThread(open); loadThreads();
  }
  if (open) {
    return (
      <div className="card">
        <button className="secondary small" onClick={() => { setOpen(null); loadThreads(); }}>← Back</button>
        <h3 style={{ marginTop: 12 }}>{open.student_name} <small className="muted">({open.reg_number})</small></h3>
        <div className="thread">
          {msgs.map((m) => (
            <div key={m.id} className={"bubble " + (m.sender_role === "admin" ? "me" : "them")}>
              {m.body}<small>{fmt(m.created_at)}</small>
            </div>
          ))}
        </div>
        <form onSubmit={reply}>
          <textarea rows={3} placeholder="Reply…" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
          <button type="submit">Send reply</button>
        </form>
      </div>
    );
  }
  if (!threads) return <div className="card">Loading…</div>;
  if (!threads.length) return <div className="card muted">No messages from students yet.</div>;
  return threads.map((t) => (
    <div className="card clickable" key={t.student_id} onClick={() => openThread(t)}>
      <strong>{t.student_name}</strong> <small className="muted">({t.reg_number})</small>
      {t.awaiting_reply && <span className="badge">needs reply</span>}
      <p className="muted" style={{ margin: "6px 0 0" }}>{t.last_message}</p>
    </div>
  ));
}

function Suggestions() {
  const [items, setItems] = useState(null);
  const load = () => client.get("/admin/community/suggestions").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  async function remove(id) {
    await client.delete(`/admin/community/suggestions/${id}`); load();
  }
  if (!items) return <div className="card">Loading…</div>;
  if (!items.length) return <div className="card muted">No suggestions yet.</div>;
  return items.map((s) => (
    <div className="card" key={s.id}>
      <p style={{ whiteSpace: "pre-wrap" }}>{s.body}</p>
      <small className="muted">Anonymous · {fmt(s.created_at)}</small>{" "}
      <button className="danger small" onClick={() => remove(s.id)}>Delete</button>
    </div>
  ));
}
