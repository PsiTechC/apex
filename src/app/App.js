import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<DashboardLayout />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}
