import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { and, asc, eq, inArray } from "drizzle-orm";
import { redis } from "./redis.js";
import { env } from "./env.js";
import { db } from "./db/client.js";
import { jobs } from "./db/schema.js";

export const jobQueue = new Queue("background", { connection: redis, defaultJobOptions: {
  attempts: 3, backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 3600, count: 1000 }, removeOnFail: { age: 604800, count: 1000 },
} });
jobQueue.on("error", () => console.error("Job queue unavailable"));
export const enqueueJob = (jobId: number) => jobQueue.add("probe", { jobId }, { jobId: `db-${jobId}` });
let worker: Worker | undefined, workerRedis: Redis | undefined, timer: NodeJS.Timeout | undefined;
let reconciling: Promise<void> | undefined;

export function startWorker() {
  workerRedis = new Redis(env.redisUrl, { maxRetriesPerRequest: null, connectTimeout: 3000 });
  workerRedis.on("error", () => console.error("Worker Redis connection unavailable"));
  worker = new Worker("background", async job => {
    const where = eq(jobs.jobId, Number(job.data.jobId));
    const [row] = await db.select().from(jobs).where(where);
    if (!row || row.status === "completed" || row.status === "failed") return;
    try {
      await db.update(jobs).set({ status: "processing", retryCount: job.attemptsMade }).where(where);
      await new Promise(resolve => setTimeout(resolve, 200));
      await db.update(jobs).set({ status: "completed", completedAt: new Date() }).where(where);
    } catch (err) {
      const final = job.attemptsMade + 1 >= (job.opts.attempts || 1);
      await db.update(jobs).set({ status: final ? "failed" : "queued", retryCount: job.attemptsMade + 1 }).where(where);
      throw err;
    }
  }, { connection: workerRedis, concurrency: 5 });
  worker.on("error", () => console.error("Background worker error"));
  worker.on("failed", () => console.error("Background job failed; check Jobs"));
  const reconcile = () => {
    if (reconciling) return;
    reconciling = (async () => {
      const pending = await db.select({ id: jobs.jobId }).from(jobs)
        .where(and(inArray(jobs.status, ["queued", "processing"]), eq(jobs.jobType, "probe"))).orderBy(asc(jobs.jobId)).limit(100);
      for (const job of pending) {
        const queued = await jobQueue.getJob(`db-${job.id}`);
        if (!queued) { await enqueueJob(job.id); continue; }
        const state = await queued.getState();
        if (state === "failed") await db.update(jobs).set({ status: "failed", retryCount: queued.attemptsMade }).where(eq(jobs.jobId, job.id));
        if (state === "completed") await db.update(jobs).set({ status: "completed", completedAt: new Date(queued.finishedOn || Date.now()) }).where(eq(jobs.jobId, job.id));
      }
    })().catch(() => { console.error("Pending jobs await dependency recovery"); }).finally(() => { reconciling = undefined; });
  };
  timer = setInterval(reconcile, 5000);
  reconcile();
}

export async function stopWorker() {
  clearInterval(timer);
  await reconciling;
  await worker?.close();
  await jobQueue.close();
  await workerRedis?.quit();
}
