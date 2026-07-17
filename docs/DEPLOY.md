# Deploying to a local Foundry instance

`scripts/deploy-local.mjs` copies the built `battleframe` system and the
`battleframe-greathelm` module into a local Foundry v14 `Data` directory, for
manual verification in a real Foundry world. It does not build first --
run `npm run build` beforehand if you want compiled `dist/` output included.

## Usage

```
npm install && npm run build
node scripts/deploy-local.mjs --dest "<path to Foundry user data directory>"
```

`<path to Foundry user data directory>` is the directory that contains
`Data/`, `Config/`, and `Logs/` (on Windows, typically
`%LOCALAPPDATA%/FoundryVTT`).

The script copies:

- `packages/battleframe` -> `<dest>/Data/systems/battleframe`
- `packages/battleframe-greathelm` -> `<dest>/Data/modules/battleframe-greathelm`

excluding `node_modules`, `src`, `tests`, `vite.config.ts`, and
`package.json` from each package -- Foundry only needs the manifest,
`dist/`, `lang/`, and `templates/`.

Re-running the script replaces any previously deployed copy of each
package; it does not touch anything else under `Data/systems` or
`Data/modules`.

## Two things that will waste your afternoon

Both learned the hard way against a live v14.363 instance on 2026-07-17.

### 1. Foundry only scans `Data/systems` at startup

Deploying a **new** system to a running Foundry does nothing visible — it will
not appear in the Create World dropdown, with no error anywhere. **Restart
Foundry after adding a system for the first time.** Updating an
already-registered system does not need this.

### 2. System JS is cached for four hours

Foundry serves `dist/*.js` with:

```
Cache-Control: max-age=14400
```

So after a redeploy, **the browser keeps running your old code for up to four
hours** and will not even revalidate. This is the single most confusing thing
about iterating on a Foundry system: your fix is on the server, the served
bytes are correct, and the world still behaves like the old build.

**Always hard-reload (Ctrl+Shift+R / Cmd+Shift+R) after a redeploy.** If you
are automating a browser, purging `caches` and unregistering service workers is
*not* enough — neither is involved; it is the plain HTTP cache.

To confirm what the server actually has, bypass the browser entirely:

```
curl -s "<host>/systems/battleframe/dist/battleframe.js?cb=$(date +%s)" \
  | cmp - packages/battleframe/dist/battleframe.js && echo "server has your build"
```

If that says the server has your build but the world disagrees, it is the
cache — not your code.

## Manual verification checklist

Once deployed, follow the end-to-end steps in the master spec's
Verification section: create a world on Battleframe, enable
`battleframe-greathelm`, select it as primary, deploy two forces of six
knights, and play a full round (dice pool -> actions -> clash ->
courage). See `docs/specs/2026-07-16-battleframe-core-mvp.md` for the
full checklist -- this script only gets the code onto disk, it does not
replace playing the game.
