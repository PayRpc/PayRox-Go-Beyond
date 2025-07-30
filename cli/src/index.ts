#!/usr/bin/env node

import { Command } from "commander";
import { spawn } from "child_process";

const program = new Command();

program
  .name("payrox")
  .description("PayRox-Go-Beyond one-click release")
  .version("0.1.0");

program
  .command("release")
  .description("Build manifest, stage chunks if needed, deploy factory/dispatcher, orchestrate activation")
  .option("-n, --network <name>", "Hardhat network name", "sepolia")
  .option("-c, --config <file>", "Release YAML", "config/app.release.yaml")
  .option("--no-verify", "Skip onchain verification checks")
  .action((opts) => {
    const args = ["oneclick:release", "--network", opts.network, "--config", opts.config];
    if (opts.verify === false) {
      args.push("--no-verify");
    }

    const hh = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(hh, ["hardhat", ...args], { stdio: "inherit", cwd: process.cwd() });

    child.on("exit", (code) => process.exit(code ?? 0));
  });

program.parse(process.argv);
