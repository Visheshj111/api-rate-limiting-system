"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export type HistoryResult<T> = { rows: T[]; total: number; counts: Record<string, number>; page: number; limit: number };
export function useHistory<T>(resource: "activity" | "jobs", filters: { q: string; status: string; period: string; page: number; algorithm?: string }) {
  const { admin } = useAuth();
  const [data, setData] = useState<HistoryResult<T>>({ rows: [], total: 0, counts: {}, page: 1, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)])).toString();
  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    let busy = false;
    setLoading(true);
    setData({ rows: [], total: 0, counts: {}, page: filters.page, limit: 25 });
    async function load() {
      if (busy) return;
      busy = true;
      try { const result = await api<HistoryResult<T>>(`/api/history/${resource}?${query}`, { signal: controller.signal }); if (!controller.signal.aborted) { setData(result); setError(""); } }
      catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Couldn’t load records."); }
      finally { busy = false; if (!controller.signal.aborted) setLoading(false); }
    }
    const delay = setTimeout(load, 250);
    const poll = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => { controller.abort(); clearTimeout(delay); clearInterval(poll); };
  }, [admin?.adminId, query, resource, revision]);
  return { data, loading, error, refresh: () => setRevision(v => v + 1) };
}
