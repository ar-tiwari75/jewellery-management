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
            <Customers />
          }
        />

        <Route
          path="/inventory"
          element={<Inventory />}
        />

        <Route
          path="/billing"
          element={
              <Billing />
          }
        />

        <Route
          path="/reports"
          element={<Reports />}
        />

        <Route
            path="/settings"
            element={<Settings />}
        />
        <Route
          path="/users"
          element={<UserManagement />}
        />

        <Route
            path="/billing/invoice/:invoiceId"
            element={<InvoicePreview />}
        />
        <Route
          path="/billing/invoices"
          element={<InvoiceHistory />}
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
