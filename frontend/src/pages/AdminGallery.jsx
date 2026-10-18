import { useEffect, useState } from "react";
import client from "../api/client";
import { galleryImage } from "./Gallery";

export default function AdminGallery() {
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const load = () => client.get("/browse/gallery").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  function pick(e) {
    const f = e.target.files[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function add(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!file) return setErr("Choose a picture first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title); fd.append("description", desc); fd.append("file", file);
      await client.post("/admin/gallery", fd);
      setTitle(""); setDesc(""); setFile(null); setPreview("");
      e.target.reset();
      setMsg("Picture added.");
      load();
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Could not add the picture");
    } finally { setBusy(false); }
  }

  function startEdit(it) { setEditId(it.id); setEditTitle(it.title); setEditDesc(it.description || ""); }
  async function saveEdit(id) {
    try {
      await client.patch(`/admin/gallery/${id}`, { title: editTitle, description: editDesc });
      setEditId(null); setMsg("Saved."); load();
    } catch (ex) { setErr(ex.response?.data?.detail || "Could not save"); }
  }
  async function remove(id) {
    if (!window.confirm("Delete this picture for everyone?")) return;
    await client.delete(`/admin/gallery/${id}`); setMsg("Picture deleted."); load();
  }

  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>Add to "FUTIA, our pride"</h3>
        <p className="muted">Pictures show to every student. Use JPG, PNG or WEBP under 3 MB.</p>
        {msg && <div className="notice">{msg}</div>}
        {err && <div className="error">{err}</div>}
        <input placeholder="Title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} required />
        <textarea rows={3} placeholder="Description (optional)" value={desc} maxLength={1000} onChange={(e) => setDesc(e.target.value)} />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} required />
        {preview && <img className="gal-preview" src={preview} alt="Preview" />}
        <button type="submit" disabled={busy}>{busy ? "Uploading…" : "Add picture"}</button>
      </form>

      {items === null && <div className="card">Loading…</div>}
      {items && items.map((it) => (
        <div className="card gal-row" key={it.id}>
          <img src={galleryImage(it.id)} alt="" loading="lazy" />
          <div className="gal-body">
            {editId === it.id ? (
              <>
                <input value={editTitle} maxLength={120} onChange={(e) => setEditTitle(e.target.value)} />
                <textarea rows={3} value={editDesc} maxLength={1000} onChange={(e) => setEditDesc(e.target.value)} />
                <button className="small" onClick={() => saveEdit(it.id)}>Save</button>{" "}
                <button className="small secondary-dark" onClick={() => setEditId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <strong>{it.title}</strong>
                <p className="muted">{it.description || "No description"}</p>
                <button className="small secondary-dark" onClick={() => startEdit(it)}>Edit words</button>{" "}
                <button className="small danger" onClick={() => remove(it.id)}>Delete</button>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
