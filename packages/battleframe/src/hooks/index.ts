function callHook(hook: string, ...args: unknown[]): void {
  const hooks = Hooks as unknown as {
    callAll?: (name: string, ...hookArgs: unknown[]) => void;
  };
  hooks.callAll?.(hook, ...args);
}

export function registerBattleframeHooks(): void {
  // No api install here any more. This used to install it at "init" on the
  // assumption that the system's "init" always precedes a module's — an
  // assumption Foundry publishes no contract for. The api is now built at
  // module top level (../battleframe.ts) and bound to `game` at "init" by the
  // entry point, so there is exactly one installer and no double-registration.
  Hooks.once("ready", () => {
    callHook("battleframe.ready");
  });
}

registerBattleframeHooks();
