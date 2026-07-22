# Fleet import format

The **Import Fleet** tool (the file-import icon in the Full Thrust scene control)
takes a JSON fleet you write yourself and turns it into ship Actors you own. This
module ships **no** fleet data — bring your own designs.

> **Actor-creation permission.** Foundry gates *creating actors* behind a world
> setting. If a player can't import, the GM enables **Configure Settings →
> Permissions → "Create New Actors"** for the Player role, or imports the fleet
> for them (the GM can always create).

## Shape

An object with a `ships` array (a bare array of ships also works):

```json
{
  "fleet": "NAC Task Force (example)",
  "ships": [
    {
      "name": "RNS Lion",
      "mass": 32,
      "thrust": 4,
      "fcs": 2,
      "screens": 1,
      "pds": 3,
      "armour": { "boxes": 4 },
      "weapons": [
        { "kind": "beam", "weaponClass": 3, "arcs": ["F", "FS", "FP"] },
        { "kind": "beam", "weaponClass": 2, "arcs": ["FS", "AS"] },
        { "kind": "torpedo", "arcs": ["F"] },
        { "kind": "submunition", "arcs": ["F"] }
      ]
    },
    {
      "name": "RNS Sprite",
      "mass": 14,
      "thrust": 6,
      "hull": { "boxes": 7, "rows": 2 },
      "fcs": 1,
      "weapons": [{ "kind": "beam", "weaponClass": 1, "arcs": ["F", "FS", "FP"] }]
    }
  ]
}
```

## Fields (per ship)

| Field | Meaning | Default |
|---|---|---|
| `name` | Ship name | `"Ship"` |
| `mass` | Hull MASS (1–100) → sets class | `30` |
| `thrust` | Drive rating (0–8) | `4` |
| `hull` | `{ boxes, rows }` damage track | derived: `boxes` = ½ MASS, `rows` = 2/3/4 by class |
| `armour` | `{ boxes }` absorbed before hull | `0` |
| `fcs` | Fire-control systems | `1` |
| `screens` | Screen level (0–3) | `0` |
| `pds` | Point-defence systems | `0` |
| `damageControl` | Damage-control parties | `0` |
| `velocity`, `course` | Starting movement state (course 1–12) | `0`, `12` |
| `weapons[]` | `{ kind, weaponClass?, arcs[] }` | `[]` |

`kind` is one of `beam`, `torpedo`, `needle`, `submunition`. `weaponClass` is the
beam class (1+); ignored by non-beam weapons. `arcs` are any of `F FS AS A AP FP`.
Out-of-range numbers are clamped; unknown weapon kinds/arcs are dropped with a
warning rather than losing the whole fleet.

Use the FT2 Mass/Points design rules (or the module's design helpers) to build
balanced ships; the importer records what you give it, it does not design for you.
