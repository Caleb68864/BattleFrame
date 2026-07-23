/**
 * A "How to Play" JournalEntry created once per world, so a new table can learn to
 * DRIVE the module without a manual. A live playtester could not find how to plot a
 * ship's course; this is the in-world companion to the token-HUD + toolbar fixes --
 * it tells players where the actions live and walks the turn loop.
 *
 * NEUTRAL by design: it explains how to USE Full Thrust in Foundry (buttons, the
 * phase order, ownership, GM-less play), never the rulebook's rules or numbers.
 * That keeps it publishable and inside the project's engine-neutrality spirit.
 *
 * `buildHowToPlayHtml` is pure (unit-tested content); the creation + the ready hook
 * are thin Foundry glue (UNVERIFIED against a live world -- journal creation).
 */

import { MODULE_ID } from "../constants";

/** The journal's title, used both as its name and for the idempotency lookup. */
export const HOW_TO_PLAY_TITLE = "Full Thrust — How to Play";

/** One scene-tool legend row: icon glyph + what the tool does. */
interface LegendRow {
  icon: string;
  name: string;
  what: string;
}

/** The legend maps each scene-control icon to what it does (usage, not rules). */
const LEGEND: readonly LegendRow[] = [
  { icon: "fa-hourglass-half", name: "Ready", what: "Mark yourself ready to advance; the turn advances when everyone is ready." },
  { icon: "fa-dice", name: "Begin fire phase", what: "Roll initiative and open the fire phase (GM)." },
  { icon: "fa-list-ol", name: "Fire phase status", what: "Re-post whose side fires next (GM)." },
  { icon: "fa-route", name: "Plot", what: "Enter this ship's movement order; hidden until execute." },
  { icon: "fa-play", name: "Execute maneuvers", what: "Reveal and run every plotted move at once (GM)." },
  { icon: "fa-crosshairs", name: "Fire", what: "Fire the selected ship at your target." },
  { icon: "fa-forward", name: "New turn", what: "Clear leftover plots and end the fire phase (GM)." },
  { icon: "fa-arrows-rotate", name: "New battle", what: "Reset every ship to undamaged and clear the battle state (GM)." },
  { icon: "fa-file-import", name: "Import fleet", what: "Paste your fleet JSON to create your ships." },
  { icon: "fa-bullseye", name: "Check targeting", what: "See which of your weapons bear on the target, and their range band." },
  { icon: "fa-arrows-split-up-and-left", name: "Split fire", what: "Divide a multi-FCS ship's weapons across several targets (GM)." },
  { icon: "fa-compass-drafting", name: "Fire arcs", what: "Pin the fire-arc rings on ships on or off." },
  { icon: "fa-syringe", name: "Needle beam", what: "Snipe one nominated system on the target (GM)." },
  { icon: "fa-meteor", name: "Salvo", what: "Launch salvo missiles at the target (GM)." },
  { icon: "fa-rocket", name: "Launch missile", what: "Fire an independent missile forward (GM)." },
  { icon: "fa-forward-fast", name: "Missile phase", what: "Advance every in-flight missile and resolve strikes (GM)." },
  { icon: "fa-sun", name: "Nova Cannon", what: "Fire a spinal Nova Cannon at the target (GM)." },
  { icon: "fa-bolt", name: "Charge Wave Gun", what: "Spend a turn charging the Wave Gun (GM)." },
  { icon: "fa-water", name: "Wave Gun", what: "Fire the charged Wave Gun at the target (GM)." },
  { icon: "fa-plane-departure", name: "Launch fighters", what: "Deploy a fighter group from a carrier (GM)." },
  { icon: "fa-plane-arrival", name: "Recover fighters", what: "Land a nearby friendly fighter group (GM)." },
  { icon: "fa-jet-fighter", name: "Move fighters", what: "Advance a fighter group toward its target." },
  { icon: "fa-arrows-up-down-left-right", name: "Vector move", what: "Optional Newtonian movement mode." },
  { icon: "fa-wrench", name: "Damage control", what: "Roll end-of-turn repairs on damaged ships (GM)." }
];

/** Builds the legend table rows (icon + name + description). */
function legendRows(): string {
  return LEGEND.map(
    (row) =>
      `<tr><td style="text-align:center"><i class="fas ${row.icon}"></i></td>` +
      `<td><strong>${row.name}</strong></td><td>${row.what}</td></tr>`
  ).join("");
}

/**
 * Builds the How-to-Play page HTML. A single self-contained string of headings,
 * lists, and a legend table -- how to USE Full Thrust in Foundry, no rulebook
 * content. Pure so its coverage of the key topics is unit-tested.
 */
export function buildHowToPlayHtml(): string {
  return [
    `<h1>Full Thrust in Foundry — How to Play</h1>`,
    `<p>This guide covers how to <em>use</em> the module — where the actions live and the order you do things in. It is not the rulebook; bring your own Full Thrust rules.</p>`,

    `<h2>Where the actions are</h2>`,
    `<p>You reach every action two ways:</p>`,
    `<ul>`,
    `<li><strong>Right-click a ship token</strong> to open its HUD. Full Thrust adds action buttons there — <strong>Plot</strong> (<i class="fas fa-route"></i>) to enter its course, <strong>Fire</strong> (<i class="fas fa-crosshairs"></i>) to shoot, plus buttons for whatever weapons that ship actually mounts (needle, salvo, carrier bays…). A ship only shows the actions it can take right now, so a simple ship shows just Plot and Fire.</li>`,
    `<li>The <strong>Full Thrust toolbar</strong> down the left of the canvas (the rocket <i class="fas fa-rocket"></i> control) holds the same actions plus the whole-battle ones — begin fire phase, execute, new turn, and so on. The everyday turn-loop tools sit at the top; the specialist weapon tools are below them.</li>`,
    `</ul>`,
    `<p>Most actions act on the ship you have <strong>selected</strong> (click its token) against the enemy you have <strong>targeted</strong> (hover it and press <kbd>T</kbd>). The token-HUD buttons select the ship for you.</p>`,

    `<h2>The turn loop</h2>`,
    `<ol>`,
    `<li><strong>Plot movement</strong> — each player opens Plot on their ships and enters a course. Plots are <em>hidden</em>; nothing moves yet.</li>`,
    `<li><strong>Execute maneuvers</strong> (<i class="fas fa-play"></i>, GM) — reveals and runs every plotted move at once, so both sides see all the ships move together.</li>`,
    `<li><strong>Begin fire phase</strong> (<i class="fas fa-dice"></i>, GM) — rolls initiative; ships then fire in alternation by side.</li>`,
    `<li><strong>Fire</strong> — select one of your ships, target an enemy (<kbd>T</kbd>), and press Fire. Repeat as the fire phase passes back and forth. Fire-phase status (<i class="fas fa-list-ol"></i>) shows whose side fires next.</li>`,
    `<li><strong>New turn</strong> (<i class="fas fa-forward"></i>) — clears the plots and ends the fire phase, ready to plot again.</li>`,
    `</ol>`,

    `<h2>Giving a player a ship</h2>`,
    `<p>To let a player command a ship, open the <strong>Actors</strong> sidebar, right-click the ship, choose <strong>Configure Ownership</strong>, and set that player to <strong>Owner</strong>. Give a player <em>no</em> permission on ships they do not command — plotting stays secret only while each player can see just their own ships.</p>`,

    `<h2>Playing without a full-time GM</h2>`,
    `<p>The turn can advance without a GM babysitting it: when everyone presses <strong>Ready</strong> (<i class="fas fa-hourglass-half"></i>), the turn advances on a short countdown. For truly <strong>GM-less</strong> play you need either a player promoted to <em>Assistant GM</em> or the <em>socketlib</em> module with a connected GM client to run the GM-only steps (execute, fire resolution). See <code>docs/gm-less-play.md</code> in the module for the full setup.</p>`,

    `<h2>Scene-tool legend</h2>`,
    `<p>What each icon on the Full Thrust toolbar does:</p>`,
    `<table style="width:100%"><thead><tr><th>Icon</th><th>Tool</th><th>What it does</th></tr></thead><tbody>`,
    legendRows(),
    `</tbody></table>`,

    `<p style="opacity:0.7"><em>Created by the ${MODULE_ID} module. Delete it if you don't need it; it is only recreated in a world that has none.</em></p>`
  ].join("\n");
}

interface GlobalScope {
  game?: {
    user?: { isGM?: boolean };
    journal?: Iterable<{ name?: string }> | { name?: string }[];
  };
  JournalEntry?: { create: (data: Record<string, unknown>) => Promise<unknown> };
  Hooks?: { once?: (event: string, cb: () => void) => void };
}

function g(): GlobalScope {
  return globalThis as unknown as GlobalScope;
}

/** Whether a journal with the given name already exists in the world. */
function journalExists(name: string): boolean {
  const journal = g().game?.journal;
  if (!journal) {
    return false;
  }
  for (const entry of journal as Iterable<{ name?: string }>) {
    if (entry?.name === name) {
      return true;
    }
  }
  return false;
}

/**
 * Creates the How-to-Play JournalEntry once, idempotently: only the GM creates it
 * (players cannot make world journals), and only if no entry of that name exists
 * yet. Safe to call on every `ready`.
 */
export async function createHowToPlayJournalIfMissing(): Promise<void> {
  if (g().game?.user?.isGM !== true) {
    return;
  }
  if (journalExists(HOW_TO_PLAY_TITLE)) {
    return;
  }
  await g().JournalEntry?.create({
    name: HOW_TO_PLAY_TITLE,
    pages: [
      {
        name: "How to Play",
        type: "text",
        // format 1 == CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML.
        text: { content: buildHowToPlayHtml(), format: 1 }
      }
    ]
  });
}

/** Registers the ready hook that creates the How-to-Play journal once per world. */
export function registerHowToPlayJournal(): void {
  const hooks = g().Hooks;
  if (!hooks?.once) {
    return;
  }
  hooks.once("ready", () => {
    void createHowToPlayJournalIfMissing().catch((error) => {
      console.warn(`${MODULE_ID} | could not create the How to Play journal`, error);
    });
  });
}
