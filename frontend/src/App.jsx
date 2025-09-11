import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import BusinessCapabilityRegistryPage from "./pages/BusinessCapabilityRegistryPage";
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
import InitiativesRegistryPage from "./pages/InitiativesRegistryPage";
import InitiativePassportPage from "./pages/InitiativePassportPage";
import BusinessCapabilityPassportPage from "./pages/BusinessCapabilityPassportPage";

import { NotificationProvider } from "./components/NotificationContext";

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/business-capabilities" element={
            <ProtectedRoute>
              <BusinessCapabilityRegistryPage />
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

          <Route path="*" element={<Navigate to="/business-capabilities" />} />

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
          <Route path="/initiatives" element={<InitiativesRegistryPage />} />
          <Route path="/initiatives/:id" element={<InitiativePassportPage />} />
          <Route path="/capabilities/:id" element={<BusinessCapabilityPassportPage />} />


        </Routes>

      </Router>
    </NotificationProvider>
  );
}

export default App;
