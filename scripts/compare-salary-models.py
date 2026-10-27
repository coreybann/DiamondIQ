import json
from pathlib import Path
import numpy as np

data_path = Path("public/data/mlb-contract-comparables.json")
eval_path = Path("public/data/contract-model-evaluation.json")

contracts = json.loads(data_path.read_text())["contracts"]
baseline = json.loads(eval_path.read_text())

if len(contracts) < 20:
    raise SystemExit("Not enough contracts for this experiment.")

baseline_by_name = {
    r["player"].casefold(): r for r in baseline
}

rows = []
for c in contracts:
    result = baseline_by_name.get(c["player"].casefold())
    if result is None:
        continue

    war = float(c["priorTwoYearWar"]) / 2
    age = float(c["ageAtSigning"])
    pos = c["position"]

    # Three broad groups: starting pitchers, relievers, position players.
    is_sp = float(pos == "SP")
    is_rp = float(pos == "RP")

    # Features: baseline, WAR, age, role, and role-specific WAR effects.
    features = [
        1.0,
        war,
        age - 32,
        is_sp,
        is_rp,
        war * is_sp,
        war * is_rp,
    ]

    rows.append({
        "player": c["player"],
        "actual": float(c["aavMillions"]),
        "baseline": float(result["projectedAAV"]),
        "features": features,
    })

X = np.array([r["features"] for r in rows], dtype=float)
y = np.array([r["actual"] for r in rows], dtype=float)

predictions = np.zeros(len(rows))

# Leave one contract out, fit on the rest, predict the held-out contract.
for i in range(len(rows)):
    train_mask = np.arange(len(rows)) != i
    coefficients, *_ = np.linalg.lstsq(
        X[train_mask], y[train_mask], rcond=None
    )
    predictions[i] = max(1.0, float(X[i] @ coefficients))

baseline_errors = np.array([
    r["baseline"] - r["actual"] for r in rows
])
candidate_errors = predictions - y

def report(label, errors):
    print(f"\n{label}")
    print(f"  MAE: ${np.mean(np.abs(errors)):.2f}M")
    print(f"  Median absolute error: ${np.median(np.abs(errors)):.2f}M")
    print(f"  Mean signed error: ${np.mean(errors):+.2f}M")

print(f"Contracts compared: {len(rows)}")
report("CURRENT MODEL (existing 40-contract evaluation)", baseline_errors)
report("EXPERIMENTAL MODEL (leave-one-out validation)", candidate_errors)

print("\nLargest experimental-model errors:")
order = np.argsort(np.abs(candidate_errors))[::-1][:8]
for i in order:
    print(
        f'  {rows[i]["player"]}: actual ${y[i]:.2f}M, '
        f'predicted ${predictions[i]:.2f}M, '
        f'error ${candidate_errors[i]:+.2f}M'
    )

print("\nExperiment complete. No production files were changed.")
