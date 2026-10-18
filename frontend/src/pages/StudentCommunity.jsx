import { useEffect, useState } from "react";
import client from "../api/client";
import Tabs from "./Tabs";

const fmt = (d) => new Date(d + "Z").toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export default function StudentCommunity() {
  const [tab, setTab] = useState("news");
  return (
    <>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[["news", "Announcements"], ["forum", "Forum"], ["inbox", "Message admin"], ["suggest", "Suggestion box"]]}
      />
      {tab === "news" && <News />}
      {tab === "forum" && <Forum />}
      {tab === "inbox" && <Inbox />}
      {tab === "suggest" && <Suggest />}
    </>
  );
}

function News() {
  const [items, setItems] = useState(null);
  useEffect(() => { client.get("/student/community/announcements").then((r) => setItems(r.data)); }, []);
  if (!items) return <div className="card">Loading…</div>;
  if (!items.length) return <div className="card muted">No announcements yet.</div>;
  return items.map((a) => (
    <div className="card" key={a.id}>
      <h3>{a.title}</h3>
      <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
      <small className="muted">{fmt(a.created_at)}{a.author_name ? ` · ${a.author_name}` : ""}</small>
    </div>
  ));
}

function Forum() {
  const [posts, setPosts] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => client.get("/student/community/forum").then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { await client.post("/student/community/forum", { body: text }); setText(""); await load(); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    if (!confirm("Delete your post?")) return;
    await client.delete(`/student/community/forum/${id}`); load();
  }
  return (
    <>
      <form className="card" onSubmit={send}>
        <h3>Student forum</h3>
        <textarea rows={3} maxLength={2000} placeholder="Share something with your classmates…" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" disabled={busy}>{busy ? "Posting…" : "Post"}</button>
      </form>
      {!posts ? <div className="card">Loading…</div> : posts.map((p) => (
        <div className="card" key={p.id}>
          <strong>{p.author_name}</strong> <small className="muted">· {fmt(p.created_at)}</small>
          <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
          {p.mine && <button className="danger small" onClick={() => remove(p.id)}>Delete</button>}
        </div>
      ))}
    </>
  );
}

function Inbox() {
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const load = () => client.get("/student/community/support").then((r) => setMsgs(r.data));
  useEffect(() => { load(); }, []);
  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await client.post("/student/community/support", { body: text }); setText(""); load();
  }
  return (
    <div className="card">
      <h3>Private message to the admin</h3>
      <p className="muted">Only you and the admins can see this conversation.</p>
      <div className="thread">
        {msgs && !msgs.length && <p className="muted">No messages yet.</p>}
        {msgs && msgs.map((m) => (
          <div key={m.id} className={"bubble " + (m.sender_role === "student" ? "me" : "them")}>
            {m.body}<small>{fmt(m.created_at)}</small>
          </div>
        ))}
      </div>
      <form onSubmit={send}>
        <textarea rows={3} maxLength={2000} placeholder="Type your message…" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

function Suggest() {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await client.post("/student/community/suggestions", { body: text });
    setText(""); setDone(true);
  }
  return (
    <form className="card" onSubmit={send}>
      <h3>Anonymous suggestion box</h3>
      <p className="muted">Your name is never saved with a suggestion. Admins cannot see who sent it.</p>
      {done && <div className="notice">Thank you! Your suggestion was sent anonymously.</div>}
      <textarea rows={4} maxLength={2000} placeholder="What would make school better?" value={text} onChange={(e) => { setText(e.target.value); setDone(false); }} />
      <button type="submit">Send anonymously</button>
    </form>
  );
}
