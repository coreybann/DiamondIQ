import type {
  ContractProjectionInput,
} from "./contractProjections";

export function predictContractAAV(
  player: ContractProjectionInput
): number {
  // Final historical regression trained on 91 contracts.
  // Approximation: the public input contains combined two-year WAR,
  // so the model cannot reconstruct the 40/60 seasonal weighting.
  const war = player.war2025_2026 / 2;
  const age = player.age - 32;

  const isSP = player.position === "SP" ? 1 : 0;
  const isRP = player.position === "RP" ? 1 : 0;

  const predictedAAV =
    -0.07425823 +
    6.75149087 * war +
    -0.39674341 * age +
    10.51197535 * isSP +
    2.48478913 * isRP +
    -2.71066105 * war * isSP +
    -0.61546841 * war * isRP;

  return Math.round(
    Math.max(1, predictedAAV) * 10
  ) / 10;
}
