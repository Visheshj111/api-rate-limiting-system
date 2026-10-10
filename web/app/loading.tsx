"use client";

import { usePathname } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PageSkeleton } from "@/components/Skeleton";

export default function Loading() {
  const path = usePathname();
  const kind = path === "/clients" || path === "/activity" || path === "/jobs" ? "clients" : path === "/settings" || path === "/lab" ? "settings" : "dashboard";
  return <Shell><PageSkeleton kind={kind} /></Shell>;
}
