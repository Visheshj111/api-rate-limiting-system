"use client";

import { useState, type InputHTMLAttributes } from "react";

export function PasswordField({ label, fresh, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; fresh?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <label className="block"><span className="field-label">{label}</span><span className="relative block"><input {...props} aria-label={label} required type={visible ? "text" : "password"} autoComplete={fresh ? "new-password" : "current-password"} minLength={fresh ? 12 : undefined} maxLength={fresh ? 72 : undefined} className="field !pr-16" /><button type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{visible ? "Hide" : "Show"}</button></span></label>;
}

export function PasswordHint() {
  return <p className="text-[11px] leading-relaxed text-muted">12–72 characters with uppercase, lowercase, a number, and a symbol. Known breached passwords are rejected.</p>;
}
