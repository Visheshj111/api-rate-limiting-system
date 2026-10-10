"use client";

import Link from "next/link";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="empty min-h-screen" role="alert"><h1 className="text-2xl font-semibold text-ink">Something interrupted this page.</h1><p className="max-w-sm">Try loading it again. Your saved account and client settings are still stored.</p><div className="flex gap-3 mt-4"><button onClick={reset} className="btn btn-primary">Try again</button><Link href="/dashboard" className="btn">Back to overview</Link></div></main>;
}
