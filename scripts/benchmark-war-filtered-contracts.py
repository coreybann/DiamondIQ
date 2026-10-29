
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


def fit_model(contracts):
    X = np.array([features(c) for c in contracts])
    y = np.array([c["aavMillions"] for c in contracts])

    coefficients, *_ = np.linalg.lstsq(X, y, rcond=None)
    return coefficients


def evaluate(model, contracts):
    results = []

    for c in contracts:
        actual = c["aavMillions"]
        predicted = max(0.0, float(features(c) @ model))

        results.append({
            "player": c["player"],
            "role": role(c),
            "war": c["priorTwoYearWar"],
            "actual": actual,
            "predicted": predicted,
            "error": predicted - actual,
            "absolute_error": abs(predicted - actual),
        })

    return results


def mae(results):
    return sum(r["absolute_error"] for r in results) / len(results)


def summarize(results):
    return {
        "mae": mae(results),
        "bias": sum(r["error"] for r in results) / len(results),
        "within_5m": 100 * sum(
            r["absolute_error"] <= 5 for r in results
        ) / len(results),
    }


def main():
    c2023 = load_contracts(2023)
    c2024 = load_contracts(2024)
    c2025 = load_contracts(2025)

    training = c2023 + c2024

    baseline = fit_model(c2024)
    baseline_results = evaluate(baseline, c2025)
    baseline_stats = summarize(baseline_results)

    print("DIAMONDIQ WAR-FILTERED CONTRACT BENCHMARK")
    print("=" * 72)
    print("Training contracts available:", len(training))
    print("2025 test contracts:", len(c2025))

    print("\nMIN WAR | TRAINING N | OVERALL MAE | BIAS | WITHIN $5M")
    print("-" * 72)

    comparisons = []

    for threshold in (None, 0, 1, 2, 3):
        if threshold is None:
            selected = training
            label = "All"
        else:
            selected = [
                c for c in training
                if c["priorTwoYearWar"] >= threshold
            ]
            label = f"{threshold}+"

        model = fit_model(selected)
        results = evaluate(model, c2025)
        stats = summarize(results)

        comparisons.append({
            "threshold": label,
            "training_n": len(selected),
            "results": results,
            "stats": stats,
        })

        print(
            f"{label:>7} | "
            f"{len(selected):>10} | "
            f"${stats['mae']:>9.2f}M | "
            f"${stats['bias']:>+6.2f}M | "
            f"{stats['within_5m']:>8.1f}%"
        )

    print("\n2024-ONLY BASELINE")
    print(f"Training contracts: {len(c2024)}")
    print(f"MAE: ${baseline_stats['mae']:.2f}M")
    print(f"Bias: ${baseline_stats['bias']:+.2f}M")
    print(f"Within $5M: {baseline_stats['within_5m']:.1f}%")

    best = min(
        comparisons,
        key=lambda item: item["stats"]["mae"]
    )

    print("\nBEST FILTERED MODEL")
    print("Minimum WAR:", best["threshold"])
    print("Training contracts:", best["training_n"])
    print(f"MAE: ${best['stats']['mae']:.2f}M")
    print(
        "Improvement over baseline: "
        f"${baseline_stats['mae'] - best['stats']['mae']:+.2f}M"
    )

    print("\nPERFORMANCE BY PLAYER TYPE")

    for player_role in ("Hitter", "SP", "RP"):
        old_group = [
            r for r in baseline_results
            if r["role"] == player_role
        ]
        new_group = [
            r for r in best["results"]
            if r["role"] == player_role
        ]

        print(
            f"{player_role:8} | "
            f"Original ${mae(old_group):.2f}M | "
            f"Filtered ${mae(new_group):.2f}M"
        )

    print("\nPERFORMANCE BY TEST-PLAYER WAR")

    for label, condition in [
        ("Under 2 WAR", lambda x: x < 2),
        ("2 to 5 WAR", lambda x: 2 <= x < 5),
        ("5+ WAR", lambda x: x >= 5),
    ]:
        old_group = [
            r for r in baseline_results
            if condition(r["war"])
        ]
        new_group = [
            r for r in best["results"]
            if condition(r["war"])
        ]

        if not old_group:
            continue

        print(
            f"{label:12} | "
            f"N={len(old_group):2} | "
            f"Original ${mae(old_group):.2f}M | "
            f"Filtered ${mae(new_group):.2f}M"
        )


if __name__ == "__main__":
    main()
