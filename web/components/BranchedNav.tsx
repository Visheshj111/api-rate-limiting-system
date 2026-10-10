"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BranchedMenu from "./reactbits/BranchedMenu";
import { Icon } from "./Icon";

const groups = [
  { label: "Traffic", children: [{ value: "/dashboard", label: "Overview", icon: <Icon name="chart" size={16} /> }, { value: "/activity", label: "Activity", icon: <Icon name="activity" size={16} /> }] },
  { label: "Workspace", children: [{ value: "/clients", label: "Clients", icon: <Icon name="clients" size={16} /> }, { value: "/jobs", label: "Jobs", icon: <Icon name="jobs" size={16} /> }, { value: "/lab", label: "Algorithm Lab", icon: <Icon name="lab" size={16} /> }] },
  { label: "Account", children: [{ value: "/settings", label: "Settings", icon: <Icon name="settings" size={16} /> }] },
];

export function BranchedNav() {
  const path = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  return <div className="workspace-navigation">
    <button type="button" className="btn !px-3 !py-2 !text-xs lg:hidden" aria-label="Browse workspace" aria-expanded={expanded} aria-controls="workspace-menu" onClick={() => setExpanded(!expanded)}>Browse <Icon name="chevron" size={14} /></button>
    <div id="workspace-menu" className={`workspace-menu ${expanded ? "block" : "hidden"} lg:block`}><BranchedMenu key={path} items={groups} defaultOpen={[0, 1, 2]} defaultActive={path} onSelect={value => { router.push(value); setExpanded(false); }} width={184} fontSize={12} indent={28} trunk={8} color="#202923" accentColor="#287451" lineColor="#c4d0b9" /></div>
  </div>;
}