import type { ContractProjectionInput } from "./contractProjections";

export function predictContractAAV(
  player: ContractProjectionInput
): number {
  const war = player.war2025_2026 / 2;
  const age = player.age - 32;
  const isSP = player.position === "SP" ? 1 : 0;
  const isRP = player.position === "RP" ? 1 : 0;

  const predictedAAV =
    (0.1938821893)
    + (6.6907492367 * war)
    + (-0.4164730610 * age)
    + (10.4983116048 * isSP)
    + (2.6729918096 * isRP)
    + (-2.7165647801 * war * isSP)
    + (-1.0567022203 * war * isRP);

  return Math.round(Math.max(1, predictedAAV) * 10) / 10;
}
