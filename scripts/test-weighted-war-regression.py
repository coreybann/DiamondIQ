
import json
from pathlib import Path

import numpy as np

DATA = Path("public/data")


def load(filename):
    return json.loads((DATA / filename).read_text())["contracts"]


def features(player, weighted=False):
    year = player["contractStartYear"]

    war_older = float(player[f"war{year - 2}"])
    war_recent = float(player[f"war{year - 1}"])

    if weighted:
        war = 0.4 * war_older + 0.6 * war_recent
    else:
        war = (war_older + war_recent) / 2

    age = float(player["ageAtSigning"]) - 32
    position = player["position"]

    sp = float(position == "SP")
    rp = float(position == "RP")

    return [
        1.0,
        war,
        age,
        sp,
        rp,
        war * sp,
        war * rp,
    ]


def fit(training, weighted=False):
    x = np.array(
        [features(p, weighted) for p in training],
        dtype=float,
    )
    y = np.array(
        [float(p["aavMillions"]) for p in training],
        dtype=float,
    )

    return np.linalg.lstsq(x, y, rcond=None)[0]


def evaluate(model, testing, weighted=False):
    actual = np.array(
        [float(p["aavMillions"]) for p in testing]
    )
    predicted = np.array([
        max(1.0, float(np.dot(features(p, weighted), model)))
        for p in testing
    ])

    errors = predicted - actual

    return {
        "n": len(testing),
        "mae": float(np.mean(np.abs(errors))),
        "bias": float(np.mean(errors)),
        "within5": float(np.mean(np.abs(errors) <= 5) * 100),
        "within10": float(np.mean(np.abs(errors) <= 10) * 100),
    }


def show(label, stats):
    print(
        f"{label:<28} "
        f"MAE=${stats['mae']:.2f}M | "
        f"Bias=${stats['bias']:+.2f}M | "
        f"Within $5M={stats['within5']:.1f}% | "
        f"Within $10M={stats['within10']:.1f}%"
    )


def main():
    original_2024 = load("mlb-contract-comparables-2024.json")
    expanded_2024 = load("mlb-contract-comparables-2024-war-enriched.json")
    test_2025 = load("mlb-contract-comparables.json")

    expanded_2024 = [
        p for p in expanded_2024
        if p.get("warTrainingEligible") is True
    ]

    print("DIAMONDIQ WAR WEIGHTING EXPERIMENT")
    print("=" * 95)
    print("Original 2024 training:", len(original_2024))
    print("Expanded 2024 training:", len(expanded_2024))
    print("2025 test contracts:", len(test_2025))
    print("\nAll models use the same 2025 test set.")
    print("No production files are modified.\n")

    for label, training in [
        ("Original 2024 / simple average", original_2024),
        ("Original 2024 / weighted WAR", original_2024),
        ("Expanded 2024 / simple average", expanded_2024),
        ("Expanded 2024 / weighted WAR", expanded_2024),
    ]:
        weighted = "weighted WAR" in label

        # Ensure all required historical WAR inputs exist.
        for p in training + test_2025:
            year = p["contractStartYear"]
            for key in (f"war{year - 2}", f"war{year - 1}"):
                if p.get(key) is None:
                    raise ValueError(
                        f"Missing {key} for {p['player']}"
                    )

        model = fit(training, weighted=weighted)
        stats = evaluate(model, test_2025, weighted=weighted)
        if label == "Original 2024 / weighted WAR":
            print("\nWEIGHTED MODEL COEFFICIENTS")
            for name, value in zip(
                ["intercept", "war", "age", "SP", "RP", "warSP", "warRP"],
                model
            ):
                print(f"{name}: {value:.8f}")
        show(label, stats)


if __name__ == "__main__":
    main()
