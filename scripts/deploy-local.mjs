#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const EXCLUDE = new Set(["node_modules", "src", "tests", "vite.config.ts", "package.json"]);

// An allow-list would be safer than a deny-list, but the package shape is still
// moving. Until then: never ship crash dumps, logs, or editor droppings. Caught
// during the first real deploy -- a bash.exe.stackdump had landed inside the
// system package and would have been copied into Foundry verbatim.
const EXCLUDE_PATTERNS = [/\.stackdump$/i, /\.log$/i, /^\.DS_Store$/, /^Thumbs\.db$/];

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
      const base = src.split(/[\\/]/).pop() ?? "";
      if (EXCLUDE.has(base)) return false;
      return !EXCLUDE_PATTERNS.some((p) => p.test(base));
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
  copyPackage("battleframe-simple-skirmish", modulesDir);

  console.log(`deploy-local | done -- deployed to ${destRoot}`);
}

main();
