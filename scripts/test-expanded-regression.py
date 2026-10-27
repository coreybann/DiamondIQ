import json
import numpy as np
from pathlib import Path

base = Path("public/data")

original = json.loads(
    (base / "mlb-contract-comparables.pre-expansion.json").read_text()
)["contracts"]

expanded = json.loads(
    (base / "mlb-contract-comparables.json").read_text()
)["contracts"]

testing = json.loads(
    (base / "mlb-contract-comparables-2024.json").read_text()
)["contracts"]

def features(player, recent_weight=0.6):
    year = player["contractStartYear"]
    older = float(player[f"war{year - 2}"])
    recent = float(player[f"war{year - 1}"])

    war = older * (1 - recent_weight) + recent * recent_weight
    age = float(player["ageAtSigning"]) - 32
    sp = float(player["position"] == "SP")
    rp = float(player["position"] == "RP")

    return [1.0, war, age, sp, rp, war * sp, war * rp]

def evaluate(training):
    X = np.array([features(p) for p in training])
    y = np.array([p["aavMillions"] for p in training])

    coefficients = np.linalg.lstsq(X, y, rcond=None)[0]

    predictions = np.array([
        max(1.0, float(np.dot(features(p), coefficients)))
        for p in testing
    ])

    actuals = np.array([p["aavMillions"] for p in testing])
    errors = predictions - actuals

    low = actuals < 10

    return (
        np.mean(np.abs(errors)),
        np.mean(np.abs(errors[low])),
        np.mean(errors)
    )

print("2024 HISTORICAL HOLDOUT")
print("WAR weighting: 40% older / 60% recent")
print()

for label, training in [
    ("Original 40 players", original),
    ("Expanded 45 players", expanded)
]:
    mae, low_mae, bias = evaluate(training)

    print(label)
    print(f"  Overall MAE:    ${mae:.2f}M")
    print(f"  Under $10M MAE: ${low_mae:.2f}M")
    print(f"  Average bias:   ${bias:+.2f}M")
    print()

print("Current production model historical MAE: $5.24M")
