import { useEffect, useState } from "react";
import client from "../api/client";

const fmt = (d) => new Date(d + "Z").toLocaleDateString([], { dateStyle: "medium" });

export default function StudentRail({ onOpenCommunity, onGoTimetable }) {
  const [news, setNews] = useState(null);
  useEffect(() => {
    client.get("/student/community/announcements").then((r) => setNews(r.data.slice(0, 3))).catch(() => setNews([]));
  }, []);

  return (
    <>
      <div className="card">
        <h3>Latest from the admin</h3>
        {news === null && <p className="muted">Loading…</p>}
        {news && news.length === 0 && <p className="muted">No announcements yet. Check back soon.</p>}
        {news && news.map((a) => (
          <div key={a.id} className="news-item">
            <strong>{a.title}</strong>
            <p className="muted">{a.body.length > 90 ? a.body.slice(0, 90) + "…" : a.body}</p>
            <small className="muted">{fmt(a.created_at)}</small>
          </div>
        ))}
        <button type="button" className="small" onClick={onOpenCommunity}>See all news</button>
      </div>

      <div className="promo" style={{ backgroundImage: "url(/img/s2.jpg)" }}>
        <div className="promo-body">
          <h3>Never miss a lecture</h3>
          <p>Add your timetable to your phone calendar and get an alarm before every class.</p>
          <button type="button" className="small amber" onClick={onGoTimetable}>Open my timetable</button>
        </div>
      </div>

      <div className="card help">
        <img src="/img/logo.png" alt="" width="48" height="44" />
        <div>
          <h3>Need help?</h3>
          <p className="muted">Send the admin a private message. Only you and the admin see it.</p>
          <button type="button" className="small" onClick={onOpenCommunity}>Message the admin</button>
        </div>
      </div>
    </>
  );
}
