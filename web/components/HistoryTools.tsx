"use client";

import { Icon } from "./Icon";
import { Skeleton } from "./Skeleton";

export function HistorySearch({ value, onChange, period, onPeriod, placeholder }: { value: string; onChange: (v: string) => void; period: string; onPeriod: (v: string) => void; placeholder: string }) {
  return <div className="flex flex-wrap gap-3"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 text-muted"><Icon name="search" size={16} /><input aria-label="Search records" maxLength={100} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full min-w-0 bg-transparent py-2.5 text-xs outline-none" /></label><select aria-label="Time period" className="field !w-auto !text-xs" value={period} onChange={e => onPeriod(e.target.value)}><option value="all">All time</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select></div>;
}

export function HistoryLoading() {
  return <div role="status" aria-label="Loading records" aria-busy="true" className="p-5 space-y-4"><span className="sr-only">Loading records…</span>{[1,2,3,4,5].map(n => <Skeleton key={n} className="h-14 w-full" />)}</div>;
}

export function Pagination({ page, total, limit, loading, onChange }: { page: number; total: number; limit: number; loading: boolean; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4 text-xs text-muted"><span className="num">{total ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total.toLocaleString()}` : "0 records"}</span><div className="flex items-center gap-3"><button className="btn !py-1.5 !text-xs" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span className="num">{page} / {pages}</span><button className="btn !py-1.5 !text-xs" disabled={loading || page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}
