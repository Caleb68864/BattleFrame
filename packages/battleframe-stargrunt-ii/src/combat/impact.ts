/**
 * B5 — Impact vs Armour. A single rolled Impact die is compared against a single
 * rolled Armour die. Strict `>` throughout: an impact at or below the armour
 * bounces (`none`); above it wounds; above TWICE the armour kills. The `2*armour`
 * value is exactly a wound (strict `>` on the kill threshold too).
 *
 * Pure: takes the two ROLLED values (not die types), returns the outcome tier.
 */
export type ImpactResult = "none" | "wound" | "kill";

export function impactOutcome(impactRoll: number, armourRoll: number): ImpactResult {
  if (impactRoll <= armourRoll) {
    return "none";
  }
  if (impactRoll > 2 * armourRoll) {
    return "kill";
  }
  return "wound";
}
