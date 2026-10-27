import json
from pathlib import Path
import numpy as np

contracts = json.loads(
    Path("public/data/mlb-contract-comparables.json").read_text()
)["contracts"]

def group(c):
    if c["position"] == "SP":
        return "Starting pitcher"
    if c["position"] == "RP":
        return "Relief pitcher"
    return "Position player"

def features(c):
    war = float(c["priorTwoYearWar"]) / 2
    age = float(c["ageAtSigning"])
    role = group(c)

    return [
        1.0,
        war,
        age - 32,
        float(role == "Starting pitcher"),
        float(role == "Relief pitcher"),
        war * float(role == "Starting pitcher"),
        war * float(role == "Relief pitcher"),
    ]

y = np.array([float(c["aavMillions"]) for c in contracts])
X = np.array([features(c) for c in contracts])
groups = [group(c) for c in contracts]

predictions = {
    "Global median": [],
    "Role median": [],
    "WAR regression": [],
}

for i, c in enumerate(contracts):
    train = [j for j in range(len(contracts)) if j != i]

    predictions["Global median"].append(float(np.median(y[train])))

    role_values = [
        y[j] for j in train if groups[j] == groups[i]
    ]
    if not role_values:
        role_values = list(y[train])

    predictions["Role median"].append(float(np.median(role_values)))

    coef, *_ = np.linalg.lstsq(X[train], y[train], rcond=None)
    predictions["WAR regression"].append(
        max(1.0, float(X[i] @ coef))
    )

print(f"Contracts evaluated: {len(contracts)}")
print("\n=== LEAVE-ONE-OUT BENCHMARK ===")

for name, pred in predictions.items():
    errors = np.array(pred) - y
    print(f"\n{name}")
    print(f"  MAE: ${np.mean(np.abs(errors)):.2f}M")
    print(f"  Median absolute error: ${np.median(np.abs(errors)):.2f}M")
    print(f"  Signed bias: ${np.mean(errors):+.2f}M")

print("\nNo production files changed.")
