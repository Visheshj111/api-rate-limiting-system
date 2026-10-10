"use client";

import OriginalCometDial from "./reactbits/CometDial";

export function CometDial({ value, onChange, min = 1, max = 200, label = "Requests", disabled = false }: { value: number; onChange: (value: number) => void; min?: number; max?: number; label?: string; disabled?: boolean }) {
  return <OriginalCometDial value={value} onChange={onChange} min={min} max={max} label={label} unit="" disabled={disabled} accent="#287451" ink="#202923" size={200} className="mx-auto" />;
}