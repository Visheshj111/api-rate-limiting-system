import { redis } from "../redis.js";
import { randomUUID } from "node:crypto";

export type Decision = { allowed: boolean; remaining: number; retryAfterMs: number };

const tokenBucketScript = `
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1])
local ts = tonumber(b[2])
if tokens == nil then tokens = capacity; ts = now end
tokens = math.min(capacity, tokens + math.max(0, now - ts) / 1000 * rate)
local allowed, retry = 0, 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1
else retry = math.ceil((1 - tokens) / rate * 1000) end
redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / rate * 1000) + 1000)
return { allowed, math.floor(tokens), retry }
`;

const slidingWindowScript = `
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
local count = redis.call('ZCARD', KEYS[1])
local allowed, retry = 0, 0
if count < limit then redis.call('ZADD', KEYS[1], now, ARGV[4]); allowed = 1
else
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  retry = tonumber(oldest[2]) + window - now
end
redis.call('PEXPIRE', KEYS[1], window)
local remaining = math.max(0, limit - redis.call('ZCARD', KEYS[1]))
return { allowed, remaining, retry }
`;

export type LimitConfig = {
  clientId: number;
  rateLimit: number;
  windowSeconds: number;
  algorithm: string;
  revision?: number;
};

export async function checkLimit(cfg: LimitConfig): Promise<Decision> {
  let raw: number[];

  if (cfg.algorithm === "sliding_window") {
    raw = (await redis.eval(
      slidingWindowScript,
      1,
      `rl:sw:${cfg.clientId}:${cfg.revision || 1}`,
      cfg.rateLimit,
      cfg.windowSeconds * 1000,
      0,
      randomUUID()
    )) as number[];
  } else {
    const rate = cfg.rateLimit / cfg.windowSeconds;
    raw = (await redis.eval(
      tokenBucketScript,
      1,
      `rl:tb:${cfg.clientId}:${cfg.revision || 1}`,
      cfg.rateLimit,
      rate,
      0
    )) as number[];
  }

  return {
    allowed: raw[0] === 1,
    remaining: raw[1],
    retryAfterMs: Math.max(0, raw[2]),
  };
}
