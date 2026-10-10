"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Mark } from "@/components/Mark";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { PasswordField, PasswordHint } from "@/components/PasswordField";

export default function Login() {
  const { login, register, admin, ready } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setNotice(sessionStorage.getItem("qs_notice") || ""); sessionStorage.removeItem("qs_notice"); }, []);
  useEffect(() => { if (ready && admin) router.replace("/dashboard"); }, [ready, admin, router]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (mode === "login") await login(email, password, remember);
      else await register({ name, username, email, password, confirmPassword, remember });
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t sign in."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
    <section className="login-story !hidden lg:!flex">
      <div className="flex items-center gap-3"><Mark /><span className="text-xl font-semibold tracking-[-.04em]">QueueShield</span></div>
      <div className="max-w-lg py-16 rise"><div className="eyebrow !text-[#61744e] mb-5">A little order in the traffic.</div><h1 className="text-[clamp(42px,4.5vw,68px)] font-medium leading-[1.06] tracking-[-.06em]">Good traffic in.<br /><span className="text-[#758468]">Overload out.</span></h1><p className="mt-7 text-sm leading-relaxed text-[#63705a] max-w-sm">Give every client a fair share. Control incoming requests, queue accepted work, and see every decision.</p>
        <div className="mt-12 max-w-md border-t border-[#d5dccb]">{[{ name: "Within the limit", result: "Allowed", code: "200", blocked: false }, { name: "Over the limit", result: "Throttled", code: "429", blocked: true }].map(r => <div key={r.code} className="flow-lane"><span className="num text-[#63705a]">{r.name}</span><span className="flow-line" /><span className={`badge ${r.blocked ? "badge-red" : "badge-green"}`}><span className="num">{r.code}</span>{r.result}</span></div>)}</div>
      </div>
      <div className="flex flex-wrap gap-6 text-[10px] text-[#63705a] num"><span>01 / SHARED STATE</span><span>02 / FAIR LIMITS</span><span>03 / FULL VISIBILITY</span></div>
    </section>
    <section className="flex flex-col min-h-screen px-6 sm:px-12 py-8">
      <div className="flex items-center gap-2 lg:hidden"><Mark /><span className="font-semibold">QueueShield</span></div>
      <div className="w-full max-w-[360px] m-auto py-12 rise">
        <div className="eyebrow mb-3">Your control room</div><h2 className="text-3xl font-semibold tracking-[-.04em]">{mode === "login" ? "Welcome back." : "Make room for better traffic."}</h2><p className="mt-3 mb-8 text-sm text-muted">{mode === "login" ? "Sign in to keep your requests in check." : "Create your personal admin account."}</p>
        {notice && <p role="status" className="mb-5 rounded-lg bg-[#edf5ee] p-4 text-sm text-mint">{notice}</p>}
        {!ready || admin ? <div role="status" aria-label="Loading account" className="space-y-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-11 w-full" /></div> : <>
          <form onSubmit={submit}>
            <fieldset disabled={busy} className="space-y-5" aria-busy={busy}>
              {mode === "register" && <><label className="block"><span className="field-label">Your name</span><input className="field" required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Morgan" /></label><label className="block"><span className="field-label">Username</span><input className="field" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_\-]+" aria-label="Username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="alex_morgan" /><span className="block mt-2 text-[11px] text-muted">3–24 characters. Include a letter; use letters, numbers, _ or -.</span></label></>}
              <label className="block"><span className="field-label">Email address</span><input className="field" required maxLength={100} autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <PasswordField label="Password" fresh={mode === "register"} value={password} onChange={e => setPassword(e.target.value)} />
              {mode === "register" && <><PasswordHint /><PasswordField label="Confirm password" fresh value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></>}
              <label className="flex items-start gap-2.5 text-xs text-muted"><input type="checkbox" className="mt-0.5 accent-[#287451]" checked={remember} onChange={e => setRemember(e.target.checked)} /><span>Remember me for 30 days<br /><span className="block mt-1 text-[10px]">Use this only on a personal device.</span></span></label>
              {error && <p role="alert" className="error">{error}</p>}
              <button disabled={busy} className="btn btn-primary w-full !py-3">{busy ? "Please wait…" : mode === "login" ? "Sign in to workspace" : "Create admin account"}<Icon name="arrow" size={16} /></button>
            </fieldset>
          </form>
          <p className="mt-7 text-center text-xs text-muted">{mode === "login" ? "First time here?" : "Already have an account?"} <button disabled={busy} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setPassword(""); setConfirmPassword(""); }} className="text-mint font-medium underline underline-offset-4 ml-1">{mode === "login" ? "Create an admin account" : "Sign in"}</button></p>
          {mode === "login" && <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">Change your password after signing in,<br />under Settings → Security.</p>}
        </>}
      </div>
      <p className="text-center text-[10px] text-muted">QueueShield · Distributed API rate limiting & job scheduling</p>
    </section>
  </main>;
}
