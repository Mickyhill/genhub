import { useEffect, useState, useCallback } from "react";
import client from "../api/client";

export const galleryImage = (id) => `${client.defaults.baseURL}/browse/gallery/${id}/image`;

// "FUTIA, our pride": the pictures and words the admin has added.
export default function Gallery() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null); // index of the picture in the viewer

  useEffect(() => {
    client.get("/browse/gallery").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d) => setOpen((i) => (i === null || !items ? i : (i + d + items.length) % items.length)), [items]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, step]);

  if (items === null) return <div className="card">Loading pictures…</div>;
  if (items.length === 0) return <div className="card muted">No pictures yet. The admin adds them here.</div>;

  const [lead, ...rest] = items;
  return (
    <>
      <div className="pride-head">
        <img src="/img/logo.png" alt="" width="52" height="47" />
        <div>
          <h2>FUTIA, our pride</h2>
          <p className="muted">Moments and places that make us proud. Tap a picture to open it.</p>
        </div>
      </div>

      <button type="button" className="pride-lead" onClick={() => setOpen(0)} aria-label={`Open ${lead.title}`}>
        <img src={galleryImage(lead.id)} alt="" loading="lazy" />
        <span className="pride-cap">
          <b>{lead.title}</b>
          {lead.description && <span>{lead.description}</span>}
        </span>
      </button>

      <div className="pride-grid">
        {rest.map((it, n) => (
          <button type="button" key={it.id} className="pride-card" onClick={() => setOpen(n + 1)} aria-label={`Open ${it.title}`}>
            <img src={galleryImage(it.id)} alt="" loading="lazy" />
            <span className="pride-cap">
              <b>{it.title}</b>
              {it.description && <span>{it.description}</span>}
            </span>
          </button>
        ))}
      </div>

      {open !== null && items[open] && (
        <div className="viewer" role="dialog" aria-modal="true" onClick={close}>
          <div className="viewer-box" onClick={(e) => e.stopPropagation()}>
            <img src={galleryImage(items[open].id)} alt={items[open].title} />
            <div className="viewer-text">
              <h3>{items[open].title}</h3>
              {items[open].description && <p>{items[open].description}</p>}
              <small>{open + 1} of {items.length}</small>
            </div>
            <button type="button" className="viewer-x" onClick={close} aria-label="Close">×</button>
            {items.length > 1 && (
              <>
                <button type="button" className="viewer-nav prev" onClick={() => step(-1)} aria-label="Previous picture">‹</button>
                <button type="button" className="viewer-nav next" onClick={() => step(1)} aria-label="Next picture">›</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
