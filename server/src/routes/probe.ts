import { Router } from "express";
import { db } from "../db/client.js";
import { jobs } from "../db/schema.js";
import { rateLimit } from "../ratelimit/middleware.js";
import { enqueueJob } from "../queue.js";
import { wrap } from "../lib/auth.js";

export const probeRouter = Router();

probeRouter.get("/probe", rateLimit, wrap(async (_req, res) => {
  const client = res.locals.client;

  const [job] = await db
    .insert(jobs)
    .values({ clientId: client.clientId, jobType: "probe", payload: { at: Date.now() } })
    .returning({ jobId: jobs.jobId });

  try { await enqueueJob(job.jobId); }
  catch { return res.status(202).json({ status: "allowed", jobId: job.jobId, message: "Accepted; durable job awaits queue recovery." }); }

  res.json({ status: "allowed", jobId: job.jobId, message: "request accepted and queued" });
}));
