import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self'${process.env.NODE_ENV === "development" ? " ws: wss:" : ""}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  if (request.nextUrl.protocol === "https:") response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
