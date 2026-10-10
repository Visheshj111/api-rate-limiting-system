"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { ThroughputChart, Point } from "@/components/ThroughputChart";
import { LoadTester } from "@/components/LoadTester";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageSkeleton } from "@/components/Skeleton";

type Stats = { allowed: number; blocked: number };
type PerClient = { clientId: number; name: string; allowed: number; blocked: number };
type LogRow = { logId: number; endpoint: string; status: string; algorithmUsed: string; createdAt: string };
type Client = { clientId: number; name: string; apiKey: string; rateLimit: number; windowSeconds: number };

export default function Dashboard() {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [trafficAlert, setTrafficAlert] = useState(false);
  const lastBlocked = useRef<number | null>(null);
  const [stats, setStats] = useState<Stats>({ allowed: 0, blocked: 0 });
  const [series, setSeries] = useState<Point[]>([]);
  const [perClient, setPerClient] = useState<PerClient[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [state, setState] = useState("Connecting");
  const [updated, setUpdated] = useState("");
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const signal = controller.current?.signal;
    try {
      const [s, ts, pc, lg, cl] = await Promise.all([
        api<Stats>("/api/reports/stats", { signal }), api<Point[]>("/api/reports/timeseries", { signal }),
        api<PerClient[]>("/api/reports/per-client", { signal }), api<LogRow[]>("/api/reports/logs", { signal }), api<Client[]>("/api/clients", { signal }),
      ]);
      if (signal?.aborted) return;
      if (lastBlocked.current !== null && s.blocked > lastBlocked.current) setTrafficAlert(true);
      lastBlocked.current = s.blocked;
      setStats(s); setSeries(ts); setPerClient(pc); setLogs(lg); setClients(cl);
      setHasData(true);
      setState("Live updates"); setUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch { if (!signal?.aborted) setState("Connection interrupted"); }
    finally { busy.current = false; if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!admin) return;
    controller.current = new AbortController();
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 2500);
    return () => { controller.current?.abort(); clearInterval(id); busy.current = false; };
  }, [load, admin?.adminId]);
  const total = stats.allowed + stats.blocked;
  const blockRate = total ? stats.blocked / total * 100 : 0;
  if (loading) return <Shell><PageSkeleton /></Shell>;
  if (!hasData) return <Shell><div className="empty panel !min-h-72"><h1 className="text-xl font-semibold text-ink">Your traffic overview is unavailable.</h1><p>Couldn’t load your data. Check the API connection.</p><button className="btn mt-3" onClick={load}>Try again</button></div></Shell>;

  return (
    <Shell>
      <div className="page-head">
        <div><div className="eyebrow mb-2">Your traffic, at a glance</div><h1>Traffic overview</h1><p>Every request. Every decision. One place.</p></div>
        <span role="status" className={`badge ${state === "Live updates" ? "badge-green" : "bg-surface2 text-muted"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{state}</span>
      </div>
      {state === "Connection interrupted" && <p className="error mb-5">Couldn’t refresh the dashboard. Showing the last available data. <button onClick={load} className="underline">Retry</button></p>}
      {trafficAlert && admin?.notifications.trafficAlerts && <div role="status" className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-[#e4d9c6] bg-[#faf6ed] p-4 text-xs text-[#826335]"><span>New requests reached their limit. Review the recent decisions below.</span><button onClick={() => setTrafficAlert(false)} className="underline">Dismiss</button></div>}
      <div className="metric-grid">
        <Metric label="Total requests" value={total} detail="All recorded traffic" />
        <Metric label="Allowed" value={stats.allowed} detail="Passed through the gate" color="text-mint" />
        <Metric label="Blocked" value={stats.blocked} detail={`${blockRate.toFixed(1)}% of total requests`} color="text-rose" />
        <Metric label="Registered clients" value={clients.length} detail="Individually configured limits" />
      </div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-5 mb-5">
        <section className="panel p-6 min-w-0 flex flex-col">
          <div className="section-head mb-7"><div><h2>Request activity</h2><p>Requests per minute · recorded buckets</p></div><div className="flex gap-4 text-[11px] text-muted"><span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-mint" />Allowed</span><span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-rose" />Blocked</span></div></div>
          <ThroughputChart data={series} />
          <div className="border-t border-line mt-4 pt-4 flex justify-between gap-2 text-[10px] text-muted"><span>Shared limits across all instances</span><span className="num">{updated ? `Updated ${updated}` : "Waiting for connection"}</span></div>
        </section>
        <LoadTester clients={clients} onDone={load} />
      </div>
      <div className="grid xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] gap-5">
        <section className="panel p-6">
          <div className="section-head mb-6"><div><h2>Traffic by client</h2><p>Allowed and blocked request distribution</p></div><Link href="/clients" aria-label="Manage clients" className="text-muted hover:text-mint"><Icon name="arrow" size={17} /></Link></div>
          {perClient.length === 0 ? <div className="empty"><Icon name="clients" size={24} /><span>No client traffic yet</span><span className="text-xs">Run a test to see your limits in action.</span></div> : <div className="space-y-5">{perClient.map(c => (
            <div key={c.clientId}><div className="flex items-center gap-3 mb-2.5"><span className="client-avatar !h-7 !w-7 text-[10px]">{c.name.slice(0, 2).toUpperCase()}</span><span className="text-xs font-medium truncate">{c.name}</span><span className="ml-auto num text-[11px] text-muted">{(c.allowed + c.blocked).toLocaleString()} req</span></div><div className="flex h-1.5 overflow-hidden rounded-full bg-surface2"><div className="bg-mint" style={{ width: `${c.allowed / (c.allowed + c.blocked || 1) * 100}%` }} /><div className="bg-rose" style={{ width: `${c.blocked / (c.allowed + c.blocked || 1) * 100}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-muted num"><span>{c.allowed} allowed</span><span>{c.blocked} blocked</span></div></div>
          ))}</div>}
        </section>
        <section className="panel overflow-hidden min-w-0">
          <div className="section-head p-6"><div><h2>Recent requests</h2><p>The latest decisions from your gateway</p></div><span className="badge bg-surface2 text-muted num">{logs.length} events</span></div>
          <div className="overflow-auto max-h-80"><table className="data-table"><thead><tr><th>Decision</th><th>Endpoint</th><th>Algorithm</th><th>Time</th></tr></thead><tbody>{logs.map(l => <tr key={l.logId}><td><span className={`badge ${l.status === "allowed" ? "badge-green" : "badge-red"}`}>{l.status === "allowed" ? "200" : "429"}<span className="capitalize">{l.status}</span></span></td><td className="num text-[11px]">{l.endpoint}</td><td className="text-muted text-xs">{l.algorithmUsed === "token_bucket" ? "Token bucket" : "Sliding window"}</td><td className="num text-[10px] text-muted">{new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td></tr>)}</tbody></table>{logs.length === 0 && <div className="empty">Your next request will show up here.</div>}</div>
        </section>
      </div>
    </Shell>
  );
}

function Metric({ label, value, detail, color = "text-ink" }: { label: string; value: number; detail: string; color?: string }) {
  return <div className="metric"><div className="text-xs text-muted">{label}</div><div className={`metric-value ${color}`}>{value.toLocaleString()}</div><div className="mt-3 text-[10px] text-muted">{detail}</div></div>;
}
