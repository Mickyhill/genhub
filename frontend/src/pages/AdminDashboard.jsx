import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tabs from "./Tabs";
import AdminCommunity from "./AdminCommunity";
import Tiles from "./Tiles";
import Footer from "./Footer";
import AdminGallery from "./AdminGallery";
import RepsAdmin from "./RepsAdmin";
import HeroSlides from "./HeroSlides";
import PasswordInput from "./PasswordInput";
import RosterManager from "./RosterManager";
import { StepHead, Empty } from "./StepUi";
import client, { clearSession } from "../api/client";


const MINI = { width: "auto" };

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
    <div className={"material-row item" + (isSelected ? " on" : "")}>
      <span
        className="item-main"
        onClick={() => onSelect && onSelect(item.id)}
        style={{ cursor: onSelect ? "pointer" : "default" }}
      >
        <b className="pill">{item[labelKey]}</b>
        {isSelected && <em className="sel-tag">Selected</em>}
      </span>
      <div className="item-actions">
        <button className="mini" style={MINI} onClick={() => setEditing(true)}>✎ Edit</button>
        <button className="mini danger" style={MINI} onClick={() => onDelete(item.id)}>🗑</button>
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
    <div className={"material-row item" + (isSelected ? " on" : "")}>
      <span
        className="item-main"
        onClick={() => onSelect && onSelect(item.id)}
        style={{ cursor: onSelect ? "pointer" : "default" }}
      >
        <b className="code-pill">{item.code}</b>
        <span className="item-name">{item.name}</span>
        {isSelected && <em className="sel-tag">Selected</em>}
      </span>
      <div className="item-actions">
        <button className="mini" style={MINI} onClick={() => setEditing(true)}>✎ Edit</button>
        <button className="mini danger" style={MINI} onClick={() => onDelete(item.id)}>🗑</button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [section, setSection] = useState("manage");
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

  // Analytics
  const [analytics, setAnalytics] = useState(null);

  // Lecturer management
  const [lecturers, setLecturers] = useState([]);
  const [newLecturerUsername, setNewLecturerUsername] = useState("");
  const [newLecturerName, setNewLecturerName] = useState("");
  const [newLecturerPassword, setNewLecturerPassword] = useState("");
  const [selectedLecturerId, setSelectedLecturerId] = useState("");
  const [lecturerAssignedCourses, setLecturerAssignedCourses] = useState([]);
  const [courseToAssign, setCourseToAssign] = useState("");

  function flash(msg, isError = false) {
    if (isError) setError(msg); else setMessage(msg);
    setTimeout(() => { setMessage(""); setError(""); }, 3000);
  }

  function loadFaculties() {
    client.get("/browse/faculties").then((res) => setFaculties(res.data));
  }
  useEffect(loadFaculties, []);

  useEffect(() => {
    client.get("/admin/analytics/overview").then((res) => setAnalytics(res.data));
    client.get("/admin/lecturers").then((res) => setLecturers(res.data));
  }, []);

  function loadLecturerCourses(lecturerId) {
    if (lecturerId) client.get(`/admin/lecturers/${lecturerId}/courses`).then((res) => setLecturerAssignedCourses(res.data));
    else setLecturerAssignedCourses([]);
  }
  useEffect(() => { loadLecturerCourses(selectedLecturerId); }, [selectedLecturerId]);

  async function handleCreateLecturer(e) {
    e.preventDefault();
    try {
      await client.post("/admin/lecturers", {
        username: newLecturerUsername, full_name: newLecturerName, password: newLecturerPassword,
      });
      setNewLecturerUsername(""); setNewLecturerName(""); setNewLecturerPassword("");
      client.get("/admin/lecturers").then((res) => setLecturers(res.data));
      flash("Lecturer account created");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleDeleteLecturer(id) {
    if (!window.confirm("Remove this lecturer account?")) return;
    try {
      await client.delete(`/admin/lecturers/${id}`);
      if (String(id) === String(selectedLecturerId)) setSelectedLecturerId("");
      client.get("/admin/lecturers").then((res) => setLecturers(res.data));
      flash("Lecturer removed");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleToggleLecturer(l) {
    try {
      await client.patch(`/admin/lecturers/${l.id}/active`, { is_active: !l.is_active });
      client.get("/admin/lecturers").then((res) => setLecturers(res.data));
      flash(l.is_active ? "Lecturer suspended" : "Lecturer reactivated");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleResetLecturer(l) {
    const pw = window.prompt(`Type a temporary password for ${l.full_name} (6 or more characters). They must change it at next login.`);
    if (!pw) return;
    try {
      await client.post(`/admin/lecturers/${l.id}/reset-password`, { password: pw });
      client.get("/admin/lecturers").then((res) => setLecturers(res.data));
      flash("Temporary password set");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleAssignCourse(e) {
    e.preventDefault();
    try {
      await client.post(`/admin/lecturers/${selectedLecturerId}/courses`, { course_id: Number(courseToAssign) });
      setCourseToAssign("");
      loadLecturerCourses(selectedLecturerId);
      flash("Course assigned");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }
  async function handleUnassignCourse(assignmentId) {
    try {
      await client.delete(`/admin/lecturers/${selectedLecturerId}/courses/${assignmentId}`);
      loadLecturerCourses(selectedLecturerId);
      flash("Unassigned");
    } catch (err) { flash(err.response?.data?.detail || "Failed", true); }
  }

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

  function jump(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <HeroSlides>
          <h1>Admin control room</h1>
          <p>Manage faculties, timetables, students and the community.</p>

      </HeroSlides>
      <div className="container pull-up">
        {message && <div className="card" style={{ background: "#dcfce7" }}>{message}</div>}
        {error && <div className="card error">{error}</div>}
        <Tabs active={section} onChange={setSection} tabs={[["manage", "Manage"], ["community", "Community"], ["reps", "Reps and codes"], ["pride", "FUTIA, our pride"]]} />
        {section === "community" && <AdminCommunity />}
        {section === "reps" && <RepsAdmin />}
        {section === "pride" && <AdminGallery />}
        {section === "manage" && (<>

        {analytics && (
          <>
            <div className="stats">
              <div className="stat">👨‍🎓<b>{analytics.total_students}</b><span>Students</span></div>
              <div className="stat">🏫<b>{analytics.total_faculties}</b><span>Faculties</span></div>
              <div className="stat">🏛<b>{analytics.total_departments}</b><span>Departments</span></div>
              <div className="stat">📚<b>{analytics.total_courses}</b><span>Courses</span></div>
              <div className="stat">📄<b>{analytics.total_materials}</b><span>Materials</span></div>
              <div className="stat">👩‍🏫<b>{analytics.total_lecturers}</b><span>Lecturers</span></div>
            </div>
            {analytics.departments_missing_reg_ranges.length > 0 && (
              <div className="card error">
                ⚠️ These departments have no registration range set. Students cannot register into them yet:{" "}
                {analytics.departments_missing_reg_ranges.join(", ")}
              </div>
            )}
          </>
        )}

        <Tiles items={[
          { label: "Lecturers", sub: "Create and assign courses, upload materials and enter results", pic: "/img/tile-lecturers.jpg", onClick: () => jump("lecturers") },
          { label: "Password reset", sub: "Help a student recover their account", pic: "/img/tile-password.jpg", onClick: () => jump("reset") },
          { label: "Academic setup", sub: "Faculties to materials", pic: "/img/tile-academic.jpg", onClick: () => jump("hierarchy") },
          { label: "Community", sub: "News, forum, inbox", pic: "/img/tile-community.jpg", onClick: () => { setSection("community"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
        ]} />

        <div className="masonry">
        <div className="card step" id="lecturers">
          <StepHead icon="👩‍🏫" title="Lecturers" sub="Create accounts and give each lecturer their courses." />
          <form onSubmit={handleCreateLecturer}>
            <input placeholder="Username" value={newLecturerUsername} onChange={(e) => setNewLecturerUsername(e.target.value)} required />
            <input placeholder="Full name" value={newLecturerName} onChange={(e) => setNewLecturerName(e.target.value)} required />
            <PasswordInput placeholder="Password" value={newLecturerPassword} onChange={(e) => setNewLecturerPassword(e.target.value)} required />
            <button type="submit">Create Lecturer Account</button>
          </form>
          {lecturers.map((l) => (
            <div key={l.id} className="lecturer-row">
              <span
                onClick={() => setSelectedLecturerId(String(l.id))}
                style={{ cursor: "pointer", fontWeight: String(l.id) === String(selectedLecturerId) ? 700 : 400 }}
              >
                {String(l.id) === String(selectedLecturerId) ? "▶ " : ""}{l.full_name} ({l.username})
                {!l.is_active && <span className="badge">Suspended</span>}
                {l.is_active && l.must_change_password && <span className="badge warn">Temp password</span>}
              </span>
              <span className="row-actions">
                <button className="small secondary-dark" onClick={() => handleToggleLecturer(l)}>{l.is_active ? "Suspend" : "Reactivate"}</button>
                <button className="small secondary-dark" onClick={() => handleResetLecturer(l)}>Reset password</button>
                <button className="small danger" onClick={() => handleDeleteLecturer(l.id)}>Remove</button>
              </span>
            </div>
          ))}
          {lecturers.length === 0 && <p>No lecturers yet — create one above.</p>}

          {selectedLecturerId && (
            <div className="card" style={{ background: "#f9fafb" }}>
              <h4>Assign courses</h4>
              <p style={{ fontSize: 13, color: "#666" }}>
                Only courses from the currently drilled-down semester below are shown here — navigate to the
                right Faculty → Department → Level → Semester first if the course you want isn't listed.
              </p>
              <form onSubmit={handleAssignCourse}>
                <select value={courseToAssign} onChange={(e) => setCourseToAssign(e.target.value)} required>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
                <button type="submit">Assign</button>
              </form>
              {lecturerAssignedCourses.map((a) => (
                <div key={a.id} className="material-row">
                  <span>{a.course_code} — {a.course_title}</span>
                  <button className="danger" style={{ width: "auto" }} onClick={() => handleUnassignCourse(a.id)}>Unassign</button>
                </div>
              ))}
              {lecturerAssignedCourses.length === 0 && <p>No courses assigned yet.</p>}
            </div>
          )}
        </div>

        <div className="card step" id="reset">
          <StepHead icon="🔑" title="Student Password Reset" />
          <p className="step-note" style={{ marginTop: 0, marginBottom: 12 }}>
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
                <PasswordInput placeholder="New password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required />
                <button type="submit">Set New Password</button>
              </form>
            </>
          )}
        </div>

        <div className="card step" id="hierarchy">
          <StepHead n="1" title="Faculty / School" sub="The big group a department belongs to. Start here." />
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
          {faculties.length === 0 && <Empty icon="🏛️">No faculties yet. Add the first one above.</Empty>}
          <p className="step-note">Tap a faculty to select it. Its departments open below.</p>
        </div>

        {facultyId && (
          <div className="card step">
            <StepHead n="2" title="Department" sub="Departments inside the selected faculty." />
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
            {departments.length === 0 && <Empty icon="🎓">No departments yet. Add one above.</Empty>}
          </div>
        )}

        {departmentId && (
          <div className="card step">
            <StepHead icon="🔢" title={`Registration Number Ranges — ${selectedDepartment?.name || ""}`} />
            <p className="step-note">
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
              <div key={r.id} className="material-row item">
                <span className="item-main"><b className="code-pill">{r.start_number} – {r.end_number}</b>{r.label && <span className="item-name">{r.label}</span>}</span>
                <button className="mini danger" style={MINI} onClick={() => handleDeleteRange(r.id)}>🗑</button>
              </div>
            ))}
            {regRanges.length === 0 && <Empty icon="⚠️">No range set. Students cannot register into this department yet.</Empty>}
          </div>
        )}

        {departmentId && <RosterManager base="/admin/roster" departmentId={departmentId} deptName={selectedDepartment?.name} />}

        {departmentId && (
          <div className="card step">
            <StepHead n="3" title="Level" sub="100, 200, 300 and so on." />
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
            {levels.length === 0 && <Empty icon="📶">No levels yet. Add one above.</Empty>}
          </div>
        )}

        {levelId && (
          <div className="card step">
            <StepHead n="4" title="Semester" sub="First or Second, inside the selected level." />
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
            {semesters.length === 0 && <Empty icon="🗓️">No semesters yet. Add one above.</Empty>}
          </div>
        )}

        {semesterId && (
          <>
            <div className="card step">
              <StepHead n="5" title="Courses" sub="Code and title. Add the unit at the end, like: Intro to Programming, 3 Unit" />
              <form onSubmit={handleCreateCourse}>
                <input placeholder="Course code e.g. MTH 101" value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)} required />
                <input placeholder="Course title" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} required />
                <button type="submit">Add Course</button>
              </form>
              {courses.map((c) => (
                <div key={c.id} className="material-row item">
                  <span className="item-main"><b className="code-pill">{c.code}</b><span className="item-name">{c.title}</span></span>
                  <button className="mini danger" style={MINI} onClick={() => handleDeleteCourse(c.id)}>🗑</button>
                </div>
              ))}
              {courses.length === 0 && <Empty icon="📚">No courses yet. Add one above.</Empty>}
            </div>

            <div className="card step">
              <StepHead n="6" title="Timetable" sub="When and where each course holds." />
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
                <div key={t.id} className="material-row item">
                  <span className="item-main"><b className="day-pill">{t.day_of_week.slice(0, 3)}</b><span className="item-name"><strong>{t.course_code}</strong> · {t.start_time}–{t.end_time} · {t.venue || "No venue"}</span></span>
                  <button className="mini danger" style={MINI} onClick={() => handleDeleteTimetable(t.id)}>🗑</button>
                </div>
              ))}
              {timetable.length === 0 && <Empty icon="⏰">No timetable entries yet.</Empty>}
            </div>

            <div className="card step">
              <StepHead n="7" title="Course Materials" sub="Upload slides, notes and past questions. Students download them." />
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
        </>)}
      </div>
      <Footer />
    </div>
  );
}