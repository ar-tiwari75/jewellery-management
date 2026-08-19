import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    try { setSaving(true); const { error: updateError } = await supabase.auth.updateUser({ password }); if (updateError) throw updateError; setSuccess("Your password has been set. You can now continue to your workspace."); }
    catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to set your password."); }
    finally { setSaving(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#111112] px-5 py-10 text-white"><section className="w-full max-w-md rounded-2xl border border-[#2A2A2D] bg-[#18181A] p-7 shadow-2xl shadow-black/20 sm:p-8"><p className="text-sm font-medium text-[#B89455]">Jewellery Management</p><h1 className="mt-2 text-2xl font-semibold">Set your password</h1><p className="mt-2 text-sm leading-6 text-[#77777D]">Choose a secure password to activate your account.</p><form onSubmit={handleSubmit} className="mt-7 space-y-5"><div><label className="mb-2 block text-sm font-medium text-[#D4D4D8]">New password</label><input required type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-[#37373B] bg-[#111112] px-4 py-3 text-sm outline-none focus:border-[#B89455] focus:ring-1 focus:ring-[#B89455]" /></div><div><label className="mb-2 block text-sm font-medium text-[#D4D4D8]">Confirm password</label><input required type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-[#37373B] bg-[#111112] px-4 py-3 text-sm outline-none focus:border-[#B89455] focus:ring-1 focus:ring-[#B89455]" /></div>{error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</p>}{success && <p className="rounded-lg border border-[#806B45]/40 bg-[#B89455]/10 px-4 py-3 text-sm text-[#D0AD70]">{success}</p>}<button disabled={saving} type="submit" className="w-full rounded-lg bg-[#B89455] px-4 py-3 text-sm font-semibold text-[#111112] hover:bg-[#C5A466] disabled:opacity-60">{saving ? "Saving..." : "Set password"}</button></form></section></main>;
}
