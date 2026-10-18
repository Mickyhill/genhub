import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

// One box for courses, study files, forum posts and notices.
export default function SearchBox({ onOpenCommunity }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setRes(null);
      setBusy(false);
      setErr("");
      return;
    }
    setBusy(true);
    const id = ++seq.current;
    const timer = setTimeout(() => {
      client
        .get("/student/search", { params: { q: text } })
        .then((r) => { if (id === seq.current) { setRes(r.data); setErr(""); } })
        .catch(() => { if (id === seq.current) setErr("Search failed. Try again in a moment."); })
        .finally(() => { if (id === seq.current) setBusy(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const total = res ? res.courses.length + res.materials.length + res.posts.length + res.notices.length : 0;

  return (
    <div className="search-wrap">
      <div className="search-bar">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search courses, files, forum, notices"
          aria-label="Search GenHub"
        />
        {q && <button type="button" className="search-clear" onClick={() => setQ("")} aria-label="Clear search">×</button>}
      </div>

      {q.trim().length >= 2 && (
        <div className="search-panel">
          {busy && !res && <p className="search-note">Searching...</p>}
          {err && <p className="search-note">{err}</p>}
          {res && total === 0 && !busy && <p className="search-note">No matches for "{res.query}".</p>}

          {res && res.courses.length > 0 && (
            <div className="search-group">
              <h4>Courses</h4>
              {res.courses.map((c) => (
                <Link key={c.id} className="search-item" to={`/student/courses/${c.id}/materials`}>
                  <strong>{c.code}</strong> {c.title}
                  <small>{c.level_name} level, {c.semester_name} semester</small>
                </Link>
              ))}
            </div>
          )}
          {res && res.materials.length > 0 && (
            <div className="search-group">
              <h4>Study files</h4>
              {res.materials.map((m) => (
                <Link key={m.id} className="search-item" to={`/student/courses/${m.course_id}/materials`}>
                  <strong>{m.title}</strong>
                  <small>{m.course_code}, {m.filename}</small>
                </Link>
              ))}
            </div>
          )}
          {res && res.notices.length > 0 && (
            <div className="search-group">
              <h4>Notices</h4>
              {res.notices.map((n) => (
                <button key={n.id} type="button" className="search-item" onClick={onOpenCommunity}>
                  <strong>{n.title}</strong>
                  <small>{n.body}</small>
                </button>
              ))}
            </div>
          )}
          {res && res.posts.length > 0 && (
            <div className="search-group">
              <h4>Forum</h4>
              {res.posts.map((p) => (
                <button key={p.id} type="button" className="search-item" onClick={onOpenCommunity}>
                  <strong>{p.author_name}</strong>
                  <small>{p.body}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
