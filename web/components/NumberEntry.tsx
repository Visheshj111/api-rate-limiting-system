"use client";

import { useEffect, useState } from "react";
import CodeSlots from "./reactbits/CodeSlots";

export function NumberEntry({ label, value, onChange, onCommit, min = 1, max = 9999, disabled = false }: { label: string; value: number; onChange?: (value: number) => void; onCommit?: (value: number) => void | Promise<boolean | void>; min?: number; max?: number; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setDraft(String(value)); setInvalid(false); }, [value]);
  useEffect(() => { if (!saved) return; const timer = setTimeout(() => setSaved(false), 900); return () => clearTimeout(timer); }, [saved]);
  const length = String(max).length;
  function change(code: string) {
    setDraft(code); setInvalid(false); setSaved(false);
    const next = Number(code);
    if (code && next >= min && next <= max && next !== value) onChange?.(next);
  }
  async function commit() {
    const next = Number(draft);
    if (!draft || next < min || next > max) { setInvalid(true); return; }
    if (onCommit && next !== value && await onCommit(next) !== false) setSaved(true);
  }
  return <div className="relative max-w-full" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}>
    {onChange && <input type="number" aria-hidden="true" tabIndex={-1} className="sr-only" required min={min} max={max} value={draft} disabled={disabled} onChange={() => {}} onInvalid={e => { e.preventDefault(); setInvalid(true); e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[type="text"]')?.focus(); }} />}
    <div className="max-w-full overflow-x-auto py-1"><CodeSlots ariaLabel={label} value={draft} onChange={change} length={length} slotSize={length > 3 ? 30 : 44} gap={6} radius={10} accentColor="#287451" inkColor="#287451" slotColor="#e4ebdc" digitColor="#ffffff" dangerColor="#ba513c" status={invalid ? "error" : saved ? "success" : "idle"} disabled={disabled} /></div>
    {onCommit && <button type="button" className="text-[10px] text-mint underline underline-offset-4 mt-1" disabled={disabled || saved || !draft || Number(draft) === value} onClick={commit}>Save number</button>}
    {invalid && <span role="alert" className="block text-[10px] text-rose mt-1">Enter {min}–{max}.</span>}
  </div>;
}
