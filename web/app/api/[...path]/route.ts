import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!["auth", "clients", "probe", "reports", "history"].includes(path[0])) return NextResponse.json({ error: "Endpoint not found." }, { status: 404 });
  const target = new URL(process.env.API_URL || "http://localhost:4000");
  target.pathname = `/api/${path.map(encodeURIComponent).join("/")}`;
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const key of ["cookie", "authorization", "content-type", "x-api-key", "origin"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (process.env.APP_PROXY_SECRET) headers.set("x-proxy-secret", process.env.APP_PROXY_SECRET);
  if (process.env.VERCEL) headers.set("x-client-ip", request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "");
  try {
    let body: string | undefined;
    if (!["GET", "HEAD"].includes(request.method) && request.body) {
      const reader = request.body.getReader(), chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 262144) { await reader.cancel(); return NextResponse.json({ error: "Request is too large." }, { status: 413 }); }
        chunks.push(part.value);
      }
      body = Buffer.concat(chunks).toString("utf8");
    }
    const upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(20000) });
    const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
    for (const key of ["content-type", "retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-status", "x-request-id"]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: "The API is temporarily unavailable. Please retry shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
