/**
 * BF SPIKE — throwaway. Not a Battleframe ruleset. See ../README.md.
 *
 * Simulates the thing the whole architecture depends on: a MODULE contributing
 * an Actor subtype + data model + sheet to a SYSTEM it doesn't own.
 *
 * Per the notes this should Just Work — CONFIG.Actor.dataModels is a plain
 * mutable object and nothing gates the write. This spike is about whether it's
 * ERGONOMIC, not whether it's possible.
 */

const LOG = "BF-SPIKE |";
const TYPE = "bf-ruleset-test.squad";

/**
 * A squad, roughly OPR-shaped — Quality/Defense, which is a real OPR pair.
 * Deliberately trivial. The schema is not a design proposal.
 */
class SquadData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      quality: new f.NumberField({ initial: 4, integer: true, min: 2, max: 6 }),
      defense: new f.NumberField({ initial: 4, integer: true, min: 2, max: 6 }),
      models: new f.NumberField({ initial: 5, integer: true, min: 1 }),
      provider: new f.StringField({ initial: "bf-ruleset-test" })
    };
  }

  prepareDerivedData() {
    // Exists purely to prove derived data runs for a module-provided model.
    this.qualityTarget = `${this.quality}+`;
  }
}

/**
 * Minimal ApplicationV2 sheet. Namespaces per the notes:
 *   foundry.applications.api.*  /  foundry.applications.sheets.*
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

class SquadSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["bf-spike", "squad"],
    position: { width: 360, height: "auto" },
    window: { resizable: true }
  };

  // Inline template — a spike shouldn't need a templates/ dir.
  static PARTS = {
    main: { template: "modules/bf-ruleset-test/templates/squad.hbs" }
  };

  async _prepareContext() {
    return {
      actor: this.document,
      system: this.document.system,
      // If this renders, derived data works for module-provided models.
      qualityTarget: this.document.system.qualityTarget
    };
  }
}

Hooks.once("init", () => {
  // 1.6 — compare this timestamp to the system's. Does the system init first?
  console.log(`${LOG} 1.6 MODULE A init @ ${performance.now().toFixed(2)}ms`);
  console.log(`${LOG} 1.6 game.bfSpike present at module init?`, !!game.bfSpike);

  // THE critical line. A module writing into a system's CONFIG, uninvited.
  Object.assign(CONFIG.Actor.dataModels, { [TYPE]: SquadData });
  console.log(`${LOG} registered dataModel for ${TYPE}`);

  // 1.2 — try to give the type a human label.
  CONFIG.Actor.typeLabels ??= {};
  CONFIG.Actor.typeLabels[TYPE] = "Squad (Ruleset A)";

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    Actor,
    "bf-ruleset-test",
    SquadSheet,
    { types: [TYPE], makeDefault: true, label: "BF Spike Squad Sheet" }
  );
  console.log(`${LOG} registered sheet for ${TYPE}`);
});

Hooks.once("ready", () => {
  console.log(`${LOG} MODULE A ready.`);

  // 1.8 — namespacing. Both modules declare "squad"; both should coexist.
  const actorTypes = game.documentTypes.Actor;
  console.log(`${LOG} 1.8 does core list ${TYPE}?`, actorTypes.includes(TYPE));

  // 1.7 — can we identify which package owns a document's model?
  const mine = game.actors.filter(a => a.type === TYPE);
  console.log(`${LOG} 1.7 existing ${TYPE} actors:`, mine.length);
  for (const a of mine) {
    console.log(`${LOG} 1.7 ${a.name} modelProvider:`, a.system?.modelProvider?.id ?? "(undefined)");
  }
});
