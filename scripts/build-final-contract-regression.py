import json
import numpy as np
from pathlib import Path

players = []

for filename in [
    "public/data/mlb-contract-comparables-2024.json",
    "public/data/mlb-contract-comparables.json"
]:
    players.extend(json.loads(Path(filename).read_text())["contracts"])

def features(p):
    year = p["contractStartYear"]

    weighted_war = (
        0.4 * p[f"war{year-2}"]
        + 0.6 * p[f"war{year-1}"]
    )

    age = p["ageAtSigning"] - 32
    sp = int(p["position"] == "SP")
    rp = int(p["position"] == "RP")

    return [
        1,
        weighted_war,
        age,
        sp,
        rp,
        weighted_war * sp,
        weighted_war * rp
    ]

X = np.array([features(p) for p in players])
y = np.array([p["aavMillions"] for p in players])

coef = np.linalg.lstsq(X, y, rcond=None)[0]

names = [
    "intercept",
    "war",
    "age",
    "sp",
    "rp",
    "warSP",
    "warRP"
]

print(f"Trained on {len(players)} contracts")

for name, value in zip(names, coef):
    print(f"{name}: {value:.6f}")

ts = f'''import type {{
  ContractProjectionInput,
}} from "./contractProjections";

export function predictContractAAV(
  player: ContractProjectionInput
): number {{
  // Final historical regression trained on {len(players)} contracts.
  // Approximation: the public input contains combined two-year WAR,
  // so the model cannot reconstruct the 40/60 seasonal weighting.
  const war = player.war2025_2026 / 2;
  const age = player.age - 32;

  const isSP = player.position === "SP" ? 1 : 0;
  const isRP = player.position === "RP" ? 1 : 0;

  const predictedAAV =
    {coef[0]:.8f} +
    {coef[1]:.8f} * war +
    {coef[2]:.8f} * age +
    {coef[3]:.8f} * isSP +
    {coef[4]:.8f} * isRP +
    {coef[5]:.8f} * war * isSP +
    {coef[6]:.8f} * war * isRP;

  return Math.round(
    Math.max(1, predictedAAV) * 10
  ) / 10;
}}
'''

Path("src/lib/contractRegression.ts").write_text(ts)

print("\nUpdated src/lib/contractRegression.ts")
