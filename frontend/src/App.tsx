import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { api, clearToken, getToken, type Role, type User } from "./api";
import { AuthContext } from "./auth";
import { LoadingBlock } from "./components/ui";
import ConsoleLayout from "./layouts/ConsoleLayout";
import StorefrontLayout from "./layouts/StorefrontLayout";
import NotificationsPage from "./pages/NotificationsPage";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminRates from "./pages/admin/AdminRates";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminVendors from "./pages/admin/AdminVendors";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AgentTab from "./pages/customer/AgentTab";
import AuditTab from "./pages/customer/AuditTab";
import BoqTab from "./pages/customer/BoqTab";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import DocumentsTab from "./pages/customer/DocumentsTab";
import ProjectWorkspace from "./pages/customer/ProjectWorkspace";
import ProjectsPage from "./pages/customer/ProjectsPage";
import RfqsTab from "./pages/customer/RfqsTab";
import VerificationTab from "./pages/customer/VerificationTab";
import MarketplaceHome from "./pages/market/MarketplaceHome";
import VendorDirectory from "./pages/market/VendorDirectory";
import VendorStorefront from "./pages/market/VendorStorefront";
import RfqDetailPage from "./pages/rfq/RfqDetailPage";
import VendorCatalog from "./pages/vendor/VendorCatalog";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorGate from "./pages/vendor/VendorGate";
import VendorProfile from "./pages/vendor/VendorProfile";
import VendorQuotations from "./pages/vendor/VendorQuotations";
import VendorRfqs from "./pages/vendor/VendorRfqs";
import { homeFor } from "./roles";

function RequireRole({ user, ready, roles }: { user: User | null; ready: boolean; roles: Role[] }): ReactNode {
  const location = useLocation();
  if (!ready) return <LoadingBlock />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

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

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    qc.clear();
  }, [qc]);

  const guard = (roles: Role[]) => <RequireRole user={user} ready={ready} roles={roles} />;

  return (
    <AuthContext.Provider value={{ user, setUser, ready, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Register />} />

        {/* Public storefront */}
        <Route element={<StorefrontLayout />}>
          <Route path="/marketplace" element={<MarketplaceHome />} />
          <Route path="/marketplace/vendors" element={<VendorDirectory />} />
          <Route path="/marketplace/vendors/:vendorId" element={<VendorStorefront />} />
        </Route>

        {/* Authenticated console (shared shell for every role) */}
        <Route element={guard(["admin", "customer", "vendor"])}>
          <Route element={<ConsoleLayout />}>
            <Route path="/notifications" element={<NotificationsPage />} />

            <Route element={guard(["admin"])}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/vendors" element={<AdminVendors />} />
              <Route path="/admin/projects" element={<AdminProjects />} />
              <Route path="/admin/rates" element={<AdminRates />} />
              <Route path="/admin/audit" element={<AdminAudit />} />
            </Route>

            <Route element={guard(["customer", "admin"])}>
              <Route path="/dashboard" element={<CustomerDashboard />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectWorkspace />}>
                <Route index element={<DocumentsTab />} />
                <Route path="boq" element={<BoqTab />} />
                <Route path="verification" element={<VerificationTab />} />
                <Route path="rfqs" element={<RfqsTab />} />
                <Route path="agent" element={<AgentTab />} />
                <Route path="audit" element={<AuditTab />} />
              </Route>
              <Route path="/projects/:projectId/rfqs/:rfqId" element={<RfqDetailPage />} />
            </Route>

            <Route element={guard(["vendor"])}>
              <Route element={<VendorGate />}>
                <Route path="/vendor" element={<VendorDashboard />} />
                <Route path="/vendor/catalog" element={<VendorCatalog />} />
                <Route path="/vendor/rfqs" element={<VendorRfqs />} />
                <Route path="/vendor/rfqs/:rfqId" element={<RfqDetailPage />} />
                <Route path="/vendor/quotations" element={<VendorQuotations />} />
                <Route path="/vendor/profile" element={<VendorProfile />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ready && user ? homeFor(user.role) : "/marketplace"} replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
