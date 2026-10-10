import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../env.js";

const key = createHash("sha256").update(env.apiKeySecret).digest();
export const hashKey = (value: string) => createHash("sha256").update(value).digest("hex");
export function sealKey(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}
export function openKey(value: string) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("API key requires rotation");
  const cipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([cipher.update(Buffer.from(ciphertext, "base64url")), cipher.final()]).toString("utf8");
}
export function publicClient<T extends { apiKey: string; apiKeyHash: string | null }>(client: T) {
  const { apiKeyHash, ...row } = client;
  return { ...row, apiKey: openKey(client.apiKey) };
}
