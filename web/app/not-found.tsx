import Link from "next/link";

export default function NotFound() {
  return <main className="empty min-h-screen"><span className="eyebrow">404 / A wrong turn</span><h1 className="text-3xl font-semibold text-ink">This page isn’t here.</h1><p>Head back to your workspace to find what you need.</p><Link href="/dashboard" className="btn btn-primary mt-4">Back to overview</Link></main>;
}
