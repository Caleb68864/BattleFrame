/**
 * BF SPIKE — throwaway. Not Battleframe. See ../README.md.
 *
 * Job: (1) be a minimal host system so a module can add Actor subtypes to it,
 *      (2) expose measurement/Region probes.
 *
 * Written from research notes against v14 WITHOUT a running Foundry. Unverified.
 * If it disagrees with real Foundry, real Foundry is right.
 */

const LOG = "BF-SPIKE |";

/* ------------------------------------------------------------------ *
 * A deliberately trivial system-provided Actor type.
 * Its only purpose is to be the "control" against which module-provided
 * types are compared in the Create Actor dialog and elsewhere.
 * ------------------------------------------------------------------ */
class GenericActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      note: new f.StringField({ initial: "system-provided type" })
    };
  }
}

/* ------------------------------------------------------------------ *
 * Probe 2 — measurement.
 * The real question: Foundry measures center-to-center; miniature rules
 * measure base-to-base. Is the `cost` callback on measurePath enough to
 * bridge that, or do we need our own measurement layer entirely?
 * ------------------------------------------------------------------ */
function probeMeasurement() {
  const [a, b] = canvas.tokens.controlled;
  if (!a || !b) {
    console.warn(`${LOG} probeMeasurement: select exactly TWO tokens first.`);
    return null;
  }

  const grid = canvas.grid;
  const waypoints = [
    { x: a.center.x, y: a.center.y },
    { x: b.center.x, y: b.center.y }
  ];

  const result = {};

  // 2.1 — what does core give us, unmodified?
  try {
    result.measurePath = grid.measurePath(waypoints);
    console.log(`${LOG} 2.1 measurePath (center-to-center):`, result.measurePath);
  } catch (err) {
    result.measurePathError = String(err);
    console.error(`${LOG} 2.1 measurePath THREW:`, err);
  }

  // 2.2 — is the cost callback a viable seam for edge-to-edge?
  //       Per the notes this is the ONLY documented extension point.
  try {
    result.measurePathWithCost = grid.measurePath(waypoints, {
      cost: (from, to, distance) => {
        console.log(`${LOG} 2.2 cost callback fired:`, { from, to, distance });
        return distance;
      }
    });
    console.log(`${LOG} 2.2 measurePath with cost:`, result.measurePathWithCost);
  } catch (err) {
    result.costError = String(err);
    console.error(`${LOG} 2.2 cost callback THREW:`, err);
  }

  // 2.3 — raw geometry. If we must roll our own measurement, this is the
  //       arithmetic we'd be doing. Compare against 2.1 to size the gap.
  const dxPx = b.center.x - a.center.x;
  const dyPx = b.center.y - a.center.y;
  const centerPx = Math.hypot(dxPx, dyPx);
  const pxPerUnit = canvas.dimensions.size / canvas.dimensions.distance;

  // Approximate base radii from token footprint. Real bases are circles;
  // Foundry tokens are rectangles. That mismatch is itself a finding.
  const radiusA = Math.max(a.document.width, a.document.height) * canvas.dimensions.size / 2;
  const radiusB = Math.max(b.document.width, b.document.height) * canvas.dimensions.size / 2;
  const edgePx = Math.max(0, centerPx - radiusA - radiusB);

  result.geometry = {
    centerToCenter_px: centerPx,
    centerToCenter_units: centerPx / pxPerUnit,
    edgeToEdge_px: edgePx,
    edgeToEdge_units: edgePx / pxPerUnit,
    pxPerUnit,
    gridSizePx: canvas.dimensions.size,
    gridDistance: canvas.dimensions.distance,
    sceneUnits: canvas.scene.grid.units,
    tokenA: { w: a.document.width, h: a.document.height, radiusPx: radiusA },
    tokenB: { w: b.document.width, h: b.document.height, radiusPx: radiusB }
  };
  console.log(`${LOG} 2.3 raw geometry (what edge-to-edge WOULD be):`, result.geometry);

  // 2.4 — notes claim SquareGrid#diagonals is read-only, baked at construction.
  result.gridType = grid.type;
  result.gridClass = grid.constructor?.name;
  result.diagonals = grid.diagonals;
  try {
    const before = grid.diagonals;
    grid.diagonals = 999;
    result.diagonalsWritable = grid.diagonals === 999;
    grid.diagonals = before;
  } catch (err) {
    result.diagonalsWritable = false;
    result.diagonalsError = String(err);
  }
  console.log(`${LOG} 2.4 grid:`, {
    type: result.gridType,
    class: result.gridClass,
    diagonals: result.diagonals,
    diagonalsWritable: result.diagonalsWritable
  });

  // 2.5 — gridless behaviour. GREATHELM is paper-sized and gridless.
  console.log(`${LOG} 2.5 isGridless:`, grid.isGridless ?? grid.type === 0);

  return result;
}

/* ------------------------------------------------------------------ *
 * Probe 3 — Scene Regions as the MeasuredTemplate replacement.
 * Notes say MeasuredTemplate Documents were DELETED in v14 — Foundry's
 * first-ever Document removal. Every blast/template/cone must move to
 * Regions. No precedent system to copy.
 * ------------------------------------------------------------------ */
async function probeRegions() {
  const result = {};

  // 3.1 — is MeasuredTemplate actually gone?
  result.measuredTemplateInCONFIG = "MeasuredTemplate" in CONFIG;
  result.measuredTemplateDocClass = CONFIG.MeasuredTemplate?.documentClass?.name ?? null;
  result.sceneHasTemplatesCollection = !!canvas.scene?.templates;
  console.log(`${LOG} 3.1 MeasuredTemplate presence:`, {
    inCONFIG: result.measuredTemplateInCONFIG,
    docClass: result.measuredTemplateDocClass,
    sceneCollection: result.sceneHasTemplatesCollection
  });

  // 3.2 — can we make a circular Region programmatically?
  try {
    const origin = canvas.tokens.controlled[0]?.center
      ?? { x: canvas.dimensions.width / 2, y: canvas.dimensions.height / 2 };
    const radiusPx = 3 * (canvas.dimensions.size / canvas.dimensions.distance);

    const [region] = await canvas.scene.createEmbeddedDocuments("Region", [{
      name: "BF-SPIKE probe region",
      shapes: [{
        type: "circle",
        x: origin.x,
        y: origin.y,
        radiusX: radiusPx,
        radiusY: radiusPx
      }],
      color: "#ff0000"
    }]);

    result.regionCreated = !!region;
    result.regionId = region?.id ?? null;
    console.log(`${LOG} 3.2 Region created:`, region);

    // 3.3 — can we ask which tokens are inside?
    if (region) {
      result.regionTokensApi = {
        hasTokensProp: "tokens" in region,
        tokenCount: region.tokens?.size ?? null,
        hasTestPoint: typeof region.testPoint === "function",
        hasSegmentizeMovement: typeof region.segmentizeMovement === "function"
      };
      console.log(`${LOG} 3.3 Region token-query surface:`, result.regionTokensApi);

      // 3.4 — clean up. Templates were ephemeral; Regions are persisted
      //       Documents, which is itself the finding.
      await canvas.scene.deleteEmbeddedDocuments("Region", [region.id]);
      console.log(`${LOG} 3.4 Region deleted. Note it had to be CREATED and DELETED — it is not ephemeral.`);
    }
  } catch (err) {
    result.regionError = String(err);
    console.error(`${LOG} 3.2 Region creation THREW:`, err);
  }

  return result;
}

/* ------------------------------------------------------------------ *
 * Lifecycle
 * ------------------------------------------------------------------ */

Hooks.once("init", () => {
  // 1.6 — record init ordering. The module logs the same way; compare timestamps.
  console.log(`${LOG} 1.6 SYSTEM init @ ${performance.now().toFixed(2)}ms`);

  CONFIG.Actor.dataModels.generic = GenericActorData;

  // Expose probes. Note: per the notes there is NO official API mechanism for
  // systems — game.system.api is 100% convention. This is us inventing one,
  // which is itself worth knowing.
  game.bfSpike = { probeMeasurement, probeRegions };
});

Hooks.once("ready", () => {
  console.log(`${LOG} SYSTEM ready. Foundry version:`, game.version);
  console.log(`${LOG} Run game.bfSpike.probeMeasurement() with TWO tokens selected.`);
  console.log(`${LOG} Run game.bfSpike.probeRegions().`);

  // 1.7 — what does core know about who provides each Actor type?
  const types = game.documentTypes.Actor;
  console.log(`${LOG} 1.1/1.8 Actor types core reports:`, types);

  for (const t of types) {
    if (t === "base") continue;
    const label = CONFIG.Actor.typeLabels?.[t];
    console.log(`${LOG} 1.2 type "${t}" label:`, label ?? "(none — will render raw)");
  }
});
