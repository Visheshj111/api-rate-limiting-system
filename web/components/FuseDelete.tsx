"use client";

import FuseButton from "./reactbits/FuseButton";
import { Icon } from "./Icon";

export function FuseDelete({ label, disabled, onDelete }: { label: string; disabled?: boolean; onDelete: () => void }) {
  return <span role="group" aria-label={`Delete ${label}`}><FuseButton label="Delete" undoLabel="Undo" doneLabel="Deleted" icon={<Icon name="trash" size={14} />} size="sm" color="#ba513c" background="#fbefeb" fuseColor="#ba513c" disabled={disabled} commitOn="fuseEnd" onCommit={onDelete} className="min-w-[110px]" /></span>;
}
