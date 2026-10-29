
import json
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
            f"Missing WAR: {contract['player']} ({year})"
        )

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


def fit_weighted_model(contracts, weights):
    X = np.array([features(c) for c in contracts])
    y = np.array([c["aavMillions"] for c in contracts])
    w = np.sqrt(np.array(weights, dtype=float))

    coefficients, *_ = np.linalg.lstsq(
        X * w[:, None],
        y * w,
        rcond=None,
    )

    return coefficients


def predict(model, contract):
    return max(0.0, float(features(contract) @ model))


def evaluate(model, contracts):
    results = []

    for contract in contracts:
        actual = contract["aavMillions"]
        predicted = predict(model, contract)

        results.append({
            "player": contract["player"],
            "role": role(contract),
            "actual": actual,
            "predicted": predicted,
            "error": predicted - actual,
            "absolute_error": abs(predicted - actual),
        })

    return results


def summarize(results):
    errors = [r["absolute_error"] for r in results]

    return {
        "mae": sum(errors) / len(errors),
        "bias": sum(r["error"] for r in results) / len(results),
        "within_5m": 100 * sum(e <= 5 for e in errors) / len(errors),
    }


def main():
    contracts_2023 = load_contracts(2023)
    contracts_2024 = load_contracts(2024)
    contracts_2025 = load_contracts(2025)

    training = contracts_2023 + contracts_2024

    print("DIAMONDIQ WEIGHTED CONTRACT BENCHMARK")
    print("=" * 65)
    print("2023 contracts:", len(contracts_2023))
    print("2024 contracts:", len(contracts_2024))
    print("2025 test contracts:", len(contracts_2025))

    print("\n2024 WEIGHT | OVERALL MAE | BIAS | WITHIN $5M")
    print("-" * 65)

    comparisons = []

    for recent_weight in (1, 2, 3, 4, 6, 10):
        weights = (
            [1.0] * len(contracts_2023)
            + [float(recent_weight)] * len(contracts_2024)
        )

        model = fit_weighted_model(training, weights)
        results = evaluate(model, contracts_2025)
        stats = summarize(results)

        comparisons.append({
            "weight": recent_weight,
            "model": model,
            "results": results,
            "stats": stats,
        })

        print(
            f"{recent_weight:>11}x | "
            f"${stats['mae']:>9.2f}M | "
            f"${stats['bias']:>+6.2f}M | "
            f"{stats['within_5m']:>8.1f}%"
        )

    original_model = fit_weighted_model(
        contracts_2024,
        [1.0] * len(contracts_2024),
    )

    original_results = evaluate(original_model, contracts_2025)
    original_stats = summarize(original_results)

    print("\nORIGINAL 2024-ONLY BASELINE")
    print(f"MAE: ${original_stats['mae']:.2f}M")
    print(f"Bias: ${original_stats['bias']:+.2f}M")
    print(f"Within $5M: {original_stats['within_5m']:.1f}%")

    best = min(comparisons, key=lambda c: c["stats"]["mae"])

    print("\nBEST WEIGHTED MODEL")
    print(f"2024 weight: {best['weight']}x")
    print(f"MAE: ${best['stats']['mae']:.2f}M")
    print(
        f"Difference versus baseline: "
        f"${original_stats['mae'] - best['stats']['mae']:+.2f}M"
    )

    print("\nPERFORMANCE BY PLAYER TYPE")

    for player_role in ("Hitter", "SP", "RP"):
        original_group = [
            r for r in original_results
            if r["role"] == player_role
        ]

        weighted_group = [
            r for r in best["results"]
            if r["role"] == player_role
        ]

        old_mae = summarize(original_group)["mae"]
        new_mae = summarize(weighted_group)["mae"]

        print(
            f"{player_role:8} | "
            f"Original ${old_mae:.2f}M | "
            f"Weighted ${new_mae:.2f}M"
        )


if __name__ == "__main__":
    main()
