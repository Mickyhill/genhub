import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getRole } from "./api/client";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import CourseMaterials from "./pages/CourseMaterials";
import AdminDashboard from "./pages/AdminDashboard";

function ProtectedRoute({ role, children }) {
  const actualRole = getRole();
  if (!actualRole) return <Navigate to="/login" replace />;
  if (role && actualRole !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:courseId/materials"
          element={
            <ProtectedRoute role="student">
              <CourseMaterials />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
