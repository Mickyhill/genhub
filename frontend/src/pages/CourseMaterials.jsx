import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../api/client";

function formatSize(bytes) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function CourseMaterials() {
  const { courseId } = useParams();
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get(`/student/courses/${courseId}/materials`)
      .then((res) => setMaterials(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load materials"));
  }, [courseId]);

  async function handleDownload(materialId, filename) {
    const res = await client.get(`/student/materials/${materialId}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="container">
      <Link to="/student">&larr; Back to dashboard</Link>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Course Materials</h2>
        {error && <div className="error">{error}</div>}
        {materials.length === 0 && !error && <p>No materials uploaded yet for this course.</p>}
        {materials.map((m) => (
          <div key={m.id} className="material-row">
            <span>{m.title} <small>({formatSize(m.file_size_bytes)})</small></span>
            <button style={{ width: "auto" }} onClick={() => handleDownload(m.id, m.original_filename)}>
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
