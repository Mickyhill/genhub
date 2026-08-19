import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import client, { clearSession } from "../api/client";

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/student/me").then((res) => setProfile(res.data));
    client.get("/student/courses").then((res) => setCourses(res.data));
    client.get("/student/timetable").then((res) => setTimetable(res.data));
  }, []);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sortedTimetable = [...timetable].sort(
    (a, b) => days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week) || a.start_time.localeCompare(b.start_time)
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
          <h3>My Courses</h3>
          {courses.length === 0 && <p>No courses found for your semester yet.</p>}
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
          <h3>My Timetable</h3>
          {sortedTimetable.length === 0 && <p>No timetable entries yet.</p>}
          {sortedTimetable.map((t) => (
            <div key={t.id} className="tt-row">
              <span><strong>{t.day_of_week}</strong> {t.start_time}–{t.end_time}</span>
              <span>{t.course_code}</span>
              <span>{t.venue || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
