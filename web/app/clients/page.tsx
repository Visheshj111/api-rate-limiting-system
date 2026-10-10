"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageSkeleton } from "@/components/Skeleton";
import { NumberEntry } from "@/components/NumberEntry";
import { FuseDelete } from "@/components/FuseDelete";

type Client = { clientId: number; name: string; apiKey: string; tier: string; rateLimit: number; windowSeconds: number; algorithm: string };
const tiers = ["free", "pro", "enterprise"];
const algorithms = [{ value: "token_bucket", label: "Token bucket" }, { value: "sliding_window", label: "Sliding window" }];
const message = (err: unknown) => err instanceof Error ? err.message : "Something went wrong. Please try again.";

export default function Clients() {
  const { admin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const load = useCallback(async () => {
    try { setClients(await api<Client[]>("/api/clients")); setError(""); }
    catch (err) { setError(message(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (admin) load(); }, [load, admin?.adminId]);

  async function change(id: number, body?: Partial<Client>) {
    setError(""); setPending(id);
    try { await api(`/api/clients/${id}`, { method: body ? "PATCH" : "DELETE", body }); await load(); return true; }
    catch (err) { setError(message(err)); return false; }
    finally { setPending(null); }
  }
  async function copy(c: Client) {
    try { await navigator.clipboard.writeText(c.apiKey); setCopied(c.clientId); setTimeout(() => setCopied(null), 1600); }
    catch { setError("Couldn’t copy the key. Clipboard access is unavailable in this browser."); }
  }
  const filtered = clients.filter(c => `${c.name} ${c.tier} ${c.algorithm}`.toLowerCase().includes(search.toLowerCase()));
  if (loading) return <Shell><PageSkeleton kind="clients" /></Shell>;

  return (
    <Shell>
      <div className="page-head"><div><div className="eyebrow mb-2">A fair share for every client</div><h1>Client directory</h1><p>Set the rules. Your gateway takes care of the rest.</p></div><button onClick={() => setShowForm(!showForm)} className="btn btn-primary"><Icon name="plus" size={16} />{showForm ? "Close form" : "Register client"}</button></div>
      {error && <div role="alert" className="error mb-5">{error} <button onClick={load} className="underline">Refresh</button></div>}
      {showForm && <CreateForm onCreated={() => { setShowForm(false); load(); }} />}
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Registered clients</h2><span className="badge bg-surface2 text-muted num">{clients.length}</span></div><label className="flex items-center gap-2 border border-line rounded-lg px-3 py-2 text-muted"><Icon name="search" size={15} /><input aria-label="Search clients" value={search} onChange={e => setSearch(e.target.value)} className="outline-none bg-transparent text-xs w-44" placeholder="Find a client…" /></label></div>
        <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Client</th><th>Tier</th><th>Request limit</th><th>Window</th><th>Algorithm</th><th>API key</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(c => (
          <tr key={c.clientId}>
            <td><div className="flex items-center gap-3"><span className="client-avatar">{c.name.slice(0, 2).toUpperCase()}</span><div><div className="font-medium">{c.name}</div><div className="num text-[10px] text-muted mt-1">CLIENT / {String(c.clientId).padStart(3, "0")}</div></div></div></td>
            <td><select aria-label={`Tier for ${c.name}`} disabled={pending !== null} value={c.tier} onChange={e => change(c.clientId, { tier: e.target.value })} className="field !py-1.5 !px-2 !text-xs capitalize">{tiers.map(t => <option key={t}>{t}</option>)}</select></td>
            <td><NumCell label={`Request limit for ${c.name}`} value={c.rateLimit} disabled={pending !== null} onSave={v => change(c.clientId, { rateLimit: v })} /></td>
            <td><NumCell label={`Window in seconds for ${c.name}`} value={c.windowSeconds} disabled={pending !== null} onSave={v => change(c.clientId, { windowSeconds: v })} suffix="sec" /></td>
            <td><select aria-label={`Algorithm for ${c.name}`} disabled={pending !== null} value={c.algorithm} onChange={e => change(c.clientId, { algorithm: e.target.value })} className="field !py-1.5 !px-2 !text-xs">{algorithms.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></td>
            <td><button onClick={() => copy(c)} aria-label={`Copy API key for ${c.name}`} className="flex items-center gap-2 num text-[11px] text-muted hover:text-mint"><span>{copied === c.clientId ? "Copied" : `${c.apiKey.slice(0, 9)}…`}</span><Icon name="copy" size={13} /></button></td>
            <td><FuseDelete label={c.name} disabled={pending !== null} onDelete={() => change(c.clientId)} /></td>
          </tr>
        ))}</tbody></table></div>
        {!filtered.length && <div className="empty !min-h-64"><Icon name="clients" size={28} /><span className="font-medium text-ink">{loading ? "Loading clients…" : search ? "No matching clients" : "Your first client starts here."}</span><span className="text-xs">{search ? "Try a different name, tier, or algorithm." : "Register an API consumer and give it a request budget."}</span>{!loading && !search && <button className="btn mt-3" onClick={() => setShowForm(true)}><Icon name="plus" size={14} />Register client</button>}</div>}
        <div className="border-t border-line px-5 py-4 flex flex-wrap gap-2 justify-between text-[10px] text-muted"><span>{filtered.length} of {clients.length} clients<span className="sm:hidden"> · Swipe for more controls</span></span><span>Changes apply to the next request. No redeploy needed.</span></div>
      </section>
      <p className="mt-4 text-[11px] text-muted">Limits and windows accept 1–9,999. Deleting a client also removes its traffic history and jobs.</p>
      <div className="mt-5 grid sm:grid-cols-2 gap-5 text-xs text-muted"><div className="border-l-2 border-[#bccbab] pl-4 py-1"><h3 className="font-medium text-ink mb-1">Token bucket</h3><p className="leading-relaxed">Allows a burst up to the limit, then refills steadily over the window.</p></div><div className="border-l-2 border-[#c5cec9] pl-4 py-1"><h3 className="font-medium text-ink mb-1">Sliding window</h3><p className="leading-relaxed">Counts accepted requests in the trailing window for a precise cap.</p></div></div>
    </Shell>
  );
}

function NumCell({ label, value, disabled, onSave, suffix }: { label: string; value: number; disabled: boolean; onSave: (v: number) => Promise<boolean>; suffix?: string }) {
  return <span className="flex items-center gap-1.5"><NumberEntry label={label} value={value} disabled={disabled} onCommit={onSave} />{suffix && <span className="text-muted text-[10px]">{suffix}</span>}</span>;
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", tier: "free", rateLimit: 100, windowSeconds: 60, algorithm: "token_bucket" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api("/api/clients", { method: "POST", body: form }); onCreated(); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="panel p-6 mb-5 rise">
      <div className="section-head mb-5"><div><h2>Register an API consumer</h2><p>We’ll generate a unique API key for this client.</p></div></div>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <label><span className="field-label">Client name</span><input autoFocus required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="field" placeholder="e.g. Checkout service" /></label>
        <label><span className="field-label">Tier</span><select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="field capitalize">{tiers.map(t => <option key={t}>{t}</option>)}</select></label>
        <div><span className="field-label">Request limit</span><NumberEntry label="Request limit" value={form.rateLimit} onChange={rateLimit => setForm({ ...form, rateLimit })} /></div>
        <div><span className="field-label">Window in seconds</span><NumberEntry label="Window in seconds" value={form.windowSeconds} onChange={windowSeconds => setForm({ ...form, windowSeconds })} /></div>
        <label><span className="field-label">Algorithm</span><select value={form.algorithm} onChange={e => setForm({ ...form, algorithm: e.target.value })} className="field">{algorithms.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-4"><button disabled={busy} className="btn btn-primary">{busy ? "Registering…" : "Create client"}<Icon name="arrow" size={14} /></button>{error && <span role="alert" className="text-rose text-xs">{error}</span>}</div>
    </form>
  );
}
