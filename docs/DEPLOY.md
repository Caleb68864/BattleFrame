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

## Manual verification checklist

Once deployed, follow the end-to-end steps in the master spec's
Verification section: create a world on Battleframe, enable
`battleframe-greathelm`, select it as primary, deploy two forces of six
knights, and play a full round (dice pool -> actions -> clash ->
courage). See `docs/specs/2026-07-16-battleframe-core-mvp.md` for the
full checklist -- this script only gets the code onto disk, it does not
replace playing the game.
