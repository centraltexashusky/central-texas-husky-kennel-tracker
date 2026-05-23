#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const functionsDir = "supabase/functions";

function commandExists(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

if (!commandExists("deno")) {
  console.error("Deno is not installed. Install Deno, then run this script again to type-check Supabase Edge Functions.");
  process.exit(2);
}

const functions = readdirSync(functionsDir)
  .map((name) => ({ name, path: join(functionsDir, name) }))
  .filter((item) => statSync(item.path).isDirectory() && statSync(join(item.path, "index.ts"), { throwIfNoEntry: false }));

let failed = false;
for (const fn of functions) {
  console.log(`Checking ${fn.name}...`);
  const result = spawnSync("deno", ["check", join(fn.path, "index.ts")], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
