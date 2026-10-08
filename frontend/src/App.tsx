import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, clearToken, getToken, User } from "./api";
import { AuthContext } from "./auth";
import Layout from "./components/Layout";
import AgentChat from "./pages/AgentChat";
import AuditPage from "./pages/AuditPage";
import BoqPage from "./pages/BoqPage";
import AdminPage from "./pages/AdminPage";
import Login from "./pages/Login";
import Marketplace from "./pages/Marketplace";
import ProjectDetail from "./pages/ProjectDetail";
import Projects from "./pages/Projects";
import Register from "./pages/Register";
import RfqPage from "./pages/RfqPage";
import VendorPortal from "./pages/VendorPortal";
import VerificationPage from "./pages/VerificationPage";
import { homeFor } from "./roles";

function Guard({ user, ready, children }: { user: User | null; ready: boolean; children: ReactNode }) {
  if (!ready) return <p className="p-8">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, ready }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          element={
            <Guard user={user} ready={ready}>
              <Layout />
            </Guard>
          }
        >
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/projects/:projectId/agent" element={<AgentChat />} />
          <Route path="/projects/:projectId/boq" element={<BoqPage />} />
          <Route path="/projects/:projectId/verification" element={<VerificationPage />} />
          <Route path="/projects/:projectId/rfqs" element={<RfqPage />} />
          <Route path="/projects/:projectId/audit" element={<AuditPage />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/vendor" element={<VendorPortal />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? homeFor(user.role) : "/login"} replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
