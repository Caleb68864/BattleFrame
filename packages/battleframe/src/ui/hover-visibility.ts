import type { HoverProvider, VisibilityMode } from "./hover-registry";

/** The stored setting value: an explicit mode, or "ruleset" to defer to the provider. */
export type VisibilitySetting = VisibilityMode | "ruleset";

interface UserLike { isGM?: boolean }
interface TokenLike { actor?: { isOwner?: boolean } | null }

/** The effective mode: an explicit GM choice, else the provider default, else "owners". */
export function resolveVisibility(setting: VisibilitySetting, provider: HoverProvider): VisibilityMode {
  return setting === "ruleset" ? provider.defaultVisibility ?? "owners" : setting;
}

/** Whether `user` may see the panel for `token` under `mode`. */
export function isVisibleTo(user: UserLike, token: TokenLike, mode: VisibilityMode): boolean {
  if (mode === "everyone") return true;
  if (user.isGM === true) return true;
  if (mode === "gm") return false;
  return token.actor?.isOwner === true; // "owners"
}
