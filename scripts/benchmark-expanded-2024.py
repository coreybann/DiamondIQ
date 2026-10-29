
import json
from pathlib import Path

import numpy as np

BASE = Path("public/data")


def load_contracts(filename, eligible_only=False):
    data = json.loads((BASE / filename).read_text())
    contracts = data["contracts"]

    if eligible_only:
        contracts = [
            c for c in contracts
            if c.get("warTrainingEligible") is True
        ]

    return contracts


def role(contract):
    position = contract["position"].upper()

    if position == "SP":
        return "SP"
    if position == "RP":
        return "RP"
    return "Hitter"


def features(contract):
    war = float(contract["priorTwoYearWar"]) / 2
    age = float(contract["ageAtSigning"])
    player_role = role(contract)

    is_sp = float(player_role == "SP")
    is_rp = float(player_role == "RP")

    return [
        1.0,
        war,
        age - 32,
        is_sp,
        is_rp,
        war * is_sp,
        war * is_rp,
    ]


def fit_model(contracts):
    x = np.array([features(c) for c in contracts], dtype=float)
    y = np.array([float(c["aavMillions"]) for c in contracts])

    coefficients, *_ = np.linalg.lstsq(x, y, rcond=None)
    return coefficients


def predict(model, contract):
    return max(1.0, float(np.array(features(contract)) @ model))


def evaluate(model, contracts):
    results = []

    for contract in contracts:
        actual = float(contract["aavMillions"])
        predicted = predict(model, contract)
        error = predicted - actual

        results.append({
            "player": contract["player"],
            "role": role(contract),
            "actual": actual,
            "predicted": predicted,
            "error": error,
            "absolute_error": abs(error),
        })

    return results


def summarize(results):
    errors = np.array([r["error"] for r in results])
    absolute = np.abs(errors)

    return {
        "n": len(results),
        "mae": float(np.mean(absolute)),
        "bias": float(np.mean(errors)),
        "within5": float(np.mean(absolute <= 5) * 100),
        "within10": float(np.mean(absolute <= 10) * 100),
    }


def print_summary(label, results):
    stats = summarize(results)

    print(
        f"{label:<20} "
        f"N={stats['n']:>3} | "
        f"MAE=${stats['mae']:>5.2f}M | "
        f"Bias=${stats['bias']:>+6.2f}M | "
        f"Within $5M={stats['within5']:>5.1f}% | "
        f"Within $10M={stats['within10']:>5.1f}%"
    )


def main():
    original_2024 = load_contracts(
        "mlb-contract-comparables-2024.json"
    )

    expanded_2024 = load_contracts(
        "mlb-contract-comparables-2024-war-enriched.json",
        eligible_only=True,
    )

    training_2023 = load_contracts(
        "mlb-contract-comparables-2023.json",
        eligible_only=True,
    )

    testing_2025 = load_contracts(
        "mlb-contract-comparables.json"
    )

    # Require complete WAR and age values for every tested model.
    for label, contracts in [
        ("Original 2024", original_2024),
        ("Expanded 2024", expanded_2024),
        ("2023 training", training_2023),
        ("2025 testing", testing_2025),
    ]:
        for c in contracts:
            if c.get("priorTwoYearWar") is None:
                raise ValueError(
                    f"{label}: missing WAR for {c['player']}"
                )

            if c.get("ageAtSigning") is None:
                raise ValueError(
                    f"{label}: missing age for {c['player']}"
                )

    combined = training_2023 + expanded_2024

    models = [
        ("Original 2024 only", original_2024),
        ("Expanded 2024 only", expanded_2024),
        ("2023 + expanded 2024", combined),
    ]

    print("DIAMONDIQ EXPANDED 2024 BENCHMARK")
    print("=" * 104)
    print("Original 2024 training:", len(original_2024))
    print("Expanded 2024 training:", len(expanded_2024))
    print("2023 training:", len(training_2023))
    print("Combined training:", len(combined))
    print("2025 test contracts:", len(testing_2025))

    print("\nMODEL COMPARISON")
    print("-" * 104)

    all_results = {}

    for label, training in models:
        model = fit_model(training)
        results = evaluate(model, testing_2025)
        all_results[label] = results
        print_summary(label, results)

    baseline = summarize(all_results["Original 2024 only"])
    best_label = min(
        all_results,
        key=lambda label: summarize(all_results[label])["mae"]
    )
    best = summarize(all_results[best_label])

    print("\nBEST MODEL BY MAE")
    print("Model:", best_label)
    print(f"MAE: ${best['mae']:.2f}M")
    print(
        "MAE change versus original: "
        f"${best['mae'] - baseline['mae']:+.2f}M"
    )

    print("\nMAE BY PLAYER TYPE")

    for player_role in ("Hitter", "SP", "RP"):
        print(f"\n{player_role}")

        for label, _ in models:
            group = [
                r for r in all_results[label]
                if r["role"] == player_role
            ]

            if group:
                print(
                    f"  {label:<24} "
                    f"${summarize(group)['mae']:.2f}M "
                    f"(N={len(group)})"
                )

    print("\nNo production files changed.")


if __name__ == "__main__":
    main()
