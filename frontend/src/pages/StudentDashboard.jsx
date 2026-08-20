import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import client, { clearSession } from "../api/client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [levelId, setLevelId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/student/me").then((res) => setProfile(res.data));
    client.get("/student/levels").then((res) => setLevels(res.data));
  }, []);

  useEffect(() => {
    setSemesterId("");
    setSemesters([]);
    setCourses([]);
    setTimetable([]);
    if (levelId) {
      client.get(`/student/semesters?level_id=${levelId}`).then((res) => setSemesters(res.data));
    }
  }, [levelId]);

  useEffect(() => {
    setCourses([]);
    setTimetable([]);
    if (semesterId) {
      client.get(`/student/courses?semester_id=${semesterId}`).then((res) => setCourses(res.data));
      client.get(`/student/timetable?semester_id=${semesterId}`).then((res) => setTimetable(res.data));
    }
  }, [semesterId]);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const sortedTimetable = [...timetable].sort(
    (a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week) || a.start_time.localeCompare(b.start_time)
  );

  return (
    <div>
      <div className="nav">
        <strong>GenHub</strong>
        <button className="secondary" style={{ width: "auto" }} onClick={handleLogout}>Log out</button>
      </div>
      <div className="container">
        {profile && <h2>Welcome, {profile.full_name}</h2>}

        <div className="card">
          <h3>Choose what to view</h3>
          <p style={{ fontSize: 13, color: "#666" }}>
            Pick a level and semester to see its courses, timetable, and materials.
            You can switch this anytime — nothing here is permanent.
          </p>
          <select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">Select Level</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} disabled={!levelId}>
            <option value="">Select Semester</option>
            {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {semesterId && (
          <>
            <div className="card">
              <h3>Courses</h3>
              {courses.length === 0 && <p>No courses found for this level/semester yet.</p>}
              {courses.map((c) => (
                <div key={c.id} className="material-row">
                  <span>{c.code} — {c.title}</span>
                  <Link to={`/student/courses/${c.id}/materials`}>
                    <button style={{ width: "auto" }}>Materials</button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="card">
              <h3>Timetable</h3>
              {sortedTimetable.length === 0 && <p>No timetable entries yet.</p>}
              {sortedTimetable.map((t) => (
                <div key={t.id} className="tt-row">
                  <span><strong>{t.day_of_week}</strong> {t.start_time}–{t.end_time}</span>
                  <span>{t.course_code}</span>
                  <span>{t.venue || "—"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
