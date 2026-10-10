"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { probe } from "@/lib/api";
import { Icon } from "./Icon";
import { CometDial } from "./CometDial";

type Client = { clientId: number; name: string; apiKey: string; rateLimit: number; windowSeconds: number };

export function LoadTester({ clients, onDone }: { clients: Client[]; onDone: () => void }) {
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(20);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [tally, setTally] = useState({ allowed: 0, blocked: 0 });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (!clients.some(c => c.clientId === selected)) setSelected(clients[0]?.clientId ?? 0); }, [clients, selected]);
  const client = clients.find(c => c.clientId === selected);
  const total = tally.allowed + tally.blocked;
  const valid = Number.isInteger(count) && count >= 1 && count <= 200;

  async function fire() {
    if (!client || !valid || running) return;
    setRunning(true); setError(""); setTally({ allowed: 0, blocked: 0 });
    const signal = (controller.current = new AbortController()).signal;
    try {
      for (let i = 0; i < count; i++) {
        if (signal.aborted) break;
        const { status } = await probe(client.apiKey, signal);
        if (status !== 200 && status !== 202 && status !== 429) throw new Error(`Request failed (${status}). Check the client key and API.`);
        setTally(t => status !== 429 ? { ...t, allowed: t.allowed + 1 } : { ...t, blocked: t.blocked + 1 });
        await new Promise(r => setTimeout(r, 40));
      }
    } catch (err) { if (!signal.aborted) setError(err instanceof Error ? err.message : "Couldn’t reach the API."); }
    finally { if (!signal.aborted) { setRunning(false); onDone(); } }
  }

  return (
    <section className="panel !bg-[#f2f4ec] p-6">
      <div className="section-head mb-5"><div><span className="eyebrow">Traffic playground</span><h2 className="!text-lg mt-1">Put your limits to work.</h2></div></div>
      <p className="text-xs leading-relaxed text-muted mb-5">Send a burst of requests and watch your rate limiter make the call.</p>
      {!clients.length ? <Link href="/clients" className="btn w-full">Register your first client<Icon name="arrow" size={15} /></Link> : <>
        <label className="block mb-4"><span className="field-label">Client</span><select disabled={running} value={selected} onChange={e => setSelected(Number(e.target.value))} className="field">{clients.map(c => <option key={c.clientId} value={c.clientId}>{c.name}</option>)}</select></label>
        <CometDial value={count} onChange={setCount} disabled={running} />
        <div className="flex justify-center gap-2 mb-4">{[5,20,50,200].map(n => <button key={n} disabled={running} aria-label={`Send ${n} requests`} aria-pressed={count === n} onClick={() => setCount(n)} className={`rounded-full border px-2.5 py-1 num text-[10px] ${count === n ? "border-mint/30 bg-white text-mint" : "border-transparent text-muted hover:bg-white/60"}`}>{n}</button>)}</div>
        <p className="text-center text-[10px] text-muted mb-4 num">Client limit: {client?.rateLimit} / {client?.windowSeconds}s</p>
        <button onClick={fire} disabled={running || !client || !valid} className="btn btn-primary w-full">{running ? `Sending ${total} of ${count}…` : "Run traffic test"}<Icon name="arrow" size={15} /></button>
      </>}
      {error && <p role="alert" className="text-xs text-rose mt-3">{error}</p>}
      <div className="mt-5 pt-4 border-t border-[#dce3d1]" aria-live="polite"><div className="flex h-1.5 overflow-hidden rounded-full bg-[#dfe6d6] mb-3"><div className="bg-mint transition-all" style={{ width: `${total ? tally.allowed / total * 100 : 0}%` }} /><div className="bg-rose transition-all" style={{ width: `${total ? tally.blocked / total * 100 : 0}%` }} /></div><div className="flex justify-between text-[11px] num"><span className="text-mint">{tally.allowed} allowed</span><span className="text-rose">{tally.blocked} blocked</span></div></div>
    </section>
  );
}
