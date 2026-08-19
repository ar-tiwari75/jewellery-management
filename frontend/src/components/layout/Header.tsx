import { Menu, Bell, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const { user, profile, signOut } = useAuth();

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
          Dashboard
        </h1>

        <p className="text-sm text-[#71717A]">
          Overview of your jewellery business
        </p>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5]">
          <Bell size={20} />
        </button>

        <div className="hidden h-8 w-px bg-[#E4E4E7] sm:block" />

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-[#18181B]">
            {profile?.full_name || "User"}
          </p>

          <p className="text-xs text-[#71717A]">
            {user?.email}
          </p>
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