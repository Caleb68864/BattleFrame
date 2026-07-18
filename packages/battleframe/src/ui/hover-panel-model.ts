import type { HoverProvider } from "./hover-registry";

export interface PanelRow { label: string; text: string }
export interface PanelStatus { id: string; img: string; label: string }
export interface PanelModel { name: string; rows: PanelRow[]; statuses: PanelStatus[] }

interface ActorLike {
  name?: string;
  system?: Record<string, unknown>;
  statuses?: Iterable<string>;
}

/** Resolves a status id to its icon + label, or undefined if unknown (engine passes a CONFIG-backed one). */
export type StatusResolver = (id: string) => { img: string; label: string } | undefined;

const EM_DASH = "—";

function fieldText(value: unknown, max?: number): string {
  const shown = value === undefined || value === null ? EM_DASH : String(value);
  return max === undefined ? shown : `${shown}/${max}`;
}

/**
 * Pure: turns an actor + a ruleset's provider into a render-ready model. Never
 * throws on missing data (renders an em dash). The status resolver is injected
 * so this stays free of Foundry globals and unit-testable.
 */
export function buildPanelModel(
  actor: ActorLike,
  provider: HoverProvider,
  resolveStatus: StatusResolver,
): PanelModel {
  const system = actor.system ?? {};
  const rows = provider.fields.map((f) => ({ label: f.label, text: fieldText(system[f.key], f.max) }));

  const statuses: PanelStatus[] = [];
  for (const id of actor.statuses ?? []) {
    const resolved = resolveStatus(id);
    if (resolved) statuses.push({ id, img: resolved.img, label: resolved.label });
  }

  return { name: actor.name ?? "", rows, statuses };
}
