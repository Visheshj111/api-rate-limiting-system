import CallChip, { type CallChipStatus } from "./reactbits/CallChip";

const phases: Record<string, CallChipStatus> = { queued: "idle", processing: "running", completed: "done", failed: "error" };

export function JobChip({ status }: { status: string }) {
  return <CallChip name={status} argument="" status={phases[status] || "idle"} showTimer={false} size={30} color="#6d766e" surfaceColor="#f2f4ef" progressColor="#287451" doneColor="#287451" errorColor="#ba513c" />;
}