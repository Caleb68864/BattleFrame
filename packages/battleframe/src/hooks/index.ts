import { installBattleframeApi } from "../api/index";

function callHook(hook: string, ...args: unknown[]): void {
  const hooks = Hooks as unknown as {
    callAll?: (name: string, ...hookArgs: unknown[]) => void;
  };
  hooks.callAll?.(hook, ...args);
}

export function registerBattleframeHooks(): void {
  // battleframe is the system itself, so its own "init" always runs before
  // module init hooks — no need to defer to "setup" here.
  Hooks.once("init", () => {
    installBattleframeApi();
  });

  Hooks.once("ready", () => {
    callHook("battleframe.ready");
  });
}

registerBattleframeHooks();
