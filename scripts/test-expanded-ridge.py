import json
import numpy as np
from pathlib import Path
from sklearn.linear_model import Ridge

base = Path("public/data")

def load(filename):
    return json.loads((base / filename).read_text())["contracts"]

old24 = load("mlb-contract-comparables-2024.before-reliever-expansion.json")
new24 = load("mlb-contract-comparables-2024.json")
old25 = load("mlb-contract-comparables.pre-expansion.json")
new25 = load("mlb-contract-comparables.json")

def features(p):
    year = p["contractStartYear"]
    war = 0.4*p[f"war{year-2}"] + 0.6*p[f"war{year-1}"]
    age = p["ageAtSigning"] - 32
    sp = int(p["position"] == "SP")
    rp = int(p["position"] == "RP")
    return [war, age, sp, rp, war*sp, war*rp]

def evaluate(train, test, alpha):
    X = np.array([features(p) for p in train])
    y = np.array([p["aavMillions"] for p in train])
    Xtest = np.array([features(p) for p in test])
    actual = np.array([p["aavMillions"] for p in test])

    model = Ridge(alpha=alpha)
    model.fit(X, y)
    predicted = np.maximum(1.0, model.predict(Xtest))

    errors = predicted - actual
    low = actual < 10

    return (
        np.mean(np.abs(errors)),
        np.mean(np.abs(errors[low])),
        np.mean(errors)
    )

tests = [
    ("2025 fixed", new24, old25),
    ("2024 fixed", new25, old24),
    ("2025 full", new24, new25),
    ("2024 full", new25, new24)
]

for title, train, test in tests:
    print("\n" + title.upper())
    print("-" * 55)

    for alpha in [0, 0.1, 1, 5, 10, 25, 50, 100]:
        overall, low, bias = evaluate(train, test, alpha)
        print(
            f"Alpha {alpha:<5} "
            f"MAE ${overall:.2f}M | "
            f"Under $10M ${low:.2f}M | "
            f"Bias ${bias:+.2f}M"
        )
