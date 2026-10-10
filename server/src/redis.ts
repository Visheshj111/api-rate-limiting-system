import Redis from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 3000, commandTimeout: 3000 });
redis.on("error", () => console.error("Redis connection unavailable"));
