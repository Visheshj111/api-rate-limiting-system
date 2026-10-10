export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function PageSkeleton({ kind = "dashboard" }: { kind?: "dashboard" | "clients" | "settings" }) {
  return <div role="status" aria-label="Loading content" aria-busy="true" className="space-y-6"><span className="sr-only">Loading…</span><div className="space-y-3"><Skeleton className="h-3 w-40" /><Skeleton className="h-9 w-60" /><Skeleton className="h-4 w-72 max-w-full" /></div>
    {kind === "dashboard" && <div className="metric-grid">{[1,2,3,4].map(n => <div key={n} className="metric space-y-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-20" /><Skeleton className="h-2 w-32 max-w-full" /></div>)}</div>}
    {kind === "clients" ? <div className="panel p-5 space-y-5"><div className="flex justify-between"><Skeleton className="h-5 w-40" /><Skeleton className="h-8 w-32" /></div>{[1,2,3,4,5].map(n => <Skeleton key={n} className="h-14 w-full" />)}</div>
    : <div className="grid lg:grid-cols-[1fr_300px] gap-5"><div className="panel p-6 space-y-6"><Skeleton className="h-5 w-40" /><Skeleton className={kind === "settings" ? "h-72 w-full" : "h-56 w-full"} /></div><div className="panel p-6 space-y-5"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-10 w-full" /></div></div>}
  </div>;
}
