"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { NumberEntry } from "@/components/NumberEntry";
import { CometDial } from "@/components/CometDial";
import { advanceSimulation, freshSimulation, sendBurst } from "@/lib/simulator";

type Burst = ReturnType<typeof sendBurst>["result"] & { id: number };

export default function Lab() {
  const [capacity, setCapacity] = useState(5);
  const [windowSeconds, setWindow] = useState(10);
  const [count, setCount] = useState(12);
  const [state, setState] = useState(() => freshSimulation(5));
  const [bursts, setBursts] = useState<Burst[]>([]);
  function reset(nextCapacity = capacity) { setState(freshSimulation(nextCapacity)); setBursts([]); }
  function burst() {
    const next = sendBurst(state, count, capacity);
    setState(next.state); setBursts(v => [{ ...next.result, id: (v[0]?.id || 0) + 1 }, ...v].slice(0, 12));
  }
  function example() {
    setCapacity(5); setWindow(10); setCount(1);
    const first = sendBurst(freshSimulation(5), 5, 5);
    const next = sendBurst(advanceSimulation(first.state, 2, 5, 10), 1, 5);
    setState(next.state); setBursts([{ ...next.result, id: 2 }, { ...first.result, id: 1 }]);
  }
  return <Shell>
    <div className="page-head"><div><div className="eyebrow mb-2">Workspace / Algorithm Lab</div><h1>Same traffic. Different rules.</h1><p>Turn the dial, send a burst, and see what happens.</p></div><span className="badge badge-green"><Icon name="lab" size={14} />Local simulation</span></div>
    <div className="grid xl:grid-cols-[270px_minmax(0,1fr)] gap-5 items-start">
      <section className="panel !bg-[#f2f4ec] p-6"><div className="section-head mb-5"><h2>Your experiment</h2><span className="num text-xs text-mint">T + {state.now}s</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4"><div><span className="field-label">Request budget</span><NumberEntry label="Lab request budget" value={capacity} max={100} onChange={n => { setCapacity(n); reset(n); }} /></div><div><span className="field-label">Window (seconds)</span><NumberEntry label="Lab window in seconds" value={windowSeconds} max={120} onChange={n => { setWindow(n); reset(); }} /></div></div>
        <p className="text-[10px] text-muted mt-3 leading-relaxed">Changing the budget or window starts a fresh experiment.</p>
        <CometDial label="Burst size" value={count} onChange={setCount} max={100} />
        <div className="flex justify-center gap-2 mb-4">{[1,5,12,30].map(n => <button key={n} aria-pressed={count === n} onClick={() => setCount(n)} className={`num text-[10px] rounded-full border px-3 py-1 ${count === n ? "border-mint/30 bg-white text-mint" : "border-transparent text-muted"}`}>{n}</button>)}</div>
        <button onClick={burst} className="btn btn-primary w-full">Send burst <Icon name="arrow" size={15} /></button>
        <div className="mt-6 pt-5 border-t border-[#dce3d1]"><span className="field-label">Move the clock forward</span><div className="flex gap-2 flex-wrap">{[1, 2, windowSeconds].filter((n, i, list) => list.indexOf(n) === i).map(n => <button key={n} onClick={() => setState(v => advanceSimulation(v, n, capacity, windowSeconds))} className="btn !px-3 !py-2 !text-xs num">+{n}s</button>)}</div><div className="mt-5 flex justify-between text-xs"><button onClick={() => reset()} className="underline underline-offset-4 text-muted">Reset</button><button onClick={example} className="underline underline-offset-4 text-mint">Try an example</button></div></div>
      </section>
      <div className="space-y-5 min-w-0"><div className="grid md:grid-cols-2 gap-5">
        <section className="panel overflow-hidden"><div className="p-6 border-b border-line"><div className="flex justify-between"><span className="eyebrow">01 / Token bucket</span><Icon name="activity" size={17} /></div><h2 className="text-xl font-semibold tracking-tight mt-4">Room for a burst.</h2><p className="text-xs leading-relaxed text-muted mt-2">Tokens refill steadily. One token buys one request.</p></div><div className="p-6"><div className="flex items-baseline gap-2 mb-5"><span className="num text-4xl text-mint" aria-label="Available tokens">{Number(state.tokens.toFixed(2))}</span><span className="text-xs text-muted">/ {capacity} tokens</span></div><div className="token-reservoir" aria-hidden="true">{Array.from({ length: Math.min(capacity, 30) }, (_, i) => <span key={i}><i style={{ height: `${Math.min(1, Math.max(0, state.tokens - i)) * 100}%` }} /></span>)}</div><p className="mt-3 text-[10px] text-muted num">{(capacity / windowSeconds).toFixed(2)} tokens / second{capacity > 30 ? " · First 30 shown" : ""}</p><Result allowed={state.bucketAllowed} blocked={state.bucketBlocked} /></div></section>
        <section className="panel overflow-hidden"><div className="p-6 border-b border-line"><div className="flex justify-between"><span className="eyebrow">02 / Sliding window</span><Icon name="chart" size={17} /></div><h2 className="text-xl font-semibold tracking-tight mt-4">Keep the recent past.</h2><p className="text-xs leading-relaxed text-muted mt-2">Each accepted request holds a slot for the whole window.</p></div><div className="p-6"><div className="flex items-baseline gap-2 mb-5"><span className="num text-4xl text-[#a77c48]" aria-label="Available window slots">{capacity - state.acceptedAt.length}</span><span className="text-xs text-muted">/ {capacity} slots free</span></div><div className="window-slots" aria-hidden="true">{Array.from({ length: Math.min(capacity, 12) }, (_, i) => <span key={i} data-occupied={i < state.acceptedAt.length || undefined}>{i < state.acceptedAt.length ? `${Math.ceil(windowSeconds - state.now + state.acceptedAt[i])}s` : "—"}</span>)}</div><p className="mt-3 text-[10px] text-muted num">Time until each occupied slot clears{capacity > 12 ? " · First 12 shown" : ""}</p><Result allowed={state.windowAllowed} blocked={state.windowBlocked} /></div></section>
      </div>
      <section className="panel overflow-hidden"><div className="p-5 section-head"><div><h2>The experiment log</h2><p>Last 12 bursts · Counts compare the same instant of traffic</p></div><span className="badge bg-surface2 num text-muted">{bursts.length} bursts</span></div>{bursts.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Clock</th><th>Burst</th><th>Token bucket</th><th>Sliding window</th></tr></thead><tbody>{bursts.map(item => <tr key={item.id}><td className="num text-xs">T + {item.time}s</td><td className="num text-xs">{item.count} requests</td><td><Decision allowed={item.bucketAllowed} count={item.count} /></td><td><Decision allowed={item.windowAllowed} count={item.count} /></td></tr>)}</tbody></table></div> : <div className="empty !min-h-40"><Icon name="lab" size={25} /><span>Every experiment starts with a little traffic.</span><span className="text-xs">Send your first burst or try the example.</span></div>}</section>
      <p className="text-[11px] leading-relaxed text-muted">Both models start with a fresh budget. Time moves only when you advance it. This lab does not send API requests or change saved client settings.</p>
      </div>
    </div>
  </Shell>;
}

function Result({ allowed, blocked }: { allowed: number; blocked: number }) {
  return <div className="mt-6 pt-4 border-t border-line flex justify-between num text-[11px]"><span className="text-mint">{allowed} allowed</span><span className="text-rose">{blocked} blocked</span></div>;
}
function Decision({ allowed, count }: { allowed: number; count: number }) {
  return <span className="flex gap-3 num text-[11px]"><span className="text-mint">{allowed} allowed</span><span className="text-rose">{count - allowed} blocked</span></span>;
}
