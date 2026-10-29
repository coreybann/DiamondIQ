
import json
import math
from pathlib import Path

import numpy as np


FILES = {
    2023: "public/data/mlb-contract-comparables-2023.json",
    2024: "public/data/mlb-contract-comparables-2024.json",
    2025: "public/data/mlb-contract-comparables.json",
}


def load_contracts(year):
    data = json.loads(Path(FILES[year]).read_text())
    contracts = data["contracts"]

    if year == 2023:
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
    year = contract["contractStartYear"]

    recent = contract.get(f"war{year - 1}")
    older = contract.get(f"war{year - 2}")

    if recent is None or older is None:
        raise ValueError(
            f"Missing WAR for {contract['player']} ({year})"
        )

    # Use the same weighting for every season.
    weighted_war = 0.6 * recent + 0.4 * older

    age = float(contract["ageAtSigning"])
    player_role = role(contract)

    is_sp = float(player_role == "SP")
    is_rp = float(player_role == "RP")

    return np.array([
        1.0,
        weighted_war,
        age - 30,
        is_sp,
        is_rp,
        weighted_war * is_sp,
        weighted_war * is_rp,
    ], dtype=float)


def fit_model(contracts):
    X = np.array([features(c) for c in contracts])
    y = np.array([c["aavMillions"] for c in contracts])

    coefficients, *_ = np.linalg.lstsq(X, y, rcond=None)

    return coefficients


def predict(model, contract):
    prediction = float(features(contract) @ model)

    # Contract AAV cannot be negative.
    return max(0.0, prediction)


def evaluate(model, contracts):
    results = []

    for c in contracts:
        actual = c["aavMillions"]
        predicted = predict(model, c)

        results.append({
            "player": c["player"],
            "role": role(c),
            "actual": actual,
            "predicted": predicted,
            "error": predicted - actual,
            "absolute_error": abs(predicted - actual),
        })

    return results


def summarize(results):
    errors = [r["absolute_error"] for r in results]

    return {
        "count": len(results),
        "mae": sum(errors) / len(errors),
        "bias": sum(r["error"] for r in results) / len(results),
        "within_5m": 100 * sum(e <= 5 for e in errors) / len(errors),
        "within_10m": 100 * sum(e <= 10 for e in errors) / len(errors),
    }


def print_summary(name, results):
    stats = summarize(results)

    print(f"\n{name}")
    print(f"Contracts tested: {stats['count']}")
    print(f"Mean absolute error: ${stats['mae']:.2f}M")
    print(f"Average bias: ${stats['bias']:+.2f}M")
    print(f"Within $5M: {stats['within_5m']:.1f}%")
    print(f"Within $10M: {stats['within_10m']:.1f}%")


def main():
    contracts_2023 = load_contracts(2023)
    contracts_2024 = load_contracts(2024)
    contracts_2025 = load_contracts(2025)

    original = fit_model(contracts_2024)
    expanded = fit_model(contracts_2023 + contracts_2024)

    original_results = evaluate(original, contracts_2025)
    expanded_results = evaluate(expanded, contracts_2025)

    print("DIAMONDIQ CONTRACT MODEL BENCHMARK")
    print("=" * 42)
    print("Original training:", len(contracts_2024))
    print("Expanded training:", len(contracts_2023) + len(contracts_2024))
    print("2025 test contracts:", len(contracts_2025))

    print_summary("ORIGINAL MODEL", original_results)
    print_summary("EXPANDED MODEL", expanded_results)

    original_mae = summarize(original_results)["mae"]
    expanded_mae = summarize(expanded_results)["mae"]

    print("\nOVERALL COMPARISON")
    print(f"MAE improvement: ${original_mae - expanded_mae:+.2f}M")

    for player_role in ("Hitter", "SP", "RP"):
        old_group = [
            r for r in original_results
            if r["role"] == player_role
        ]
        new_group = [
            r for r in expanded_results
            if r["role"] == player_role
        ]

        print(f"\n{player_role.upper()} PERFORMANCE")
        print(f"Contracts: {len(old_group)}")
        print(f"Original MAE: ${summarize(old_group)['mae']:.2f}M")
        print(f"Expanded MAE: ${summarize(new_group)['mae']:.2f}M")

    print("\n10 BIGGEST EXPANDED-MODEL ERRORS")

    for r in sorted(
        expanded_results,
        key=lambda item: item["absolute_error"],
        reverse=True,
    )[:10]:
        print(
            f"{r['player']:22} "
            f"Actual ${r['actual']:6.2f}M  "
            f"Predicted ${r['predicted']:6.2f}M  "
            f"Error ${r['absolute_error']:5.2f}M"
        )


if __name__ == "__main__":
    main()
