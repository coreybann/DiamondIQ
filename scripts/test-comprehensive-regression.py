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

six_relief = {
    "Shawn Armstrong", "Hoby Milner", "Phil Maton",
    "Chris Martin", "Paul Sewald", "Yimi Garcia"
}
mid25 = [p for p in new25 if p["player"] not in six_relief]

def features(p):
    year = p["contractStartYear"]
    war = 0.4*p[f"war{year-2}"] + 0.6*p[f"war{year-1}"]
    age = p["ageAtSigning"] - 32
    sp = int(p["position"] == "SP")
    rp = int(p["position"] == "RP")
    return [1, war, age, sp, rp, war*sp, war*rp]

def evaluate(train, test):
    X = np.array([features(p) for p in train])
    y = np.array([p["aavMillions"] for p in train])
    coefficients = np.linalg.lstsq(X, y, rcond=None)[0]

    predicted = np.maximum(
        1.0,
        np.array([features(p) for p in test]) @ coefficients
    )
    actual = np.array([p["aavMillions"] for p in test])
    errors = predicted - actual

    def mae(mask):
        return np.mean(np.abs(errors[mask])) if np.any(mask) else float("nan")

    return {
        "overall": mae(np.ones(len(test), dtype=bool)),
        "under10": mae(actual < 10),
        "relievers": mae(np.array([p["position"] == "RP" for p in test])),
        "bias": np.mean(errors)
    }

experiments = [
    ("Original", old24, old25),
    ("Before relievers", old24, mid25),
    ("Current", new24, new25)
]

for label, group24, group25 in experiments:
    print(f"\n{label.upper()} ({len(group24)+len(group25)} contracts)")
    print("-" * 50)

    for direction, train, test in [
        ("Train 2024 -> Test 2025", group24, group25),
        ("Train 2025 -> Test 2024", group25, group24)
    ]:
        result = evaluate(train, test)
        print(direction)
        print(f"  Overall MAE:      ${result['overall']:.2f}M")
        print(f"  Under $10M MAE:   ${result['under10']:.2f}M")
        print(f"  Reliever MAE:     ${result['relievers']:.2f}M")
        print(f"  Average bias:     ${result['bias']:+.2f}M")
