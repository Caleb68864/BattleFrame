/**
 * BF SPIKE — throwaway. See ../README.md.
 *
 * Deliberately declares "squad" — the SAME short type name as Ruleset A.
 *
 * The notes claim subtypes are auto-namespaced by package id, so
 * `bf-ruleset-test.squad` and `bf-ruleset-test-2.squad` can never collide.
 * If that's true, Battleframe never needs collision-detection logic for types
 * (though it still does for ruleset IDs).
 *
 * If BOTH types appear in Create Actor with distinct schemas: namespacing holds.
 * If one clobbers the other: the brain dump's registry needs to police this.
 */

const LOG = "BF-SPIKE |";
const TYPE = "bf-ruleset-test-2.squad";

/** Intentionally a DIFFERENT schema from Ruleset A's squad. Divergence is the test. */
class OtherSquadData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      // Nothing in common with Ruleset A — no quality, no defense.
      courage: new f.NumberField({ initial: 3, integer: true }),
      banner: new f.StringField({ initial: "Ruleset B" }),
      provider: new f.StringField({ initial: "bf-ruleset-test-2" })
    };
  }
}

Hooks.once("init", () => {
  console.log(`${LOG} 1.6 MODULE B init @ ${performance.now().toFixed(2)}ms`);

  Object.assign(CONFIG.Actor.dataModels, { [TYPE]: OtherSquadData });
  CONFIG.Actor.typeLabels ??= {};
  CONFIG.Actor.typeLabels[TYPE] = "Squad (Ruleset B)";

  console.log(`${LOG} registered dataModel for ${TYPE}`);
});

Hooks.once("ready", () => {
  const types = game.documentTypes.Actor;
  const a = "bf-ruleset-test.squad";
  const b = TYPE;

  const bothPresent = types.includes(a) && types.includes(b);

  console.log(`${LOG} 1.8 NAMESPACE TEST ---------------------------`);
  console.log(`${LOG} 1.8 all Actor types:`, types);
  console.log(`${LOG} 1.8 "${a}" present:`, types.includes(a));
  console.log(`${LOG} 1.8 "${b}" present:`, types.includes(b));
  console.log(
    `${LOG} 1.8 VERDICT:`,
    bothPresent
      ? "PASS — namespacing holds; two modules can both declare 'squad'."
      : "FAIL — collision. The registry must police type names. Write this down."
  );
  console.log(`${LOG} 1.8 dataModel A:`, CONFIG.Actor.dataModels[a]?.name);
  console.log(`${LOG} 1.8 dataModel B:`, CONFIG.Actor.dataModels[b]?.name);
  console.log(`${LOG} 1.8 -------------------------------------------`);
});
