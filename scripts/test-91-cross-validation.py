import json
import numpy as np
from pathlib import Path
from sklearn.linear_model import Ridge
from sklearn.model_selection import LeaveOneOut

base = Path("public/data")
players = []

for filename in [
    "mlb-contract-comparables-2024.json",
    "mlb-contract-comparables.json"
]:
    players.extend(json.loads((base / filename).read_text())["contracts"])

def features(p):
    year = p["contractStartYear"]
    war = 0.4 * p[f"war{year-2}"] + 0.6 * p[f"war{year-1}"]
    age = p["ageAtSigning"] - 32
    sp = int(p["position"] == "SP")
    rp = int(p["position"] == "RP")
    return [war, age, sp, rp, war*sp, war*rp]

X = np.array([features(p) for p in players])
y = np.array([p["aavMillions"] for p in players])
groups = np.array([p["position"] for p in players])

print(f"LEAVE-ONE-OUT CROSS-VALIDATION ({len(players)} contracts)")
print("-" * 75)

for alpha in [0, 0.1, 1, 5, 10]:
    predictions = np.zeros(len(players))

    for train_idx, test_idx in LeaveOneOut().split(X):
        model = Ridge(alpha=alpha)
        model.fit(X[train_idx], y[train_idx])
        predictions[test_idx] = np.maximum(
            1.0, model.predict(X[test_idx])
        )

    errors = predictions - y
    low = y < 10
    relievers = groups == "RP"

    print(
        f"Alpha {alpha:<4} | "
        f"Overall ${np.mean(np.abs(errors)):.2f}M | "
        f"Under $10M ${np.mean(np.abs(errors[low])):.2f}M | "
        f"RP ${np.mean(np.abs(errors[relievers])):.2f}M | "
        f"Bias ${np.mean(errors):+.2f}M"
    )
