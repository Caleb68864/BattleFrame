import { SYSTEM_ID } from "./constants";

Hooks.once("ready", () => {
  console.log(`${SYSTEM_ID} | system ready`);
});
