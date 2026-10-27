import json
import numpy as np
from pathlib import Path

base = Path("public/data")

players = []
for filename in [
    "mlb-contract-comparables-2024.json",
    "mlb-contract-comparables.json"
]:
    players.extend(json.loads((base / filename).read_text())["contracts"])

def group(p):
    if p["position"] == "SP":
        return "SP"
    if p["position"] == "RP":
        return "RP"
    return "Hitter"

def production(p):
    year = p["contractStartYear"]
    total_war = p[f"war{year-2}"] + p[f"war{year-1}"]
    average_war = max(0, total_war / 2)
    age = p["ageAtSigning"]
    position = p["position"]

    multipliers = {
        "C": 1.05, "1B": 0.95, "2B": 1,
        "3B": 1, "SS": 1.1, "LF": 0.95,
        "CF": 1.05, "RF": 1, "DH": 0.9,
        "SP": 1.1, "RP": 0.85
    }

    position_multiplier = multipliers.get(position, 1)

    age_multiplier = (
        1.1 if age <= 29 else
        1 if age <= 32 else
        0.85 if age <= 35 else
        0.7
    )

    return round(
        max(
            1,
            (3 + average_war * 5)
            * position_multiplier
            * age_multiplier
        ) * 10
    ) / 10

def features(p):
    year = p["contractStartYear"]
    weighted_war = (
        0.4 * p[f"war{year-2}"]
        + 0.6 * p[f"war{year-1}"]
    )
    age = p["ageAtSigning"] - 32
    sp = int(group(p) == "SP")
    rp = int(group(p) == "RP")

    return [
        1, weighted_war, age,
        sp, rp, weighted_war*sp, weighted_war*rp
    ]

X = np.array([features(p) for p in players])
y = np.array([p["aavMillions"] for p in players])

production_predictions = np.array([
    production(p) for p in players
])

regression_predictions = np.zeros(len(players))

for i in range(len(players)):
    mask = np.arange(len(players)) != i
    coefficients = np.linalg.lstsq(
        X[mask], y[mask], rcond=None
    )[0]

    regression_predictions[i] = max(
        1, X[i] @ coefficients
    )

def report(label, predicted, actual, selected):
    errors = predicted[selected] - actual[selected]
    return np.mean(np.abs(errors)), np.mean(errors)

print("\nFINAL MODEL COMPARISON")
print("=" * 65)

groups = {
    "All contracts": np.ones(len(players), dtype=bool),
    "Under $10M": y < 10,
    "Hitters": np.array([group(p) == "Hitter" for p in players]),
    "Starters": np.array([group(p) == "SP" for p in players]),
    "Relievers": np.array([group(p) == "RP" for p in players])
}

for name, mask in groups.items():
    prod_mae, prod_bias = report(
        name, production_predictions, y, mask
    )
    reg_mae, reg_bias = report(
        name, regression_predictions, y, mask
    )

    winner = (
        "REGRESSION" if reg_mae < prod_mae
        else "PRODUCTION" if prod_mae < reg_mae
        else "TIE"
    )

    print(f"\n{name} ({mask.sum()} players)")
    print(f"  Production: MAE ${prod_mae:.2f}M | Bias ${prod_bias:+.2f}M")
    print(f"  Regression: MAE ${reg_mae:.2f}M | Bias ${reg_bias:+.2f}M")
    print(f"  Winner: {winner}")

print("\nNote: Regression predictions use leave-one-out training.")
print("Production predictions use the existing fixed formula.")
print("This comparison evaluates AAV only, not contract years.")
