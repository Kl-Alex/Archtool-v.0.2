import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import RegistryPage from "./pages/RegistryPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import ApplicationsRegistryPage from "./pages/ApplicationsRegistryPage"; // ⬅️ добавили
import ApplicationPassport from "./pages/ApplicationPassport";
import GraphEditor from "@/grapheditor/pages/GraphEditor";
import DiagramsList from "./grapheditor/components/DiagramsList";
import TechnologyPassportPage from "./pages/TechnologyPassportPage";
import PlatformPassportPage from "./pages/PlatformPassportPage";
import PlatformsRegistryPage from "./pages/PlatformsRegistryPage";
import TechnologiesRegistryPage from "./pages/TechnologiesRegistryPage";
import AppCapabilitiesRegistryPage from "./pages/AppCapabilitiesRegistryPage";
import AppCapabilityPassportPage from "./pages/AppCapabilityPassportPage";

import { NotificationProvider } from "./components/NotificationContext";

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/registry" element={
            <ProtectedRoute>
              <RegistryPage />
            </ProtectedRoute>
          } />

          <Route path="/applications" element={  // ⬅️ добавили
            <ProtectedRoute>
              <ApplicationsRegistryPage />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/registry" />} />

          <Route path="/applications/:id" element={<ApplicationPassport />} />
          <Route path="/graph" element={<GraphEditor />} />
          <Route path="/grapheditor/diagrams" element={<DiagramsList />} />
          <Route path="/graph/:id" element={<GraphEditor />} />
          <Route path="/platforms" element={<PlatformsRegistryPage />} />
          <Route path="/technologies" element={<TechnologiesRegistryPage />} />
          <Route path="/technologies/:id" element={<TechnologyPassportPage />} /> {/* если нужна карточка */}
          <Route path="/platforms/:id" element={<PlatformPassportPage />} />
          <Route path="/app-capabilities" element={<AppCapabilitiesRegistryPage />} />
          <Route path="/app-capabilities/:id" element={<AppCapabilityPassportPage />} />

        </Routes>

      </Router>
    </NotificationProvider>
  );
}

export default App;
