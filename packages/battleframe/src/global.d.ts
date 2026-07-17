declare const Hooks: {
  once(hook: string, callback: () => void): void;
  on(hook: string, callback: (...args: unknown[]) => void): void;
};
