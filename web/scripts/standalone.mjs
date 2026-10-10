import { cp, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const build = process.env.NEXT_BUILD_DIR || ".next";
if (process.argv[2] === "prepare") {
  await mkdir(`${build}/standalone/${build}`, { recursive: true });
  await cp(`${build}/static`, `${build}/standalone/${build}/static`, { recursive: true });
  if (await access("public").then(() => true, () => false)) await cp("public", `${build}/standalone/public`, { recursive: true });
} else {
  process.env.HOSTNAME ||= "0.0.0.0";
  await import(pathToFileURL(resolve(build, "standalone/server.js")).href);
}
