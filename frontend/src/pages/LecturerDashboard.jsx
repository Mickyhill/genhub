import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client, { clearSession } from "../api/client";

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [matTitle, setMatTitle] = useState("");
  const [matFile, setMatFile] = useState(null);
  const [materials, setMaterials] = useState([]);

  const [results, setResults] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function flash(msg, isError = false) {
    if (isError) setError(msg); else setMessage(msg);
    setTimeout(() => { setMessage(""); setError(""); }, 3000);
  }

  useEffect(() => {
    client.get("/lecturer/me").then((res) => setProfile(res.data));
    client.get("/lecturer/courses").then((res) => setCourses(res.data));
  }, []);

  function loadMaterials(courseId) {
    if (courseId) client.get(`/lecturer/courses/${courseId}/materials`).then((res) => setMaterials(res.data));
    else setMaterials([]);
  }
  function loadResults(courseId) {
    if (courseId) client.get(`/lecturer/results?course_id=${courseId}`).then((res) => setResults(res.data));
    else setResults([]);
  }

  useEffect(() => {
    loadMaterials(selectedCourseId);
    loadResults(selectedCourseId);
  }, [selectedCourseId]);

  async function handleUploadMaterial(e) {
    e.preventDefault();
    if (!matFile) return flash("Choose a file first", true);
    try {
      const formData = new FormData();
      formData.append("course_id", selectedCourseId);
      formData.append("title", matTitle);
      formData.append("file", matFile);
      await client.post("/lecturer/materials", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMatTitle(""); setMatFile(null);
      loadMaterials(selectedCourseId);
      flash("Material uploaded");
    } catch (err) { flash(err.response?.data?.detail || "Upload failed", true); }
  }

  async function handleDeleteMaterial(id) {
    if (!window.confirm("Delete this material?")) return;
    try {
      await client.delete(`/lecturer/materials/${id}`);
      loadMaterials(selectedCourseId);
      flash("Material deleted");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const selectedCourse = courses.find((c) => String(c.course_id) === String(selectedCourseId));

  return (
    <div>
      <div className="nav">
        <strong>GenHub Lecturer</strong>
        <button className="secondary" style={{ width: "auto" }} onClick={handleLogout}>Log out</button>
      </div>
      <div className="container">
        {profile && <h2>Welcome, {profile.full_name}</h2>}
        {message && <div className="card" style={{ background: "#dcfce7" }}>{message}</div>}
        {error && <div className="card error">{error}</div>}

        <div className="card">
          <h3>My Courses</h3>
          {courses.length === 0 && <p>No courses have been assigned to you yet — contact your admin.</p>}
          <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
            <option value="">Select a course to manage</option>
            {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_title}</option>)}
          </select>
        </div>

        {selectedCourseId && (
          <>
            <div className="card">
              <h3>Materials — {selectedCourse?.course_code}</h3>
              <form onSubmit={handleUploadMaterial}>
                <input placeholder="Material title" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} required />
                <input type="file" onChange={(e) => setMatFile(e.target.files[0])} required />
                <button type="submit">Upload Material</button>
              </form>
              {materials.map((m) => (
                <div key={m.id} className="material-row">
                  <span>{m.title}</span>
                  <button className="danger" style={{ width: "auto" }} onClick={() => handleDeleteMaterial(m.id)}>Delete</button>
                </div>
              ))}
              {materials.length === 0 && <p>No materials uploaded yet.</p>}
            </div>

            <ResultsEntry courseId={selectedCourseId} onSaved={() => loadResults(selectedCourseId)} flash={flash} />

            <div className="card">
              <h3>Results — {selectedCourse?.course_code}</h3>
              {results.length === 0 && <p>No results entered yet.</p>}
              {results.map((r) => (
                <div key={r.id} className="tt-row">
                  <span>{r.student_reg_number} — {r.student_name}</span>
                  <span>CA: {r.ca_score ?? "—"} / Exam: {r.exam_score ?? "—"}</span>
                  <span><strong>{r.total} ({r.grade})</strong></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultsEntry({ courseId, onSaved, flash }) {
  const [regNumber, setRegNumber] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [caScore, setCaScore] = useState("");
  const [examScore, setExamScore] = useState("");

  async function handleLookup() {
    setStudentId(""); setStudentName("");
    try {
      const res = await client.get(`/lecturer/students/lookup?reg_number=${encodeURIComponent(regNumber)}`);
      setStudentId(res.data.id);
      setStudentName(res.data.full_name);
    } catch (err) {
      flash(err.response?.data?.detail || "Student not found", true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await client.post("/lecturer/results", {
        student_id: Number(studentId),
        course_id: Number(courseId),
        ca_score: caScore ? Number(caScore) : null,
        exam_score: examScore ? Number(examScore) : null,
      });
      setRegNumber(""); setStudentId(""); setStudentName(""); setCaScore(""); setExamScore("");
      onSaved();
      flash("Result saved");
    } catch (err) {
      flash(err.response?.data?.detail || "Failed to save result", true);
    }
  }

  return (
    <div className="card">
      <h3>Enter a Result</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Student reg number e.g. 24/SCIT/SEN/045" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
        <button style={{ width: "auto" }} onClick={handleLookup} disabled={!regNumber}>Find</button>
      </div>
      {studentName && (
        <>
          <div className="card" style={{ background: "#eef2ff" }}>Found: <strong>{studentName}</strong></div>
          <form onSubmit={handleSubmit}>
            <input type="number" placeholder="CA score" value={caScore} onChange={(e) => setCaScore(e.target.value)} />
            <input type="number" placeholder="Exam score" value={examScore} onChange={(e) => setExamScore(e.target.value)} />
            <button type="submit">Save Result</button>
          </form>
        </>
      )}
    </div>
  );
}
