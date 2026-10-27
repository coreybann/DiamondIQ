import json
from pathlib import Path
import numpy as np

contracts = json.loads(
    Path("public/data/mlb-contract-comparables.json").read_text()
)["contracts"]

def role(c):
    if c["position"] == "SP":
        return "Starting pitchers"
    if c["position"] == "RP":
        return "Relief pitchers"
    return "Position players"

def features(c):
    war = float(c["priorTwoYearWar"]) / 2
    age = float(c["ageAtSigning"])
    r = role(c)

    return [
        1.0, war, age - 32,
        float(r == "Starting pitchers"),
        float(r == "Relief pitchers"),
        war * float(r == "Starting pitchers"),
        war * float(r == "Relief pitchers"),
    ]

X = np.array([features(c) for c in contracts])
y = np.array([float(c["aavMillions"]) for c in contracts])
roles = [role(c) for c in contracts]
predictions = np.zeros(len(contracts))

for i in range(len(contracts)):
    train = np.arange(len(contracts)) != i
    coef, *_ = np.linalg.lstsq(X[train], y[train], rcond=None)
    predictions[i] = max(1.0, float(X[i] @ coef))

print("=== LEAVE-ONE-OUT REGRESSION BY ROLE ===")

for r in ["Starting pitchers", "Relief pitchers", "Position players"]:
    idx = np.array([i for i, value in enumerate(roles) if value == r])
    errors = predictions[idx] - y[idx]

    print(f"\n{r}: {len(idx)} contracts")
    print(f"  MAE: ${np.mean(np.abs(errors)):.2f}M")
    print(f"  Median absolute error: ${np.median(np.abs(errors)):.2f}M")
    print(f"  Signed bias: ${np.mean(errors):+.2f}M")

print("\nLargest errors:")
for i in np.argsort(np.abs(predictions - y))[::-1][:8]:
    print(
        f'  {contracts[i]["player"]} ({roles[i]}): '
        f'actual ${y[i]:.2f}M, predicted ${predictions[i]:.2f}M'
    )

print("\nNo production files changed.")
