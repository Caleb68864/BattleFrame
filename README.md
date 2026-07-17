# BattleFrame

A Foundry VTT v14 game system, developed as an npm workspaces monorepo.

## Layout

- `packages/battleframe/` — the Foundry system package (manifest, source, built module).
- `vault/` — research notes (tracked); source rulebooks are kept local only, never committed.

## Development

```
npm install
npm run build
npm test
```

`npm run build` compiles `packages/battleframe/src/battleframe.ts` into
`packages/battleframe/dist/battleframe.js`, the ES module referenced by
`packages/battleframe/system.json`.

To try the system in Foundry, copy `packages/battleframe/` into your Foundry
`Data/systems/battleframe/` directory (after running `npm run build`) and
create a world using it.
