import { SYSTEM_ID } from "./constants";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | initialising`);
});

Hooks.once("ready", () => {
  console.log(`${SYSTEM_ID} | system ready`);
});
