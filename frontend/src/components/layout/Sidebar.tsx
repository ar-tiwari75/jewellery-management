import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Gem,
  X,
  UserCog,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Customers",
    path: "/customers",
    icon: Users,
  },
  {
    name: "Inventory",
    path: "/inventory",
    icon: Package,
  },
  {
    name: "Billing",
    path: "/billing",
    icon: Receipt,
  },
  {
    name: "Invoice History",
    path: "/billing/invoices",
    icon: FileText,
  },
  {
    name: "Reports",
    path: "/reports",
    icon: BarChart3,
  },
];

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const { profile } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          bg-[#18181B] text-white
          transition-transform duration-200
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B08D57]">
              <Gem size={20} />
            </div>

            <div>
              <p className="text-sm font-semibold tracking-wide">
                JEWELLERY
              </p>

              <p className="text-xs text-zinc-400">
                Management
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Workspace
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
                    flex items-center gap-3 rounded-lg px-3 py-2.5
                    text-sm transition-colors
                    ${
                      isActive
                        ? "bg-[#B08D57] text-white"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }
                    `
                  }
                >
                  <Icon size={18} />

                  <span>
                    {item.name}
                  </span>
                </NavLink>
              );
            })}

            {profile?.role === "ADMIN" && (
              <NavLink
                to="/users"
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-[#B08D57] text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
              >
                <UserCog size={18} />
                <span>User Management</span>
              </NavLink>
            )}
          </div>
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `
              flex items-center gap-3 rounded-lg px-3 py-2.5
              text-sm
              ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }
              `
            }
          >
            <Settings size={18} />

            <span>
              Settings
            </span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
