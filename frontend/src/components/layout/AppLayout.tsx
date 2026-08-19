import type { ReactNode } from "react";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useSubscription } from "../../contexts/SubscriptionContext";

interface AppLayoutProps {
  children: ReactNode;
}

function ExpiryBanner() {
  const { subscription } = useSubscription();

  if (!subscription?.isExpired) {
    return null;
  }

  const expiryDisplay =
    subscription.expiryDate
      ? new Date(
          subscription.expiryDate,
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "unknown date";

  return (
    <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6">
      <AlertTriangle
        size={18}
        className="shrink-0 text-amber-600"
      />

      <p className="text-sm text-amber-800">
        Your subscription expired on{" "}
        {expiryDisplay}. Contact support to
        renew.
      </p>
    </div>
  );
}

export default function AppLayout({
  children,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FAFAF9]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
        />

        <ExpiryBanner />

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}