"use client";

import RubberSegment from "./reactbits/RubberSegment";

export function SegmentedControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <div className="max-w-full overflow-x-auto"><RubberSegment aria-label={label} items={options} value={value} onChange={onChange} trackColor="#e8ede3" thumbColor="#ffffff" textColor="#6d766e" activeTextColor="#287451" /></div>;
}