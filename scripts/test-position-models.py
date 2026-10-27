import json
import numpy as np
from pathlib import Path

base = Path("public/data")

def load(filename):
    return json.loads((base / filename).read_text())["contracts"]

old24 = load("mlb-contract-comparables-2024.before-reliever-expansion.json")
new24 = load("mlb-contract-comparables-2024.json")
old25 = load("mlb-contract-comparables.pre-expansion.json")
new25 = load("mlb-contract-comparables.json")

def group(p):
    if p["position"] == "SP":
        return "SP"
    if p["position"] == "RP":
        return "RP"
    return "Hitter"

def war(p):
    year = p["contractStartYear"]
    return (
        0.4 * p[f"war{year-2}"]
        + 0.6 * p[f"war{year-1}"]
    )

def overall_features(p):
    w = war(p)
    age = p["ageAtSigning"] - 32
    sp = int(group(p) == "SP")
    rp = int(group(p) == "RP")
    return [1, w, age, sp, rp, w*sp, w*rp]

def group_features(p):
    return [1, war(p), p["ageAtSigning"] - 32]

def fit_predict(train, test, feature_fn):
    X = np.array([feature_fn(p) for p in train])
    y = np.array([p["aavMillions"] for p in train])
    coef = np.linalg.lstsq(X, y, rcond=None)[0]
    return np.maximum(
        1.0,
        np.array([feature_fn(p) for p in test]) @ coef
    )

def predictions(train, test):
    overall = fit_predict(train, test, overall_features)
    separate = overall.copy()

    for category in ["Hitter", "SP", "RP"]:
        training = [p for p in train if group(p) == category]
        indices = [
            i for i, p in enumerate(test)
            if group(p) == category
        ]

        if len(training) < 5 or not indices:
            continue

        subset = [test[i] for i in indices]
        values = fit_predict(training, subset, group_features)

        for i, value in zip(indices, values):
            separate[i] = value

    hybrid = 0.5 * overall + 0.5 * separate

    return {
        "Overall": overall,
        "Separate": separate,
        "Hybrid": hybrid
    }

def evaluate(train, test):
    actual = np.array([p["aavMillions"] for p in test])
    low = actual < 10

    for name, predicted in predictions(train, test).items():
        errors = predicted - actual

        print(
            f"{name:<10} "
            f"MAE ${np.mean(np.abs(errors)):.2f}M | "
            f"Under $10M ${np.mean(np.abs(errors[low])):.2f}M | "
            f"Bias ${np.mean(errors):+.2f}M"
        )

    print("\nTraining group sizes:")
    for category in ["Hitter", "SP", "RP"]:
        count = sum(group(p) == category for p in train)
        print(f"  {category}: {count}")

tests = [
    ("2025 FIXED TEST - ORIGINAL TRAINING",
     old24, old25),
    ("2025 FIXED TEST - EXPANDED TRAINING",
     new24, old25),
    ("2024 FIXED TEST - ORIGINAL TRAINING",
     old25, old24),
    ("2024 FIXED TEST - EXPANDED TRAINING",
     new25, old24),
    ("2025 FULL TEST - EXPANDED TRAINING",
     new24, new25),
    ("2024 FULL TEST - EXPANDED TRAINING",
     new25, new24)
]

for title, train, test in tests:
    print("\n" + "=" * 62)
    print(title)
    print("=" * 62)
    evaluate(train, test)
