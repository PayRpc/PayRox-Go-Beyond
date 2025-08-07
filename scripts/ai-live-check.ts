#!/usr/bin/env ts-node

/**
 * PayRox Go Beyond - AI System Live-Check v2
 * -----------------------------------------
 * ❶ Streams sub-tasks so you see progress immediately
 * ❷ Verifies ManifestDispatcher + facet routes
 * ❸ Produces CI-friendly exit codes (0 = healthy, 1 = warning, 2 = critical)
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { ethers } from "ethers";

// ─── Config ──────────────────────────────────────────────────────────────────
const MANIFEST_PATH = "./artifacts/manifest.json";           // compiled by payrox manifest build
const DISPATCHER_ADDRESS = process.env.DISPATCHER_ADDR ?? ""; // export before running
const NETWORK_RPC       = process.env.RPC_URL ?? "http://localhost:8545";
const TIMEOUT           = 45_000; // ms per sub-task
// ─────────────────────────────────────────────────────────────────────────────

type Section = "core" | "deploy" | "refactor" | "learn" | "loupe" | "yaml" | "sdk";

interface Stat { ok: boolean; critical?: boolean; msg?: string; }

const stats: Record<Section, Stat> = {
  core:      { ok: false, critical: true },
  deploy:    { ok: false, critical: true },
  refactor:  { ok: false },
  learn:     { ok: false },
  loupe:     { ok: false, critical: true },
  yaml:      { ok: false },
  sdk:       { ok: false }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function run(cmd: string, args: string[], section: Section): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT);

    child.stdout.on("data", (d) => process.stdout.write(d));
    child.stderr.on("data", (d) => process.stderr.write(d));

    child.on("exit", (code) => {
      clearTimeout(timer);
      stats[section].ok = code === 0;
      if (code !== 0) stats[section].msg = `${cmd} exited with ${code}`;
      resolve();
    });
  });
}

async function verifyDispatcherAndRoutes(): Promise<void> {
  if (!ethers.isAddress(DISPATCHER_ADDRESS)) {
    stats.loupe = { ok: false, critical: true, msg: "DISPATCHER_ADDR missing/invalid" };
    return;
  }

  try {
    const provider  = new ethers.JsonRpcProvider(NETWORK_RPC);
    const dispatcherAbi = ["function facetAddress(bytes4) view returns (address)"];
    const dispatcher = new ethers.Contract(DISPATCHER_ADDRESS, dispatcherAbi, provider);

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    const mismatches: string[] = [];

    for (const chunk of manifest.chunks) {
      for (const sel of chunk.selectors) {
        const onChain = await dispatcher.facetAddress(sel as string);
        if (onChain.toLowerCase() !== chunk.address.toLowerCase()) {
          mismatches.push(`${sel} ⇒ ${onChain.slice(0,6)}… (manifest ${chunk.name})`);
        }
      }
    }

    if (mismatches.length) {
      stats.loupe = { ok: false, critical: true,
        msg: `Selector drift detected:\n  • ${mismatches.join("\n  • ")}` };
    } else {
      stats.loupe.ok = true;
    }
  } catch (e: any) {
    stats.loupe = { ok: false, critical: true, msg: e.message };
  }
}

function checkYamlFiles(files: string[]): void {
  const bad = files.filter((f) => !fs.existsSync(f) || fs.readFileSync(f).toString().trim() === "");
  stats.yaml.ok = bad.length === 0;
  if (bad.length) stats.yaml.msg = `Missing/empty YAML: ${bad.join(", ")}`;
}
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  console.log(chalk.bold("\n🔎  PayRox AI System – Live Check\n"));

  await run("npm", ["run", "ai:status", "--silent"],     "core");
  await run("npm", ["run", "ai:system", "--silent"],     "deploy");
  await run("node", ["laser-focus-refactor-protocol.js"],"refactor");
  await run("node", ["ai-learning-demonstration.js"],    "learn");

  await verifyDispatcherAndRoutes();
  checkYamlFiles(["./config/app.release.yaml", "./ai-security-deployment.yaml"]);

  // SDK
  stats.sdk.ok = fs.existsSync("./sdk/dist/index.js");
  if (!stats.sdk.ok) stats.sdk.msg = "sdk/dist missing – run `npm run build` in /sdk";

  // ─── Report ───────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━ STATUS ━━━━━━━━━━━━━━━━");
  let criticalFail = false;
  Object.entries(stats).forEach(([k, { ok, critical, msg }]) => {
    const symbol = ok ? chalk.green("✔") : (critical ? chalk.red("✖") : chalk.yellow("•"));
    const line   = `${symbol} ${k.padEnd(9)} ${ok ? "ok" : msg ?? ""}`;
    console.log(line);
    if (!ok && critical) criticalFail = true;
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  process.exit(
    criticalFail ? 2 :
    Object.values(stats).some(s => !s.ok) ? 1 : 0
  );
})();
