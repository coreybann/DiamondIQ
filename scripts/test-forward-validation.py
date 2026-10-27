import json
import numpy as np
from pathlib import Path

base = Path("public/data")

training = json.loads(
    (base / "mlb-contract-comparables-2024.json").read_text()
)["contracts"]

testing = json.loads(
    (base / "mlb-contract-comparables.json").read_text()
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

print("FORWARD-IN-TIME VALIDATION")
print("Training: 30 contracts from 2024")
print("Testing: 40 contracts from 2025")
print()

for weight in [0.5, 0.6, 0.7, 0.8]:
    X = np.array([features(p, weight) for p in training])
    y = np.array([p["aavMillions"] for p in training])

    coefficients = np.linalg.lstsq(X, y, rcond=None)[0]

    predictions = np.array([
        max(1.0, float(np.dot(features(p, weight), coefficients)))
        for p in testing
    ])

    actuals = np.array([p["aavMillions"] for p in testing])
    errors = predictions - actuals

    mae = np.mean(np.abs(errors))
    bias = np.mean(errors)

    low = actuals < 10
    low_mae = np.mean(np.abs(errors[low])) if low.any() else float("nan")

    print(
        f"{int(round((1-weight)*100))}/{int(round(weight*100))} WAR: "
        f"MAE ${mae:.2f}M | "
        f"Bias ${bias:+.2f}M | "
        f"Under $10M MAE ${low_mae:.2f}M"
    )
