import { useEffect, useState } from "react";
import { Menu, Bell, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of your jewellery business" },
  "/customers": { title: "Customers", subtitle: "Manage customer information and billing history" },
  "/billing": { title: "Billing", subtitle: "Create invoices and manage bills" },
  "/billing/invoices": { title: "Invoice History", subtitle: "View and reprint previously generated invoices" },
  "/settings": { title: "Settings", subtitle: "Manage your shop settings" },
  "/users": { title: "Team", subtitle: "Manage your shop's team members" },
  "/inventory": { title: "Inventory", subtitle: "Manage your jewellery inventory" },
  "/reports": { title: "Reports", subtitle: "View business reports and analytics" },
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [shopName, setShopName] = useState<string | null>(null);

  const page = PAGE_TITLES[location.pathname] ?? { title: "Dashboard", subtitle: "" };

  useEffect(() => {
    if (!profile?.shop_id) return;

    supabase
      .from("shops")
      .select("name")
      .eq("id", profile.shop_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setShopName(data.name);
      });
  }, [profile?.shop_id]);

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <header className="flex h-20 items-center justify-between border-b border-[#E4E4E7] bg-white px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5] lg:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="hidden lg:block">
        <h1 className="text-lg font-semibold text-[#18181B]">
          {page.title}
        </h1>

        {page.subtitle && (
          <p className="text-sm text-[#71717A]">
            {page.subtitle}
          </p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        {shopName && (
          <div className="hidden items-center gap-2 rounded-lg border border-[#E8DFD0] bg-[#FAF7F2] px-3 py-1.5 sm:flex">
            <span className="text-sm">&#128142;</span>
            <span className="text-sm font-semibold tracking-wide text-[#B08D57]">
              {shopName}
            </span>
          </div>
        )}

        <button className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5]">
          <Bell size={20} />
        </button>

        <div className="hidden h-8 w-px bg-[#E4E4E7] sm:block" />

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-[#18181B]">
            {profile?.full_name || "User"}
          </p>

          <div className="mt-0.5 flex items-center justify-end gap-2">
            <p className="text-xs text-[#71717A]">
              {user?.email}
            </p>

            {profile?.role && (
              <span className="inline-flex rounded-full bg-[#F5EFE6] px-2 py-0.5 text-[10px] font-medium text-[#B08D57]">
                {profile.role}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#A33A3A]"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}