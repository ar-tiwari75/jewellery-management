import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "./contexts/AuthContext";
import Login from "./features/auth/Login";
import Dashboard from "./features/dashboard/Dashboard";
import AppLayout from "./components/layout/AppLayout";
import Billing from "./features/billing/Billing";
import Customers from "./customers/Customers";
import Settings from "./features/settings/Settings";
import InvoicePreview from "./features/billing/InvoicePreview";
import InvoiceHistory from "./features/billing/InvoiceHistory";
import UserManagement from "./features/users/UserManagement";
import SetPassword from "./features/auth/SetPassword";
import Reports from "./features/reports/Reports";
import Inventory from "./features/inventory/Inventory";

function RequireRole({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { profile } = useAuth();
  if (!allowedRoles.includes(profile?.role ?? "")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-sm text-[#71717A]">
          Loading...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (location.pathname === "/set-password") {
    return <SetPassword />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/customers"
          element={
            <RequireRole allowedRoles={["ADMIN", "MANAGER", "STAFF"]}>
              <Customers />
            </RequireRole>
          }
        />

        <Route
          path="/inventory"
          element={
            <RequireRole allowedRoles={["ADMIN", "MANAGER", "STAFF"]}>
              <Inventory />
            </RequireRole>
          }
        />

        <Route
          path="/billing"
          element={
            <RequireRole allowedRoles={["ADMIN", "MANAGER", "STAFF"]}>
              <Billing />
            </RequireRole>
          }
        />

        <Route
          path="/reports"
          element={
            <RequireRole allowedRoles={["ADMIN", "MANAGER"]}>
              <Reports />
            </RequireRole>
          }
        />

        <Route
            path="/settings"
            element={
              <RequireRole allowedRoles={["ADMIN"]}>
                <Settings />
              </RequireRole>
            }
        />
        <Route
          path="/users"
          element={
            <RequireRole allowedRoles={["ADMIN"]}>
              <UserManagement />
            </RequireRole>
          }
        />

        <Route
            path="/billing/invoice/:invoiceId"
            element={
              <RequireRole allowedRoles={["ADMIN", "MANAGER", "STAFF"]}>
                <InvoicePreview />
              </RequireRole>
            }
        />
        <Route
          path="/billing/invoices"
          element={
            <RequireRole allowedRoles={["ADMIN", "MANAGER", "STAFF"]}>
              <InvoiceHistory />
            </RequireRole>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </AppLayout>
  );
}

export default App;
