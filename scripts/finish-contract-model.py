import json
import shutil
import subprocess
import numpy as np
from pathlib import Path

files = [
    "public/data/mlb-contract-comparables-2024.json",
    "public/data/mlb-contract-comparables.json"
]

players = []
for filename in files:
    players.extend(json.loads(Path(filename).read_text())["contracts"])

def features(p):
    year = p["contractStartYear"]
    war = (p[f"war{year-2}"] + p[f"war{year-1}"]) / 2
    age = p["ageAtSigning"] - 32
    sp = int(p["position"] == "SP")
    rp = int(p["position"] == "RP")
    return [1, war, age, sp, rp, war*sp, war*rp]

def production(p):
    year = p["contractStartYear"]
    war = max(0, (p[f"war{year-2}"] + p[f"war{year-1}"]) / 2)
    age = p["ageAtSigning"]
    pos = p["position"]
    multipliers = {
        "C":1.05, "1B":0.95, "2B":1, "3B":1,
        "SS":1.1, "LF":0.95, "CF":1.05,
        "RF":1, "DH":0.9, "SP":1.1, "RP":0.85
    }
    age_mult = 1.1 if age <= 29 else 1 if age <= 32 else 0.85 if age <= 35 else 0.7
    return round(max(1, (3 + war*5)*multipliers.get(pos,1)*age_mult)*10)/10

X = np.array([features(p) for p in players])
y = np.array([p["aavMillions"] for p in players])
prod = np.array([production(p) for p in players])
pred = np.zeros(len(players))

for i in range(len(players)):
    mask = np.arange(len(players)) != i
    c = np.linalg.lstsq(X[mask], y[mask], rcond=None)[0]
    pred[i] = max(1, X[i] @ c)

prod_mae = np.mean(np.abs(prod-y))
reg_mae = np.mean(np.abs(pred-y))

print(f"Historical contracts: {len(players)}")
print(f"Current formula MAE: ${prod_mae:.2f}M")
print(f"Average-WAR regression MAE: ${reg_mae:.2f}M")

if reg_mae >= prod_mae:
    print("Regression did not win. Existing website model preserved.")
    raise SystemExit(0)

coef = np.linalg.lstsq(X, y, rcond=None)[0]

reg_path = Path("src/lib/contractRegression.ts")
proj_path = Path("src/lib/contractProjections.ts")

for path in [reg_path, proj_path]:
    shutil.copy2(path, str(path) + ".before-final-integration")

ts = '''import type { ContractProjectionInput } from "./contractProjections";

export function predictContractAAV(
  player: ContractProjectionInput
): number {
  const war = player.war2025_2026 / 2;
  const age = player.age - 32;
  const isSP = player.position === "SP" ? 1 : 0;
  const isRP = player.position === "RP" ? 1 : 0;

  const predictedAAV =
    COEFFICIENTS;

  return Math.round(Math.max(1, predictedAAV) * 10) / 10;
}
'''

terms = [
    f"({coef[0]:.10f})",
    f"({coef[1]:.10f} * war)",
    f"({coef[2]:.10f} * age)",
    f"({coef[3]:.10f} * isSP)",
    f"({coef[4]:.10f} * isRP)",
    f"({coef[5]:.10f} * war * isSP)",
    f"({coef[6]:.10f} * war * isRP)"
]
reg_path.write_text(ts.replace("COEFFICIENTS", "\n    + ".join(terms)))

source = proj_path.read_text()
source = 'import { predictContractAAV } from "./contractRegression";\n\n' + source

start = source.index("  const aavMillions = Math.round(")
end = source.index("\n  const totalMillions =", start)

source = (
    source[:start]
    + "  const aavMillions = predictContractAAV(player);\n"
    + source[end:]
)

proj_path.write_text(source)

print("\nRegression integrated. Running production build...")
result = subprocess.run(["npm", "run", "build"])

if result.returncode:
    print("\nBuild failed. Restoring original files.")
    for path in [reg_path, proj_path]:
        shutil.copy2(str(path) + ".before-final-integration", path)
    raise SystemExit(result.returncode)

print("\nSUCCESS: Regression integrated and build passed.")
print("No deployment performed yet.")
