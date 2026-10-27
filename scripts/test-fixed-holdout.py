import json
import numpy as np
from pathlib import Path

base = Path("public/data")

def load(name):
    return json.loads((base / name).read_text())["contracts"]

old24 = load("mlb-contract-comparables-2024.before-reliever-expansion.json")
new24 = load("mlb-contract-comparables-2024.json")
old25 = load("mlb-contract-comparables.pre-expansion.json")
new25 = load("mlb-contract-comparables.json")

def features(p):
    year = p["contractStartYear"]
    war = 0.4 * p[f"war{year-2}"] + 0.6 * p[f"war{year-1}"]
    age = p["ageAtSigning"] - 32
    sp = int(p["position"] == "SP")
    rp = int(p["position"] == "RP")
    return [1, war, age, sp, rp, war*sp, war*rp]

def evaluate(train, test):
    X = np.array([features(p) for p in train])
    y = np.array([p["aavMillions"] for p in train])
    coef = np.linalg.lstsq(X, y, rcond=None)[0]

    predictions = np.maximum(
        1.0, np.array([features(p) for p in test]) @ coef
    )
    actual = np.array([p["aavMillions"] for p in test])
    errors = predictions - actual

    low = actual < 10
    return (
        np.mean(np.abs(errors)),
        np.mean(np.abs(errors[low])),
        np.mean(errors)
    )

for title, original_train, expanded_train, fixed_test in [
    ("2025 FIXED TEST (40 players)", old24, new24, old25),
    ("2024 FIXED TEST (30 players)", old25, new25, old24)
]:
    print("\n" + title)
    print("-" * 55)

    for label, train in [
        ("Original training", original_train),
        ("Expanded training", expanded_train)
    ]:
        overall, low, bias = evaluate(train, fixed_test)
        print(
            f"{label:<20} "
            f"MAE ${overall:.2f}M | "
            f"Under $10M ${low:.2f}M | "
            f"Bias ${bias:+.2f}M"
        )
