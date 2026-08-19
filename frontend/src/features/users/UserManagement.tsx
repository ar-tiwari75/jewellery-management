import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import {
  createShopUser,
  getShopUsers,
  type CreateShopUserInput,
  type ShopUser,
} from "./user.service";

const EMPTY_FORM: CreateShopUserInput = {
  fullName: "",
  email: "",
  role: "STAFF",
};

function roleClasses(role: ShopUser["role"]) {
  if (role === "ADMIN") return "bg-amber-100 text-amber-800";
  if (role === "MANAGER") return "bg-blue-100 text-blue-800";
  return "bg-zinc-100 text-zinc-700";
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [form, setForm] = useState<CreateShopUserInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      setUsers(await getShopUsers());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.full_name, user.email, user.role].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, users]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await createShopUser(form);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create user.");
    } finally {
      setSaving(false);
    }
  }

  if (profile?.role !== "ADMIN") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Only shop administrators can manage users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#B08D57]">Team</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#18181B]">User Management</h1>
          <p className="mt-1 text-sm text-[#71717A]">Add and manage people who work in your shop.</p>
        </div>
        <button type="button" onClick={() => { setError(null); setModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C]">
          <Plus size={17} /> Add Team Member
        </button>
      </section>

      {error && !modalOpen && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

      <section className="rounded-xl border border-[#E4E4E7] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#E4E4E7] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[#18181B]">Your team</h2>
            <p className="mt-1 text-xs text-[#71717A]">{users.length} {users.length === 1 ? "member" : "members"} in this shop</p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or role..." className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]" />
          </div>
        </div>

        {loading ? <div className="flex min-h-64 items-center justify-center text-sm text-[#71717A]">Loading users...</div> : filteredUsers.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><div className="rounded-full bg-[#F5EFE6] p-4 text-[#B08D57]"><UserRound size={22} /></div><p className="mt-4 text-sm font-medium text-[#18181B]">{search ? "No users found" : "No team members yet"}</p><p className="mt-1 text-xs text-[#71717A]">Add a manager or staff member to give them access to this shop.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-left"><th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">User</th><th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">Role</th><th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">Status</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id} className="border-b border-[#F0F0F1] last:border-b-0"><td className="px-5 py-4"><p className="text-sm font-medium text-[#18181B]">{user.full_name}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#71717A]"><Mail size={13} />{user.email}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClasses(user.role)}`}>{user.role}</span></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-sm text-emerald-700"><ShieldCheck size={16} /> Active</span></td></tr>)}</tbody></table></div>}
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-xl"><div className="flex items-start justify-between border-b border-[#E4E4E7] px-5 py-5"><div><p className="text-sm font-medium text-[#B08D57]">Team member</p><h2 className="mt-1 text-xl font-semibold text-[#18181B]">Add Team Member</h2></div><button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5]"><X size={18} /></button></div><form onSubmit={handleSubmit} className="space-y-5 p-5">{error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<div><label className="block text-sm font-medium text-[#18181B]">Full name</label><input required value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]" /></div><div><label className="block text-sm font-medium text-[#18181B]">Email</label><input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]" /></div><div><label className="block text-sm font-medium text-[#18181B]">Role</label><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as CreateShopUserInput["role"] }))} className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"><option value="STAFF">Staff</option><option value="MANAGER">Manager</option></select></div><p className="rounded-lg bg-[#F5EFE6] px-3 py-2.5 text-xs leading-5 text-[#6B5638]">We’ll email this person a secure link to set their own password.</p><div className="flex justify-end gap-3 border-t border-[#E4E4E7] pt-5"><button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-lg border border-[#D4D4D8] px-4 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA]">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:opacity-50">{saving ? "Sending..." : "Send Invite"}</button></div></form></div></div>}
    </div>
  );
}
