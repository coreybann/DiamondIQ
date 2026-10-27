import json
import numpy as np
from pathlib import Path
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

base = Path("public/data")

training = json.loads(
    (base / "mlb-contract-comparables.json").read_text()
)["contracts"]

testing = json.loads(
    (base / "mlb-contract-comparables-2024.json").read_text()
)["contracts"]

def features(player):
    year = player["contractStartYear"]
    older = float(player[f"war{year - 2}"])
    recent = float(player[f"war{year - 1}"])

    war = older * 0.4 + recent * 0.6
    age = float(player["ageAtSigning"]) - 32

    sp = float(player["position"] == "SP")
    rp = float(player["position"] == "RP")

    return [
        war,
        age,
        sp,
        rp,
        war * sp,
        war * rp,
    ]

X_train = np.array([features(p) for p in training])
y_train = np.array([p["aavMillions"] for p in training])

X_test = np.array([features(p) for p in testing])
y_test = np.array([p["aavMillions"] for p in testing])

print("2024 HISTORICAL HOLDOUT TEST")
print("Training: 40 contracts from 2025")
print("Testing: 30 contracts from 2024")
print()
print(f"{'Model':<20} {'Overall MAE':>14} {'Under $10M MAE':>17} {'Bias':>12}")
print("-" * 67)

for alpha in [0, 0.1, 1, 5, 10, 25, 50, 100]:
    model = make_pipeline(
        StandardScaler(),
        Ridge(alpha=alpha)
    )

    model.fit(X_train, y_train)

    predictions = np.maximum(1.0, model.predict(X_test))
    errors = predictions - y_test

    mae = np.mean(np.abs(errors))
    low_mae = np.mean(np.abs(errors[y_test < 10]))
    bias = np.mean(errors)

    label = "OLS (baseline)" if alpha == 0 else f"Ridge alpha={alpha}"

    print(
        f"{label:<20} "
        f"${mae:>12.2f}M "
        f"${low_mae:>15.2f}M "
        f"${bias:>10.2f}M"
    )

print()
print("Current DiamondIQ model historical MAE: $5.24M")
