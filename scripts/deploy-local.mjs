#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const EXCLUDE = new Set(["node_modules", "src", "tests", "vite.config.ts", "package.json"]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dest") {
      args.dest = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function copyPackage(packageDirName, destParent) {
  const source = join(REPO_ROOT, "packages", packageDirName);
  const destination = join(destParent, packageDirName);

  if (!existsSync(source)) {
    throw new Error(`deploy-local: expected package directory not found: ${source}`);
  }

  mkdirSync(destParent, { recursive: true });

  if (existsSync(destination)) {
    rmSync(destination, { recursive: true, force: true });
  }

  cpSync(source, destination, {
    recursive: true,
    filter: (src) => {
      const base = src.split(/[\\/]/).pop();
      return !EXCLUDE.has(base ?? "");
    },
  });

  console.log(`deploy-local | copied ${packageDirName} -> ${destination}`);
}

function main() {
  const { dest } = parseArgs(process.argv.slice(2));

  if (!dest) {
    console.error("deploy-local: missing required --dest <foundry-data-dir>");
    process.exit(1);
    return;
  }

  const destRoot = resolve(dest);
  const systemsDir = join(destRoot, "Data", "systems");
  const modulesDir = join(destRoot, "Data", "modules");

  copyPackage("battleframe", systemsDir);
  copyPackage("battleframe-greathelm", modulesDir);

  console.log(`deploy-local | done -- deployed to ${destRoot}`);
}

main();
