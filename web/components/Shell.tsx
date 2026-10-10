"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Mark } from "./Mark";
import { Icon } from "./Icon";
import { PageSkeleton, Skeleton } from "./Skeleton";
import { BranchedNav } from "./BranchedNav";

export function Shell({ children }: { children: React.ReactNode }) {
  const { admin, ready, logout, error, refresh } = useAuth();
  const [signoutError, setSignoutError] = useState("");
  const path = usePathname();
  const router = useRouter();
  useEffect(() => { if (ready && !admin && !error) router.replace("/login"); }, [ready, admin, error, router]);
  if (error && !admin) return <div className="empty min-h-screen"><p role="alert">{error}</p><button onClick={refresh} className="btn">Try again</button></div>;
  if (!ready || !admin) return <div className="min-h-screen"><aside className="sidebar"><Skeleton className="h-9 w-40" /><Skeleton className="h-32 w-full mt-10" /></aside><div className="app-main"><div className="topbar"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-8 rounded-full" /></div><main className="page-content"><PageSkeleton kind={path === "/settings" ? "settings" : path === "/clients" ? "clients" : "dashboard"} /></main></div></div>;

  return (
    <div className="min-h-screen">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn">Skip to content</a>
      <aside className="sidebar">
        <Link href="/dashboard" className="flex items-center gap-2.5 lg:px-2">
          <Mark /><span className="text-[17px] font-semibold tracking-[-.04em]">QueueShield<span className="hidden lg:block text-[10px] font-normal tracking-normal text-muted">API traffic control</span></span>
        </Link>
        <BranchedNav />
        <div className="hidden lg:block mt-auto">
          <div className="rounded-lg border border-[#dce3d1] bg-[#eaf0e0] p-4 mb-5">
            <span className="eyebrow text-[#546847]">One shared limit.</span>
            <p className="mt-2 text-xs leading-relaxed text-[#546847]">Every instance uses the same Redis state to make its next decision.</p>
            <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">{[1,2,3,4,5,6,7,8].map(n => <span key={n} className="h-3 flex-1 rounded-sm bg-[#b7cda3]" style={{ opacity: n / 10 + .2 }} />)}</div>
          </div>
          <p className="px-3 text-[10px] text-muted num">API RATE LIMITING SYSTEM</p>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="flex items-center gap-3 text-xs"><span className="text-muted">Workspace</span><span className="text-muted/50">/</span><span>{{ "/dashboard": "Overview", "/clients": "Clients", "/settings": "Settings", "/activity": "Activity", "/jobs": "Jobs", "/lab": "Algorithm Lab" }[path] || "Workspace"}</span></div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted truncate max-w-48">{admin.email}</span>
            <Link href="/settings" aria-label="Account settings" className="client-avatar !h-7 !w-7 !rounded-full overflow-hidden text-[10px]">{admin.avatar ? <img src={admin.avatar} alt="" className="w-full h-full object-cover" /> : (admin.name || admin.email).slice(0, 2).toUpperCase()}</Link>
            <button onClick={() => logout().catch(() => setSignoutError("Couldn’t sign out. Please try again."))} aria-label="Sign out" title="Sign out" className="text-muted hover:text-ink p-1.5"><Icon name="logout" size={16} /></button>
          </div>
        </header>
        <main id="content" className="page-content rise">{signoutError && <p role="alert" className="error mb-5">{signoutError}</p>}{children}</main>
        <footer className="mx-4 sm:mx-8 border-t border-line py-5 text-[10px] text-muted">QueueShield / Distributed API rate limiting</footer>
      </div>
    </div>
  );
}
