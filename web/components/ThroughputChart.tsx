"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
export type Point = { bucket: string; allowed: number; blocked: number };

export function ThroughputChart({ data }: { data: Point[] }) {
  if (!data.length) return <div className="empty flex-1 min-h-[250px] border-y border-dashed border-line"><span className="font-medium text-ink">A quiet moment.</span><span className="text-xs">Send a few requests to start tracing your traffic.</span></div>;
  return (
    <div className="flex-1 min-h-[250px]" role="img" aria-label="Requests per minute, with solid green for allowed and dashed red for blocked">
      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e8ece5" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="bucket" tickFormatter={v => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} stroke="#7b847c" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} dy={8} />
          <YAxis stroke="#7b847c" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip labelFormatter={v => new Date(String(v)).toLocaleString()} contentStyle={{ background: "#fff", border: "1px solid #e1e5de", borderRadius: 8, fontSize: 12 }} />
          <Area name="Allowed" type="monotone" dataKey="allowed" stroke="#287451" strokeWidth={2} fill="#edf4e5" fillOpacity={.8} dot={data.length === 1} isAnimationActive={false} />
          <Area name="Blocked" type="monotone" dataKey="blocked" stroke="#ba513c" strokeWidth={2} strokeDasharray="4 3" fill="#fbefeb" fillOpacity={.4} dot={data.length === 1} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
