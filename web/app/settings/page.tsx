"use client";

import { useState, type ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { PageSkeleton } from "@/components/Skeleton";
import { FlipCard } from "@/components/FlipCard";
import { PasswordField, PasswordHint } from "@/components/PasswordField";
import { Icon } from "@/components/Icon";
import { BellToggle } from "@/components/BellToggle";
import { api } from "@/lib/api";
import { useAuth, type Admin } from "@/lib/auth";

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function run(action: () => Promise<void>, success = "") {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); }
    catch (err) { setError(err instanceof Error ? err.message : "Couldn’t save. Please try again."); }
    finally { setBusy(false); }
  }
  return { busy, error, notice, run };
}

function Feedback({ error, notice }: { error: string; notice: string }) {
  return <>{error && <p role="alert" className="error mt-4">{error}</p>}{notice && <p role="status" className="mt-4 text-xs text-mint">{notice}</p>}</>;
}

function Section({ title, description, children, id }: { title: string; description: string; children: ReactNode; id?: string }) {
  return <section id={id} className="settings-card scroll-mt-6"><h2>{title}</h2><p>{description}</p>{children}</section>;
}

export default function Settings() {
  const { admin, session } = useAuth();
  return <Shell>{!admin ? <PageSkeleton kind="settings" /> : <>
    <div className="page-head"><div><div className="eyebrow mb-2">A space that feels like yours</div><h1>Account settings</h1><p>Your details, preferences, and peace of mind.</p></div><span className="badge badge-green"><Icon name="settings" size={13} />Personal account</span></div>
    <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <div className="space-y-6"><Profile key={admin.adminId} admin={admin} /><Notifications admin={admin} /><Security /><DeleteAccount /></div>
      <aside className="space-y-5 xl:sticky xl:top-6 xl:row-start-auto row-start-1">
        <FlipCard front={<><span className="eyebrow !text-[#61744e] flex justify-between">Workspace member <span className="num">QS / {String(admin.adminId).padStart(3, "0")}</span></span><span className="client-avatar !w-14 !h-14 !rounded-full overflow-hidden mt-8 !bg-white/50 !text-lg">{admin.avatar ? <img src={admin.avatar} alt="" className="w-full h-full object-cover" /> : admin.name.slice(0, 2).toUpperCase()}</span><span className="mt-4 text-xl font-semibold tracking-tight truncate">{admin.name}</span><span className="mt-1 text-xs text-[#63705a] truncate">@{admin.username}</span><span className="mt-auto pt-5 flex justify-between text-[10px] text-[#61744e]">Your account, at a glance <Icon name="arrow" size={14} /></span></>}
          back={<><span className="eyebrow !text-[#61744e]">Behind the card</span><span className="mt-7 text-xs text-[#63705a]">Joined</span><span className="mt-1 text-sm font-medium">{new Date(admin.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span><span className="mt-5 text-xs text-[#63705a]">This session</span><span className="mt-1 text-sm font-medium">{session?.remember ? "Remembered for up to 30 days" : "Up to 12 hours"}</span><span className="mt-auto pt-5 text-[10px] text-[#61744e]">Tap to return to your profile ↶</span></>} />
        <p className="px-1 text-[11px] leading-relaxed text-muted">A little detail, just for you. Drag or tap the card to flip it. Move your pointer to tilt it, or use Enter when focused.</p>
        <div className="panel p-5"><div className="eyebrow mb-3">Quick links</div><a href="#security" className="flex justify-between py-2 text-xs hover:text-mint">Change password <Icon name="arrow" size={14} /></a><a href="#notifications" className="flex justify-between py-2 text-xs hover:text-mint">Notification preferences <Icon name="arrow" size={14} /></a></div>
      </aside>
    </div>
  </>}</Shell>;
}

function Profile({ admin }: { admin: Admin }) {
  const { setAdmin } = useAuth();
  const [form, setForm] = useState({ name: admin.name, username: admin.username, email: admin.email, phone: admin.phone, avatar: admin.avatar });
  const [password, setPassword] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [processing, setProcessing] = useState(false);
  const action = useAction();
  async function photo(file?: File) {
    if (!file) return;
    setPhotoError(""); setProcessing(true);
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error("Choose a PNG, JPEG, or WebP smaller than 2 MB.");
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image editing is unavailable in this browser.");
        const side = Math.min(image.width, image.height);
        context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
        setForm(f => ({ ...f, avatar: canvas.toDataURL("image/webp", .85) }));
      } finally { image.close(); }
    } catch (err) { setPhotoError(err instanceof Error ? err.message : "Couldn’t read that image."); }
    finally { setProcessing(false); }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    action.run(async () => {
      const result = await api<{ admin: Admin }>("/api/auth/me", { method: "PATCH", body: { ...form, ...(form.email.trim().toLowerCase() !== admin.email ? { currentPassword: password } : {}) } });
      setAdmin(result.admin); setForm({ name: result.admin.name, username: result.admin.username, email: result.admin.email, phone: result.admin.phone, avatar: result.admin.avatar }); setPassword("");
    }, "Profile saved.");
  }
  return <Section title="Personal details" description="Make yourself at home. These details belong to your account."><form onSubmit={submit}>
    <fieldset disabled={action.busy || processing} aria-busy={action.busy || processing}>
      <div className="flex flex-wrap items-center gap-4 pb-6 mb-6 border-b border-line"><span className="client-avatar !w-16 !h-16 !rounded-full overflow-hidden !text-lg">{form.avatar ? <img src={form.avatar} alt="Profile preview" className="w-full h-full object-cover" /> : form.name.slice(0, 2).toUpperCase()}</span><div><label className="btn !text-xs cursor-pointer">{processing ? "Preparing photo…" : "Upload photo"}<input type="file" aria-label="Upload profile photo" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => { photo(e.target.files?.[0]); e.target.value = ""; }} /></label>{form.avatar && <button type="button" onClick={() => setForm({ ...form, avatar: null })} className="ml-3 text-xs text-muted underline">Remove</button>}<p className="mt-2 text-[10px] text-muted">PNG, JPEG, or WebP · Up to 2 MB</p></div></div>
      {photoError && <p role="alert" className="error mb-5">{photoError}</p>}
      <div className="grid sm:grid-cols-2 gap-5">{[{ key: "name", label: "Full name", autoComplete: "name", max: 100 }, { key: "username", label: "Username", autoComplete: "username", max: 24 }, { key: "email", label: "Email address", autoComplete: "email", max: 100 }, { key: "phone", label: "Phone number (optional)", autoComplete: "tel", max: 24 }].map(field => <label key={field.key}><span className="field-label">{field.label}</span><input required={field.key !== "phone"} type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"} autoComplete={field.autoComplete} maxLength={field.max} minLength={field.key === "username" ? 3 : undefined} pattern={field.key === "username" ? "[A-Za-z0-9_\\-]+" : undefined} className="field" value={form[field.key as keyof Omit<typeof form, "avatar">]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} /></label>)}</div>
      <p className="mt-3 text-[11px] text-muted">Usernames need a letter and 3–24 characters. Reserved names are unavailable.</p>
      {form.email.trim().toLowerCase() !== admin.email && <div className="mt-5"><PasswordField label="Current password to change email" value={password} onChange={e => setPassword(e.target.value)} /><p className="mt-2 text-[11px] text-muted">Changing your email signs out your other sessions.</p></div>}
      <button className="btn btn-primary mt-6" disabled={action.busy || processing}>{action.busy ? "Saving…" : "Save changes"}</button>
    </fieldset><Feedback {...action} />
  </form></Section>;
}

function Notifications({ admin }: { admin: Admin }) {
  const { setAdmin } = useAuth();
  const [preferences, setPreferences] = useState(admin.notifications);
  const action = useAction();
  return <Section id="notifications" title="Notifications" description="Choose what you want to hear about."><form onSubmit={e => { e.preventDefault(); action.run(async () => { const result = await api<{ admin: Admin }>("/api/auth/notifications", { method: "PATCH", body: preferences }); setAdmin(result.admin); }, "Preferences saved."); }}>
    <fieldset disabled={action.busy} aria-busy={action.busy} className="divide-y divide-line">{[{ key: "trafficAlerts", label: "Traffic alerts", detail: "Show a dashboard notice when new requests are blocked." }, { key: "securityAlerts", label: "Account security emails", detail: "Preference for future account and sign-in updates." }, { key: "productUpdates", label: "Product updates", detail: "Optional news and project updates by email." }].map(item => <div key={item.key} className="flex flex-col sm:flex-row items-start justify-between gap-4 py-4 first:pt-0"><span><span className="block text-sm font-medium">{item.label}</span><span className="block mt-1 text-xs leading-relaxed text-muted">{item.detail}</span></span><BellToggle label={item.label} disabled={action.busy} checked={preferences[item.key as keyof typeof preferences]} onChange={checked => setPreferences({ ...preferences, [item.key]: checked })} /></div>)}</fieldset>
    <p className="mt-3 mb-5 text-[11px] leading-relaxed text-muted">Email preferences are saved, but this personal project has no email delivery connected.</p><button className="btn" disabled={action.busy}>{action.busy ? "Saving…" : "Save preferences"}</button><Feedback {...action} />
  </form></Section>;
}

function Security() {
  const { signedOut } = useAuth();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const action = useAction();
  return <Section id="security" title="Security" description="Change your password using your current one. You’ll sign in again on every device."><form onSubmit={e => { e.preventDefault(); action.run(async () => { if (newPassword !== confirmPassword) throw new Error("New passwords do not match."); await api("/api/auth/password", { method: "POST", body: { currentPassword, newPassword, confirmPassword } }); signedOut("Password changed. Sign in with your new password."); }); }}>
    <fieldset disabled={action.busy} aria-busy={action.busy} className="space-y-5"><PasswordField label="Current password" value={currentPassword} onChange={e => setCurrent(e.target.value)} /><div className="grid sm:grid-cols-2 gap-5"><PasswordField label="New password" fresh value={newPassword} onChange={e => setNew(e.target.value)} /><PasswordField label="Confirm new password" fresh value={confirmPassword} onChange={e => setConfirm(e.target.value)} /></div><PasswordHint /><button className="btn btn-primary" disabled={action.busy}>{action.busy ? "Checking & updating…" : "Update password"}</button></fieldset><Feedback {...action} />
  </form></Section>;
}

function DeleteAccount() {
  const { signedOut } = useAuth();
  const [currentPassword, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const action = useAction();
  return <Section title="Close your account" description="Permanently remove your profile, preferences, sessions, clients, jobs, traffic records, and saved reports."><form onSubmit={e => { e.preventDefault(); action.run(async () => { await api("/api/auth/me", { method: "DELETE", body: { currentPassword, confirmation } }); signedOut("Your account has been deleted."); }); }}>
    <fieldset disabled={action.busy} aria-busy={action.busy}><div className="grid sm:grid-cols-2 gap-5"><PasswordField label="Password to delete account" value={currentPassword} onChange={e => setPassword(e.target.value)} /><label><span className="field-label">Type DELETE to confirm</span><input required className="field num" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label></div><p className="mt-4 text-xs text-rose">This cannot be undone.</p><button disabled={action.busy || confirmation !== "DELETE" || !currentPassword} className="btn mt-5 !border-rose/30 !text-rose hover:!bg-[#fbefeb]">{action.busy ? "Deleting…" : "Delete my account"}</button></fieldset><Feedback {...action} />
  </form></Section>;
}
