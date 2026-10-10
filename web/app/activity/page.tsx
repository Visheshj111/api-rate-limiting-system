"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { SegmentedControl } from "@/components/SegmentedControl";
import { HistoryLoading, HistorySearch, Pagination } from "@/components/HistoryTools";
import { useHistory } from "@/lib/history";
import { downloadCsv } from "@/lib/csv";

type Decision = { logId: number; clientId: number; clientName: string; endpoint: string; status: string; algorithmUsed: string; createdAt: string };

export default function Activity() {
  const [filters, setFilters] = useState({ q: "", status: "all", period: "all", algorithm: "all", page: 1 });
  const { data, loading, error, refresh } = useHistory<Decision>("activity", filters);
  const update = (patch: Partial<typeof filters>) => setFilters(v => ({ ...v, ...patch, page: 1 }));
  useEffect(() => { const last = Math.max(1, Math.ceil(data.total / data.limit)); if (!loading && !error && filters.page > last) setFilters(v => ({ ...v, page: last })); }, [data.total, data.limit, loading, error, filters.page]);
  return <Shell>
    <div className="page-head"><div><div className="eyebrow mb-2">Traffic / Activity</div><h1>The decision trail</h1><p>Follow a request from client to verdict.</p></div><button className="btn !text-xs" disabled={loading || !data.rows.length} onClick={() => downloadCsv("queueshield-activity-page.csv", [["ID", "Client", "Endpoint", "Decision", "Algorithm", "Time"], ...data.rows.map(r => [r.logId, r.clientName, r.endpoint, r.status, r.algorithmUsed, r.createdAt])])}>Export this page <Icon name="arrow" size={14} /></button></div>
    <div className="flex flex-wrap items-center justify-between gap-4 mb-5"><SegmentedControl label="Decision filter" value={filters.status} onChange={status => update({ status })} options={[{ value: "all", label: "Every decision" }, { value: "allowed", label: "Allowed" }, { value: "blocked", label: "Blocked" }]} /><div className="flex gap-3 text-[11px] num"><span className="text-mint">{data.counts.allowed || 0} allowed</span><span className="text-rose">{data.counts.blocked || 0} blocked</span><span className="text-muted">Current filters</span></div></div>
    <section className="panel overflow-hidden">
      <div className="grid md:grid-cols-[1fr_180px] gap-3 p-5 border-b border-line"><HistorySearch value={filters.q} onChange={q => update({ q })} period={filters.period} onPeriod={period => update({ period })} placeholder="Search client or endpoint…" /><select aria-label="Algorithm filter" className="field !text-xs" value={filters.algorithm} onChange={e => update({ algorithm: e.target.value })}><option value="all">Both algorithms</option><option value="token_bucket">Token bucket</option><option value="sliding_window">Sliding window</option></select></div>
      {error && <p role="alert" className="error m-5">{error} <button onClick={refresh} className="underline">Try again</button></p>}
      {loading ? <HistoryLoading /> : data.rows.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Decision</th><th>Client</th><th>Endpoint</th><th>Algorithm</th><th>Recorded at</th></tr></thead><tbody>{data.rows.map(row => <tr key={row.logId}><td><span className={`badge ${row.status === "allowed" ? "badge-green" : "badge-red"}`}>{row.status === "allowed" ? "200" : "429"}<span className="capitalize">{row.status}</span></span></td><td><span className="block font-medium text-xs">{row.clientName}</span><span className="num text-[10px] text-muted">#{row.logId}</span></td><td className="num text-xs">{row.endpoint}</td><td className="text-xs text-muted">{row.algorithmUsed === "token_bucket" ? "Token bucket" : "Sliding window"}</td><td className="num text-[11px] text-muted">{new Date(row.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div> : !error && <div className="empty !min-h-72"><Icon name="activity" size={28} /><span className="font-medium text-ink">No decisions here yet.</span><span className="text-xs">Try another filter, or send traffic from Overview.</span></div>}
      <Pagination page={filters.page} total={data.total} limit={data.limit} loading={loading} onChange={page => setFilters(v => ({ ...v, page }))} />
    </section><p className="mt-4 text-[11px] text-muted">Newest first · Refreshes every 5 seconds · Exports contain the current page only</p>
  </Shell>;
}
