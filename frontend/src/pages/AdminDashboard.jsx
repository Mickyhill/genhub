import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client, { clearSession } from "../api/client";

// Row with just a name (used for Level, Semester).
function EditableRow({ item, labelKey, onSave, onDelete, isSelected, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item[labelKey]);

  async function handleSave() {
    await onSave(item.id, value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="material-row">
        <input style={{ marginBottom: 0, width: "auto", flex: 1 }} value={value} onChange={(e) => setValue(e.target.value)} />
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ width: "auto" }} onClick={handleSave}>Save</button>
          <button className="secondary" style={{ width: "auto" }} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="material-row">
      <span
        onClick={() => onSelect && onSelect(item.id)}
        style={{ cursor: onSelect ? "pointer" : "default", fontWeight: isSelected ? 700 : 400 }}
      >
        {isSelected ? "▶ " : ""}{item[labelKey]}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={{ width: "auto" }} onClick={() => setEditing(true)}>Edit</button>
        <button className="danger" style={{ width: "auto" }} onClick={() => onDelete(item.id)}>Delete</button>
      </div>
    </div>
  );
}

// Row with a name AND a code (used for Faculty, Department).
function EditableRowWithCode({ item, onSave, onDelete, isSelected, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [code, setCode] = useState(item.code);

  async function handleSave() {
    await onSave(item.id, name, code);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="material-row">
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          <input style={{ marginBottom: 0, flex: 2 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input style={{ marginBottom: 0, flex: 1 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ width: "auto" }} onClick={handleSave}>Save</button>
          <button className="secondary" style={{ width: "auto" }} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="material-row">
      <span
        onClick={() => onSelect && onSelect(item.id)}
        style={{ cursor: onSelect ? "pointer" : "default", fontWeight: isSelected ? 700 : 400 }}
      >
        {isSelected ? "▶ " : ""}{item.name} <small style={{ color: "#666" }}>({item.code})</small>
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={{ width: "auto" }} onClick={() => setEditing(true)}>Edit</button>
        <button className="danger" style={{ width: "auto" }} onClick={() => onDelete(item.id)}>Delete</button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [regRanges, setRegRanges] = useState([]);

  const [resetRegNumber, setResetRegNumber] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetFoundName, setResetFoundName] = useState("");

  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [semesterId, setSemesterId] = useState("");

  const [newFacultyName, setNewFacultyName] = useState("");
  const [newFacultyCode, setNewFacultyCode] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentCode, setNewDepartmentCode] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");

  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeLabel, setRangeLabel] = useState("");

  const [ttCourseId, setTtCourseId] = useState("");
  const [ttDay, setTtDay] = useState("Monday");
  const [ttStart, setTtStart] = useState("08:00");
  const [ttEnd, setTtEnd] = useState("10:00");
  const [ttVenue, setTtVenue] = useState("");
  const [timetable, setTimetable] = useState([]);

  const [matCourseId, setMatCourseId] = useState("");
  const [matTitle, setMatTitle] = useState("");
  const [matFile, setMatFile] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function flash(msg, isError = false) {
    if (isError) setError(msg); else setMessage(msg);
    setTimeout(() => { setMessage(""); setError(""); }, 3000);
  }

  function loadFaculties() {
    client.get("/browse/faculties").then((res) => setFaculties(res.data));
  }
  useEffect(loadFaculties, []);

  function loadDepartments(fId) {
    if (fId) client.get(`/browse/departments?faculty_id=${fId}`).then((res) => setDepartments(res.data));
    else setDepartments([]);
  }
  function loadLevels(dId) {
    if (dId) client.get(`/browse/levels?department_id=${dId}`).then((res) => setLevels(res.data));
    else setLevels([]);
  }
  function loadSemesters(lId) {
    if (lId) client.get(`/browse/semesters?level_id=${lId}`).then((res) => setSemesters(res.data));
    else setSemesters([]);
  }
  function loadCourses(sId) {
    if (sId) client.get(`/browse/courses?semester_id=${sId}`).then((res) => setCourses(res.data));
    else setCourses([]);
  }
  function loadTimetable(sId) {
    if (sId) client.get(`/admin/timetable?semester_id=${sId}`).then((res) => setTimetable(res.data));
    else setTimetable([]);
  }
  function loadRegRanges(dId) {
    if (dId) client.get(`/admin/reg-ranges?department_id=${dId}`).then((res) => setRegRanges(res.data));
    else setRegRanges([]);
  }

  useEffect(() => { setDepartmentId(""); loadDepartments(facultyId); }, [facultyId]);
  useEffect(() => { setLevelId(""); loadLevels(departmentId); loadRegRanges(departmentId); }, [departmentId]);
  useEffect(() => { setSemesterId(""); loadSemesters(levelId); }, [levelId]);
  useEffect(() => { loadCourses(semesterId); loadTimetable(semesterId); }, [semesterId]);

  // ── Faculty ───────────────────────────────────────────────────────
  async function handleCreateFaculty(e) {
    e.preventDefault();
    try {
      await client.post("/admin/faculties", { name: newFacultyName, code: newFacultyCode });
      setNewFacultyName(""); setNewFacultyCode("");
      loadFaculties();
      flash("Faculty created");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleSaveFaculty(id, name, code) {
    try {
      await client.put(`/admin/faculties/${id}`, { name, code });
      loadFaculties();
      flash("Faculty updated");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteFaculty(id) {
    if (!window.confirm("Delete this faculty? This also deletes every department, level, semester, course, timetable entry, and material under it.")) return;
    try {
      await client.delete(`/admin/faculties/${id}`);
      if (String(id) === String(facultyId)) setFacultyId("");
      loadFaculties();
      flash("Faculty deleted");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Department ────────────────────────────────────────────────────
  async function handleCreateDepartment(e) {
    e.preventDefault();
    try {
      await client.post("/admin/departments", { name: newDepartmentName, code: newDepartmentCode, faculty_id: Number(facultyId) });
      setNewDepartmentName(""); setNewDepartmentCode("");
      loadDepartments(facultyId);
      flash("Department created");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleSaveDepartment(id, name, code) {
    try {
      await client.put(`/admin/departments/${id}`, { name, code, faculty_id: Number(facultyId) });
      loadDepartments(facultyId);
      flash("Department updated");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteDepartment(id) {
    if (!window.confirm("Delete this department? This also deletes every level, semester, course, timetable entry, and material under it.")) return;
    try {
      await client.delete(`/admin/departments/${id}`);
      if (String(id) === String(departmentId)) setDepartmentId("");
      loadDepartments(facultyId);
      flash("Department deleted");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Level ─────────────────────────────────────────────────────────
  async function handleCreateLevel(e) {
    e.preventDefault();
    try {
      await client.post("/admin/levels", { name: newLevel, department_id: Number(departmentId) });
      setNewLevel("");
      loadLevels(departmentId);
      flash("Level created");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleSaveLevel(id, name) {
    try {
      await client.put(`/admin/levels/${id}`, { name, department_id: Number(departmentId) });
      loadLevels(departmentId);
      flash("Level updated");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteLevel(id) {
    if (!window.confirm("Delete this level? This also deletes every semester, course, timetable entry, and material under it.")) return;
    try {
      await client.delete(`/admin/levels/${id}`);
      if (String(id) === String(levelId)) setLevelId("");
      loadLevels(departmentId);
      flash("Level deleted");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Semester ──────────────────────────────────────────────────────
  async function handleCreateSemester(e) {
    e.preventDefault();
    try {
      await client.post("/admin/semesters", { name: newSemester, level_id: Number(levelId) });
      setNewSemester("");
      loadSemesters(levelId);
      flash("Semester created");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleSaveSemester(id, name) {
    try {
      await client.put(`/admin/semesters/${id}`, { name, level_id: Number(levelId) });
      loadSemesters(levelId);
      flash("Semester updated");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteSemester(id) {
    if (!window.confirm("Delete this semester? This also deletes every course, timetable entry, and material under it.")) return;
    try {
      await client.delete(`/admin/semesters/${id}`);
      if (String(id) === String(semesterId)) setSemesterId("");
      loadSemesters(levelId);
      flash("Semester deleted");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Course ────────────────────────────────────────────────────────
  async function handleCreateCourse(e) {
    e.preventDefault();
    try {
      await client.post("/admin/courses", { code: newCourseCode, title: newCourseTitle, semester_id: Number(semesterId) });
      setNewCourseCode(""); setNewCourseTitle("");
      loadCourses(semesterId);
      flash("Course created");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteCourse(id) {
    if (!window.confirm("Delete this course? This also deletes its timetable entries and materials.")) return;
    try {
      await client.delete(`/admin/courses/${id}`);
      loadCourses(semesterId);
      flash("Course deleted");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Password Reset ───────────────────────────────────────────────
  async function handleLookupStudent() {
    setResetFoundName("");
    try {
      const res = await client.get(`/admin/students/lookup?reg_number=${encodeURIComponent(resetRegNumber)}`);
      setResetFoundName(res.data.full_name);
    } catch (err) {
      flash(err.response?.data?.detail || "Student not found", true);
    }
  }
  async function handleResetPassword(e) {
    e.preventDefault();
    try {
      await client.post("/admin/students/reset-password", {
        reg_number: resetRegNumber,
        new_password: resetNewPassword,
      });
      setResetNewPassword("");
      flash("Password reset — tell the student their new password");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Registration Number Ranges ───────────────────────────────────
  async function handleCreateRange(e) {
    e.preventDefault();
    try {
      await client.post("/admin/reg-ranges", {
        department_id: Number(departmentId),
        start_number: Number(rangeStart),
        end_number: Number(rangeEnd),
        label: rangeLabel || null,
      });
      setRangeStart(""); setRangeEnd(""); setRangeLabel("");
      loadRegRanges(departmentId);
      flash("Registration range added");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteRange(id) {
    if (!window.confirm("Remove this registration number range? Students in this range will no longer be able to register.")) return;
    try {
      await client.delete(`/admin/reg-ranges/${id}`);
      loadRegRanges(departmentId);
      flash("Range removed");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Timetable ─────────────────────────────────────────────────────
  async function handleCreateTimetable(e) {
    e.preventDefault();
    try {
      await client.post("/admin/timetable", {
        course_id: Number(ttCourseId),
        semester_id: Number(semesterId),
        day_of_week: ttDay,
        start_time: ttStart,
        end_time: ttEnd,
        venue: ttVenue,
      });
      loadTimetable(semesterId);
      flash("Timetable entry added");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteTimetable(id) {
    if (!window.confirm("Remove this timetable entry?")) return;
    try {
      await client.delete(`/admin/timetable/${id}`);
      loadTimetable(semesterId);
      flash("Entry removed");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

  // ── Materials ─────────────────────────────────────────────────────
  async function handleUploadMaterial(e) {
    e.preventDefault();
    if (!matFile) return flash("Choose a file first", true);
    try {
      const formData = new FormData();
      formData.append("course_id", matCourseId);
      formData.append("title", matTitle);
      formData.append("file", matFile);
      await client.post("/admin/materials", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMatTitle(""); setMatFile(null);
      flash("Material uploaded");
    } catch (err) { flash(err.response?.data?.detail || "Upload failed", true); }
  }

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const selectedFaculty = faculties.find(f => String(f.id) === String(facultyId));
  const selectedDepartment = departments.find(d => String(d.id) === String(departmentId));

  return (
    <div>
      <div className="nav">
        <strong>GenHub Admin</strong>
        <button className="secondary" style={{ width: "auto" }} onClick={handleLogout}>Log out</button>
      </div>
      <div className="container">
        {message && <div className="card" style={{ background: "#dcfce7" }}>{message}</div>}
        {error && <div className="card error">{error}</div>}

        <div className="card">
          <h3>Student Password Reset</h3>
          <p style={{ fontSize: 13, color: "#666" }}>
            Look up a student by registration number, then set a new password for them directly.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Registration number e.g. 24/SCIT/SEN/045" value={resetRegNumber} onChange={(e) => setResetRegNumber(e.target.value)} />
            <button style={{ width: "auto" }} onClick={handleLookupStudent} disabled={!resetRegNumber}>Look up</button>
          </div>
          {resetFoundName && (
            <>
              <div className="card" style={{ background: "#eef2ff" }}>Found: <strong>{resetFoundName}</strong></div>
              <form onSubmit={handleResetPassword}>
                <input type="password" placeholder="New password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required />
                <button type="submit">Set New Password</button>
              </form>
            </>
          )}
        </div>

        <div className="card">
          <h3>1. Faculty / School</h3>
          <form onSubmit={handleCreateFaculty}>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ flex: 2 }} placeholder="Faculty name e.g. School of Computing & IT" value={newFacultyName} onChange={(e) => setNewFacultyName(e.target.value)} required />
              <input style={{ flex: 1 }} placeholder="Code e.g. SCIT" value={newFacultyCode} onChange={(e) => setNewFacultyCode(e.target.value)} required />
            </div>
            <button type="submit">Add Faculty</button>
          </form>
          {faculties.map((f) => (
            <EditableRowWithCode
              key={f.id} item={f}
              isSelected={String(f.id) === String(facultyId)}
              onSelect={(id) => setFacultyId(String(id))}
              onSave={handleSaveFaculty} onDelete={handleDeleteFaculty}
            />
          ))}
          {faculties.length === 0 && <p>No faculties yet — add one above.</p>}
          <p style={{ fontSize: 13, color: "#666" }}>Click a faculty name to select it and manage what's inside it below.</p>
        </div>

        {facultyId && (
          <div className="card">
            <h3>2. Department</h3>
            <form onSubmit={handleCreateDepartment}>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ flex: 2 }} placeholder="Department name e.g. Software Engineering" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} required />
                <input style={{ flex: 1 }} placeholder="Code e.g. SEN" value={newDepartmentCode} onChange={(e) => setNewDepartmentCode(e.target.value)} required />
              </div>
              <button type="submit">Add Department</button>
            </form>
            {departments.map((d) => (
              <EditableRowWithCode
                key={d.id} item={d}
                isSelected={String(d.id) === String(departmentId)}
                onSelect={(id) => setDepartmentId(String(id))}
                onSave={handleSaveDepartment} onDelete={handleDeleteDepartment}
              />
            ))}
            {departments.length === 0 && <p>No departments yet — add one above.</p>}
          </div>
        )}

        {departmentId && (
          <div className="card">
            <h3>Registration Number Ranges — {selectedDepartment?.name}</h3>
            <p style={{ fontSize: 13, color: "#666" }}>
              Students register using a number like <strong>24/{selectedFaculty?.code}/{selectedDepartment?.code}/045</strong>.
              Only numbers inside a range below are allowed to register. Add more than one range if you need to open extra slots later.
            </p>
            <form onSubmit={handleCreateRange}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" style={{ flex: 1 }} placeholder="Start e.g. 1" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} required />
                <input type="number" style={{ flex: 1 }} placeholder="End e.g. 90" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} required />
                <input style={{ flex: 2 }} placeholder="Label (optional) e.g. Regular intake" value={rangeLabel} onChange={(e) => setRangeLabel(e.target.value)} />
              </div>
              <button type="submit">Add Range</button>
            </form>
            {regRanges.map((r) => (
              <div key={r.id} className="material-row">
                <span>{r.start_number} – {r.end_number} {r.label ? `(${r.label})` : ""}</span>
                <button className="danger" style={{ width: "auto" }} onClick={() => handleDeleteRange(r.id)}>Delete</button>
              </div>
            ))}
            {regRanges.length === 0 && <p style={{ color: "#dc2626" }}>No range set — students cannot register into this department yet.</p>}
          </div>
        )}

        {departmentId && (
          <div className="card">
            <h3>3. Level</h3>
            <form onSubmit={handleCreateLevel}>
              <input placeholder="e.g. 100" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} required />
              <button type="submit">Add Level</button>
            </form>
            {levels.map((l) => (
              <EditableRow
                key={l.id} item={l} labelKey="name"
                isSelected={String(l.id) === String(levelId)}
                onSelect={(id) => setLevelId(String(id))}
                onSave={handleSaveLevel} onDelete={handleDeleteLevel}
              />
            ))}
            {levels.length === 0 && <p>No levels yet — add one above.</p>}
          </div>
        )}

        {levelId && (
          <div className="card">
            <h3>4. Semester</h3>
            <form onSubmit={handleCreateSemester}>
              <input placeholder="e.g. First" value={newSemester} onChange={(e) => setNewSemester(e.target.value)} required />
              <button type="submit">Add Semester</button>
            </form>
            {semesters.map((s) => (
              <EditableRow
                key={s.id} item={s} labelKey="name"
                isSelected={String(s.id) === String(semesterId)}
                onSelect={(id) => setSemesterId(String(id))}
                onSave={handleSaveSemester} onDelete={handleDeleteSemester}
              />
            ))}
            {semesters.length === 0 && <p>No semesters yet — add one above.</p>}
          </div>
        )}

        {semesterId && (
          <>
            <div className="card">
              <h3>5. Courses</h3>
              <form onSubmit={handleCreateCourse}>
                <input placeholder="Course code e.g. MTH 101" value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)} required />
                <input placeholder="Course title" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} required />
                <button type="submit">Add Course</button>
              </form>
              {courses.map((c) => (
                <div key={c.id} className="material-row">
                  <span>{c.code} — {c.title}</span>
                  <button className="danger" style={{ width: "auto" }} onClick={() => handleDeleteCourse(c.id)}>Delete</button>
                </div>
              ))}
              {courses.length === 0 && <p>No courses yet — add one above.</p>}
            </div>

            <div className="card">
              <h3>6. Timetable</h3>
              <form onSubmit={handleCreateTimetable}>
                <select value={ttCourseId} onChange={(e) => setTtCourseId(e.target.value)} required>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
                <select value={ttDay} onChange={(e) => setTtDay(e.target.value)}>
                  {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input type="time" value={ttStart} onChange={(e) => setTtStart(e.target.value)} required />
                <input type="time" value={ttEnd} onChange={(e) => setTtEnd(e.target.value)} required />
                <input placeholder="Venue" value={ttVenue} onChange={(e) => setTtVenue(e.target.value)} />
                <button type="submit">Add Timetable Entry</button>
              </form>
              {timetable.map((t) => (
                <div key={t.id} className="tt-row">
                  <span>{t.day_of_week} {t.start_time}–{t.end_time} — {t.course_code} @ {t.venue || "—"}</span>
                  <button className="danger" style={{ width: "auto" }} onClick={() => handleDeleteTimetable(t.id)}>Remove</button>
                </div>
              ))}
              {timetable.length === 0 && <p>No timetable entries yet.</p>}
            </div>

            <div className="card">
              <h3>7. Course Materials</h3>
              <form onSubmit={handleUploadMaterial}>
                <select value={matCourseId} onChange={(e) => setMatCourseId(e.target.value)} required>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
                <input placeholder="Material title e.g. Lecture 1 Slides" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} required />
                <input type="file" onChange={(e) => setMatFile(e.target.files[0])} required />
                <button type="submit">Upload Material</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
