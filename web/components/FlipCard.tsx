"use client";

import { type ReactNode } from "react";
import OriginalFlipCard from "./reactbits/FlipCard";

export function FlipCard({ front, back }: { front: ReactNode; back: ReactNode }) {
  return <OriginalFlipCard ariaLabel="Flip account card" height={300} background="#eaf0e0" color="#202923" shadowColor="#6e815b" shadowOpacity={0.16} front={<div className="flex h-full flex-col p-6">{front}</div>} back={<div className="flex h-full flex-col p-6">{back}</div>} />;
}
