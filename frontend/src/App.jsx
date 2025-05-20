import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import RegistryPage from "./pages/RegistryPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage"; // добавим после

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/registry" element={
          <ProtectedRoute>
            <RegistryPage />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/registry" />} />
      </Routes>
    </Router>
  );
}

export default App;
