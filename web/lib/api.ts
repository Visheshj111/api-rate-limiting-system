const BASE = "";

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; auth?: boolean; signal?: AbortSignal } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
    credentials: "include",
    signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false && typeof window !== "undefined") window.dispatchEvent(new Event("qs:unauthorized"));
    throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function probe(apiKey: string, signal?: AbortSignal): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${BASE}/api/probe`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
  });
  return { ok: res.ok, status: res.status };
}
