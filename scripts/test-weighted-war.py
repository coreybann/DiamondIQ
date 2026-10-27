import json
from pathlib import Path
import numpy as np

base = Path("public/data")

training = json.loads(
    (base / "mlb-contract-comparables.json").read_text()
)["contracts"]

testing = json.loads(
    (base / "mlb-contract-comparables-2024.json").read_text()
)["contracts"]

def features(player, recent_weight):
    year = player["contractStartYear"]

    older = float(player[f"war{year - 2}"])
    recent = float(player[f"war{year - 1}"])

    war = older * (1 - recent_weight) + recent * recent_weight
    age = float(player["ageAtSigning"]) - 32

    sp = float(player["position"] == "SP")
    rp = float(player["position"] == "RP")

    return [
        1.0,
        war,
        age,
        sp,
        rp,
        war * sp,
        war * rp,
    ]

def evaluate(weight):
    X = np.array([features(p, weight) for p in training])
    y = np.array([p["aavMillions"] for p in training])

    coefficients = np.linalg.lstsq(X, y, rcond=None)[0]

    predictions = []
    actuals = []

    for player in testing:
        prediction = float(
            np.dot(features(player, weight), coefficients)
        )

        prediction = max(1.0, prediction)

        predictions.append(prediction)
        actuals.append(float(player["aavMillions"]))

    predictions = np.array(predictions)
    actuals = np.array(actuals)

    mae = np.mean(np.abs(predictions - actuals))
    bias = np.mean(predictions - actuals)

    low_paid = actuals < 10
    low_mae = np.mean(
        np.abs(predictions[low_paid] - actuals[low_paid])
    )

    return mae, bias, low_mae

print("2024 HOLDOUT TEST — 30 CONTRACTS")
print("Training: 40 contracts from 2025")
print()

print(f"{'Weighting':<16} {'Overall MAE':>14} {'Bias':>12} {'Under $10M MAE':>17}")
print("-" * 63)

for weight in [0.5, 0.6, 0.7, 0.8]:
    mae, bias, low_mae = evaluate(weight)

    print(
        f"{int((1-weight)*100)}/{int(weight*100):<12} "
        f"${mae:>12.2f}M "
        f"${bias:>10.2f}M "
        f"${low_mae:>15.2f}M"
    )

print()
print("Previous current-model MAE: $5.24M")
print("Previous regression MAE:    $4.56M")
