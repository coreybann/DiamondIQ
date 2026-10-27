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

def features(player, use_trend):
    year = player["contractStartYear"]
    older = float(player[f"war{year - 2}"])
    recent = float(player[f"war{year - 1}"])

    average = (older + recent) / 2
    trend = recent - older
    age = float(player["ageAtSigning"]) - 32
    sp = float(player["position"] == "SP")
    rp = float(player["position"] == "RP")

    result = [
        1.0, average, age, sp, rp,
        average * sp, average * rp
    ]

    if use_trend:
        result.append(trend)

    return result

def evaluate(use_trend):
    X = np.array([features(p, use_trend) for p in training])
    y = np.array([p["aavMillions"] for p in training])

    coefficients = np.linalg.lstsq(X, y, rcond=None)[0]

    predictions = np.array([
        max(1.0, float(np.dot(features(p, use_trend), coefficients)))
        for p in testing
    ])

    actuals = np.array([p["aavMillions"] for p in testing])
    errors = predictions - actuals

    return (
        np.mean(np.abs(errors)),
        np.mean(errors),
        np.mean(np.abs(errors[actuals < 10])),
        coefficients
    )

for label, use_trend in [
    ("Original regression", False),
    ("Regression + WAR trend", True)
]:
    mae, bias, low_mae, coefficients = evaluate(use_trend)

    print(f"\n{label}")
    print(f"Overall MAE: ${mae:.2f}M")
    print(f"Average bias: ${bias:+.2f}M")
    print(f"Under $10M MAE: ${low_mae:.2f}M")

    if use_trend:
        print(f"WAR trend coefficient: {coefficients[-1]:+.3f}")

print("\nTraining: 40 contracts from 2025")
print("Testing: 30 contracts from 2024")
