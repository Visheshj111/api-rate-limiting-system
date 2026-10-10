"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { JobChip } from "@/components/JobChip";
import { SegmentedControl } from "@/components/SegmentedControl";
import { HistoryLoading, HistorySearch, Pagination } from "@/components/HistoryTools";
import { useHistory } from "@/lib/history";

type Job = { jobId: number; clientName: string; jobType: string; status: string; retryCount: number; createdAt: string; completedAt: string | null };
const statuses = ["all", "queued", "processing", "completed", "failed"];

export default function Jobs() {
  const [filters, setFilters] = useState({ q: "", status: "all", period: "all", page: 1 });
  const { data, loading, error, refresh } = useHistory<Job>("jobs", filters);
  const update = (patch: Partial<typeof filters>) => setFilters(v => ({ ...v, ...patch, page: 1 }));
  useEffect(() => { const last = Math.max(1, Math.ceil(data.total / data.limit)); if (!loading && !error && filters.page > last) setFilters(v => ({ ...v, page: last })); }, [data.total, data.limit, loading, error, filters.page]);
  return <Shell>
    <div className="page-head"><div><div className="eyebrow mb-2">Workspace / Jobs</div><h1>Work, in motion.</h1><p>Accepted requests become jobs. Here’s where they go next.</p></div><span className="badge badge-green"><span className="w-1.5 h-1.5 rounded-full bg-mint" />5-second refresh</span></div>
    <div className="grid sm:grid-cols-3 gap-4 mb-6">{[{ step: "01", label: "Queued", text: "Accepted and waiting for a worker." }, { step: "02", label: "Processing", text: "A worker is handling the job." }, { step: "03", label: "Completed", text: "Work is finished and recorded." }].map(step => <div key={step.step} className="rounded-xl border border-line bg-[#f2f4ec] p-5"><div className="flex justify-between items-center"><span className="num text-[10px] text-[#7a896d]">{step.step} / LIFECYCLE</span><Icon name="arrow" size={15} /></div><h2 className="text-sm font-semibold mt-4">{step.label}</h2><p className="text-[11px] text-muted mt-1.5">{step.text}</p></div>)}</div>
    <div className="mb-5"><SegmentedControl label="Job status filter" value={filters.status} onChange={status => update({ status })} options={statuses.map(status => ({ value: status, label: status === "all" ? "All jobs" : status[0].toUpperCase() + status.slice(1) }))} /></div>
    <section className="panel overflow-hidden"><div className="p-5 border-b border-line"><HistorySearch value={filters.q} onChange={q => update({ q })} period={filters.period} onPeriod={period => update({ period })} placeholder="Search job ID, type, or client…" /></div>
      {error && <p role="alert" className="error m-5">{error} <button onClick={refresh} className="underline">Try again</button></p>}
      {loading ? <HistoryLoading /> : data.rows.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Job</th><th>Client</th><th>Status</th><th>Retries</th><th>Created</th><th>Completed</th></tr></thead><tbody>{data.rows.map(job => <tr key={job.jobId}><td><span className="block text-xs font-medium capitalize">{job.jobType}</span><span className="num text-[10px] text-muted">JOB / {String(job.jobId).padStart(4, "0")}</span></td><td className="text-xs font-medium">{job.clientName}</td><td><JobChip status={job.status} /></td><td className="num text-xs text-muted">{job.retryCount}</td><td className="num text-[11px] text-muted">{new Date(job.createdAt).toLocaleString()}</td><td className="num text-[11px] text-muted">{job.completedAt ? new Date(job.completedAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div> : !error && <div className="empty !min-h-64"><Icon name="jobs" size={28} /><span className="font-medium text-ink">No jobs match this view.</span><span className="text-xs">Accepted traffic from Overview creates background work.</span></div>}
      <Pagination page={filters.page} total={data.total} limit={data.limit} loading={loading} onChange={page => setFilters(v => ({ ...v, page }))} />
    </section><p className="text-[11px] text-muted mt-4">Status comes from the worker’s PostgreSQL record. Jobs have up to three attempts with exponential backoff. Pending work recovers after a queue interruption.</p>
  </Shell>;
}
