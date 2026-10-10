import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceSimulation, freshSimulation, sendBurst } from "../../web/lib/simulator.js";
import { toCsv } from "../../web/lib/csv.js";

test("both models enforce a fresh burst budget", () => {
  const { state, result } = sendBurst(freshSimulation(5), 12, 5);
  assert.deepEqual(result, { time: 0, count: 12, bucketAllowed: 5, windowAllowed: 5 });
  assert.equal(state.tokens, 0); assert.equal(state.acceptedAt.length, 5);
  assert.equal(state.bucketBlocked, 7); assert.equal(state.windowBlocked, 7);
});

test("token bucket refills while the sliding window retains recent requests", () => {
  const first = sendBurst(freshSimulation(5), 5, 5).state;
  const waiting = advanceSimulation(first, 2, 5, 10);
  const { state, result } = sendBurst(waiting, 1, 5);
  assert.equal(result.bucketAllowed, 1); assert.equal(result.windowAllowed, 0);
  assert.equal(state.bucketAllowed, 6); assert.equal(state.windowAllowed, 5);
});

test("sliding window expires requests at the exact boundary and bucket caps refill", () => {
  const first = sendBurst(freshSimulation(5), 5, 5).state;
  const waiting = advanceSimulation(first, 10, 5, 10);
  assert.equal(waiting.acceptedAt.length, 0); assert.equal(waiting.tokens, 5);
  assert.equal(advanceSimulation(waiting, 100, 5, 10).tokens, 5);
  assert.equal(sendBurst(waiting, 5, 5).result.windowAllowed, 5);
});

test("fractional tokens cannot admit a request; rejected requests occupy no slots", () => {
  let state = sendBurst(freshSimulation(2), 2, 2).state;
  state = advanceSimulation(state, 1, 2, 10);
  const next = sendBurst(state, 10, 2).state;
  assert.equal(next.tokens, .2); assert.equal(next.acceptedAt.length, 2);
  assert.equal(next.windowBlocked, 10);
});

test("CSV quotes values and neutralizes spreadsheet formulas", () => {
  assert.equal(toCsv([["  =SUM(A1)"]]), '"\'  =SUM(A1)"');
  assert.equal(toCsv([[1, 'hello,"world"', '=SUM(A1)', null], ["+cmd", "normal", "@test", "-12"]]), '"1","hello,""world""","\'=SUM(A1)",""\r\n"\'+cmd","normal","\'@test","\'-12"');
});
