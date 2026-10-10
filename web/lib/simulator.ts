export type Simulation = { now: number; tokens: number; acceptedAt: number[]; bucketAllowed: number; bucketBlocked: number; windowAllowed: number; windowBlocked: number };
export const freshSimulation = (capacity: number): Simulation => ({ now: 0, tokens: capacity, acceptedAt: [], bucketAllowed: 0, bucketBlocked: 0, windowAllowed: 0, windowBlocked: 0 });

export function advanceSimulation(state: Simulation, seconds: number, capacity: number, windowSeconds: number): Simulation {
  const now = state.now + Math.max(0, seconds);
  return { ...state, now, tokens: Math.min(capacity, state.tokens + (now - state.now) * capacity / windowSeconds), acceptedAt: state.acceptedAt.filter(time => time > now - windowSeconds) };
}

export function sendBurst(state: Simulation, count: number, capacity: number) {
  const bucketAllowed = Math.min(count, Math.floor(state.tokens));
  const windowAllowed = Math.min(count, Math.max(0, capacity - state.acceptedAt.length));
  return { state: { ...state, tokens: state.tokens - bucketAllowed, acceptedAt: [...state.acceptedAt, ...Array(windowAllowed).fill(state.now)], bucketAllowed: state.bucketAllowed + bucketAllowed, bucketBlocked: state.bucketBlocked + count - bucketAllowed, windowAllowed: state.windowAllowed + windowAllowed, windowBlocked: state.windowBlocked + count - windowAllowed }, result: { time: state.now, count, bucketAllowed, windowAllowed } };
}
