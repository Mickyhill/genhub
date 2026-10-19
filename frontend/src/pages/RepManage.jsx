import { useEffect, useState } from "react";
import client from "../api/client";
import { StepHead, Empty } from "./StepUi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const B = "/rep/manage";
const MINI = { width: "auto" };

// A class rep edits levels, semesters, courses, timetable and materials for their own department only.
export default function RepManage() {
  const [dept, setDept] = useState(null);
  const [levels, setLevels] = useState([]);
  const [levelId, setLevelId] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState("");
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [newLevel, setNewLevel] = useState("");
  const [newSem, setNewSem] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [tt, setTt] = useState({ course_id: "", day_of_week: "Monday", start_time: "08:00", end_time: "10:00", venue: "" });
  const [mat, setMat] = useState({ course_id: "", title: "", file: null });
  const [matList, setMatList] = useState([]);

  const say = (m) => { setMsg(m); setErr(""); setTimeout(() => setMsg(""), 3500); };
  const fail = (e, d) => { setErr(e.response?.data?.detail || d); setMsg(""); };

  const loadLevels = () => client.get(`${B}/levels`).then((r) => setLevels(r.data));
  const loadSems = (id = levelId) => id ? client.get(`${B}/semesters`, { params: { level_id: id } }).then((r) => setSemesters(r.data)) : setSemesters([]);
  const loadCourses = (id = semesterId) => id ? client.get(`${B}/courses`, { params: { semester_id: id } }).then((r) => setCourses(r.data)) : setCourses([]);
  const loadTt = (id = semesterId) => id ? client.get(`${B}/timetable`, { params: { semester_id: id } }).then((r) => setTimetable(r.data)) : setTimetable([]);
  const loadMats = (id = mat.course_id) => id ? client.get(`${B}/courses/${id}/materials`).then((r) => setMatList(r.data)) : setMatList([]);

  useEffect(() => { client.get(`${B}/department`).then((r) => setDept(r.data)); loadLevels(); }, []);
  useEffect(() => { setSemesterId(""); loadSems(levelId); }, [levelId]);
  useEffect(() => { setTimetable([]); setCourses([]); loadCourses(); loadTt(); setMat((m) => ({ ...m, course_id: "" })); setMatList([]); }, [semesterId]);
  useEffect(() => { loadMats(); }, [mat.course_id]);

  async function run(fn, ok, bad) { try { await fn(); say(ok); } catch (e) { fail(e, bad); } }

  const addLevel = (e) => { e.preventDefault(); run(async () => { await client.post(`${B}/levels`, { name: newLevel }); setNewLevel(""); await loadLevels(); }, "Level added", "Could not add the level"); };
  const addSem = (e) => { e.preventDefault(); run(async () => { await client.post(`${B}/semesters`, { name: newSem, level_id: Number(levelId) }); setNewSem(""); await loadSems(); }, "Semester added", "Could not add the semester"); };
  const delLevel = (id) => window.confirm("Delete this level with all its semesters, courses and files?") && run(async () => { await client.delete(`${B}/levels/${id}`); if (String(id) === String(levelId)) setLevelId(""); await loadLevels(); }, "Level deleted", "Could not delete");
  const delSem = (id) => window.confirm("Delete this semester with all its courses and files?") && run(async () => { await client.delete(`${B}/semesters/${id}`); if (String(id) === String(semesterId)) setSemesterId(""); await loadSems(); }, "Semester deleted", "Could not delete");
  const addCourse = (e) => { e.preventDefault(); run(async () => { await client.post(`${B}/courses`, { code, title, semester_id: Number(semesterId) }); setCode(""); setTitle(""); await loadCourses(); }, "Course added", "Could not add the course"); };
  const delCourse = (id) => window.confirm("Delete this course with its timetable and files?") && run(async () => { await client.delete(`${B}/courses/${id}`); await Promise.all([loadCourses(), loadTt()]); }, "Course deleted", "Could not delete");
  const addTt = (e) => { e.preventDefault(); run(async () => { await client.post(`${B}/timetable`, { ...tt, course_id: Number(tt.course_id), semester_id: Number(semesterId) }); setTt({ ...tt, venue: "" }); await loadTt(); }, "Added to the timetable", "Could not add"); };
  const delTt = (id) => run(async () => { await client.delete(`${B}/timetable/${id}`); await loadTt(); }, "Removed", "Could not remove");
  const upMat = (e) => {
    e.preventDefault();
    if (!mat.file) return fail({}, "Choose a file first");
    run(async () => {
      const fd = new FormData();
      fd.append("course_id", mat.course_id); fd.append("title", mat.title); fd.append("file", mat.file);
      await client.post(`${B}/materials`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMat({ ...mat, title: "", file: null }); e.target.reset(); await loadMats();
    }, "File uploaded", "Upload failed");
  };
  const delMat = (id) => window.confirm("Delete this file?") && run(async () => { await client.delete(`${B}/materials/${id}`); await loadMats(); }, "File deleted", "Could not delete");

  const levelName = levels.find((l) => String(l.id) === String(levelId))?.name;

  return (
    <>
      <div className="card pick">
        <div className="pick-head">
          <span className="pick-ic">🛠️</span>
          <div>
            <h3>Manage {dept ? dept.name : "your department"}</h3>
            <p className="step-sub">You edit courses, timetable and files for your department only. Faculties and other departments are not in your hands.</p>
          </div>
        </div>
        {msg && <div className="notice">{msg}</div>}
        {err && <div className="error">{err}</div>}

        <div className="pick-label">Level</div>
        <div className="chip-row">
          {levels.map((l) => (
            <button key={l.id} type="button" className={"pick-chip" + (String(l.id) === String(levelId) ? " on" : "")} onClick={() => setLevelId(String(l.id))}>{l.name}</button>
          ))}
          {levels.length === 0 && <span className="muted">No level yet. Add one below.</span>}
        </div>
        <form className="chip-add" onSubmit={addLevel}>
          <input placeholder="New level e.g. 300" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} required />
          <button type="submit" className="mini" style={MINI}>Add level</button>
          {levelId && <button type="button" className="mini danger" style={MINI} onClick={() => delLevel(levelId)}>Delete {levelName}</button>}
        </form>

        {levelId && (
          <>
            <div className="pick-label">Semester</div>
            <div className="chip-row">
              {semesters.map((s) => (
                <button key={s.id} type="button" className={"pick-chip" + (String(s.id) === String(semesterId) ? " on" : "")} onClick={() => setSemesterId(String(s.id))}>{s.name}</button>
              ))}
              {semesters.length === 0 && <span className="muted">No semester yet. Add one below.</span>}
            </div>
            <form className="chip-add" onSubmit={addSem}>
              <input placeholder="New semester e.g. First" value={newSem} onChange={(e) => setNewSem(e.target.value)} required />
              <button type="submit" className="mini" style={MINI}>Add semester</button>
              {semesterId && <button type="button" className="mini danger" style={MINI} onClick={() => delSem(semesterId)}>Delete this semester</button>}
            </form>
          </>
        )}
      </div>

      {semesterId && (
        <>
          <div className="card step">
            <StepHead n="1" title="Courses" sub="Code and title. Add the unit at the end, like: Intro to Programming, 3 Unit" />
            <form onSubmit={addCourse}>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ flex: 1 }} placeholder="Code e.g. CSC 301" value={code} onChange={(e) => setCode(e.target.value)} required />
                <input style={{ flex: 2 }} placeholder="Course title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <button type="submit">Add course</button>
            </form>
            {courses.map((c) => (
              <div key={c.id} className="material-row item">
                <span className="item-main"><b className="code-pill">{c.code}</b><span className="item-name">{c.title}</span></span>
                <button className="mini danger" style={MINI} onClick={() => delCourse(c.id)} aria-label="Delete course">🗑</button>
              </div>
            ))}
            {courses.length === 0 && <Empty icon="📚">No courses yet. Add one above.</Empty>}
          </div>

          <div className="card step">
            <StepHead n="2" title="Timetable" sub="When and where each course holds." />
            <form onSubmit={addTt}>
              <select value={tt.course_id} onChange={(e) => setTt({ ...tt, course_id: e.target.value })} required>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
              <select value={tt.day_of_week} onChange={(e) => setTt({ ...tt, day_of_week: e.target.value })}>
                {DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="time" value={tt.start_time} onChange={(e) => setTt({ ...tt, start_time: e.target.value })} required />
                <input type="time" value={tt.end_time} onChange={(e) => setTt({ ...tt, end_time: e.target.value })} required />
              </div>
              <input placeholder="Venue e.g. SCIT 3 LW" value={tt.venue} onChange={(e) => setTt({ ...tt, venue: e.target.value })} />
              <button type="submit">Add timetable entry</button>
            </form>
            {timetable.map((t) => (
              <div key={t.id} className="material-row item">
                <span className="item-main"><b className="day-pill">{t.day_of_week.slice(0, 3)}</b>
                  <span className="item-name"><strong>{t.course_code}</strong> · {String(t.start_time).slice(0, 5)}–{String(t.end_time).slice(0, 5)} · {t.venue || "No venue"}</span></span>
                <button className="mini danger" style={MINI} onClick={() => delTt(t.id)} aria-label="Remove">🗑</button>
              </div>
            ))}
            {timetable.length === 0 && <Empty icon="⏰">No timetable entries yet.</Empty>}
          </div>

          <div className="card step">
            <StepHead n="3" title="Course files" sub="Slides, notes and past questions. Students in your department download them." />
            <form onSubmit={upMat}>
              <select value={mat.course_id} onChange={(e) => setMat({ ...mat, course_id: e.target.value })} required>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
              <input placeholder="Title e.g. Lecture 1 Slides" value={mat.title} onChange={(e) => setMat({ ...mat, title: e.target.value })} required />
              <input type="file" onChange={(e) => setMat({ ...mat, file: e.target.files[0] })} required />
              <button type="submit">Upload file</button>
            </form>
            {matList.map((m) => (
              <div key={m.id} className="material-row item">
                <span className="item-main"><b className="code-pill">FILE</b><span className="item-name">{m.title} <small className="muted">{m.original_filename}</small></span></span>
                <button className="mini danger" style={MINI} onClick={() => delMat(m.id)} aria-label="Delete file">🗑</button>
              </div>
            ))}
            {mat.course_id && matList.length === 0 && <Empty icon="📁">No files for this course yet.</Empty>}
          </div>
        </>
      )}
    </>
  );
}
