"use client";

import OriginalBellToggle from "./reactbits/BellToggle";

export function BellToggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <OriginalBellToggle label={label} pressed={checked} onChange={onChange} disabled={disabled} size="sm" color="#6d766e" background="#f2f4ef" onColor="#287451" onBackground="#e4ebdc" className="shrink-0" />;
}