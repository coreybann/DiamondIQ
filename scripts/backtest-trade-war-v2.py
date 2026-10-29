import csv
from collections import defaultdict
from pathlib import Path

from importlib.util import spec_from_file_location, module_from_spec

spec = spec_from_file_location(
    "baseline",
    "scripts/backtest-trade-war-v1.py"
)
baseline = module_from_spec(spec)
spec.loader.exec_module(baseline)

players = baseline.players
number = baseline.number
predict_v1 = baseline.predict

# Experimental age adjustments, based on historical
# year-over-year changes in WAR production rates.
HITTER_AGE_CHANGE = {
    "young": 0.097,
    "prime": -0.298,
    "veteran": -0.536,
    "older": -0.806,
}

PITCHER_AGE_CHANGE = {
    "SP": {
        "young": -0.135,
        "prime": -0.456,
        "older": -0.723,
    },
    "RP": {
        "young": 0.123,
        "prime": -0.304,
        "older": -0.437,
    },
}


def weighted_average(values):
    total = sum(w for _, w in values)
    return sum(v * w for v, w in values) / total if total else 0


def project_component(history, target, war_key, workload_key,
                      typical, age_adjustment, workload_factor):
    weights = {
        target - 3: 0.20,
        target - 2: 0.30,
        target - 1: 0.50,
    }

    rates = []
    workloads = []

    for row in history:
        workload = number(row, workload_key)
        if workload <= 0:
            continue

        weight = weights[int(row["season"])]

        rates.append((
            number(row, war_key) / workload,
            weight * workload
        ))
        workloads.append((workload, weight))

    if not rates:
        return 0

    talent_rate = weighted_average(rates)

    sample = sum(w for _, w in rates)
    talent_rate *= sample / (sample + typical * 0.12)

    historical_workload = weighted_average(workloads)

    expected_workload = (
        0.75 * historical_workload + 0.25 * typical
    )

    expected_workload *= workload_factor
    expected_workload = max(
        0, min(expected_workload, typical * 1.15)
    )

    adjusted_rate = (
        talent_rate + age_adjustment / (
            600 if workload_key == "plate_appearances" else 180
        )
    )

    return adjusted_rate * expected_workload


def predict_v2(history, target):
    history = sorted(history, key=lambda r: int(r["season"]))
    latest = history[-1]

    age = number(latest, "age") + (
        target - int(latest["season"])
    )

    if age <= 25:
        hitter_change = HITTER_AGE_CHANGE["young"]
        hitter_workload = 0.97
    elif age <= 30:
        hitter_change = HITTER_AGE_CHANGE["prime"]
        hitter_workload = 0.88
    elif age <= 35:
        hitter_change = HITTER_AGE_CHANGE["veteran"]
        hitter_workload = 0.83
    else:
        hitter_change = HITTER_AGE_CHANGE["older"]
        hitter_workload = 0.65

    batting = project_component(
        history, target,
        "batting_fwar", "plate_appearances",
        650, hitter_change, hitter_workload
    )

    pitching_history = [
        r for r in history
        if number(r, "innings_pitched") > 0
    ]

    if not pitching_history:
        return batting

    starts = sum(number(r, "games_started") for r in pitching_history)
    innings = sum(number(r, "innings_pitched") for r in pitching_history)

    has_batting_workload = any(
        number(r, "plate_appearances") >= 300 for r in history
    )

    if has_batting_workload:
        typical_ip = 100
        role = "SP"
    elif starts >= 10:
        typical_ip = 170
        role = "SP"
    else:
        typical_ip = 65
        role = "RP"

    if age <= 28:
        pitcher_group = "young"
        pitcher_workload = 0.82 if role == "SP" else 0.90
    elif age <= 33:
        pitcher_group = "prime"
        pitcher_workload = 0.75 if role == "SP" else 0.78
    else:
        pitcher_group = "older"
        pitcher_workload = 0.72 if role == "SP" else 0.67

    pitching = project_component(
        history, target,
        "pitching_fwar", "innings_pitched",
        typical_ip,
        PITCHER_AGE_CHANGE[role][pitcher_group],
        pitcher_workload
    )

    return batting + pitching


def evaluate(target, established_only=False):
    errors_v1 = []
    errors_v2 = []

    for seasons in players.values():
        history = [
            seasons[y]
            for y in range(target - 3, target)
            if y in seasons
        ]

        prior_pa = sum(number(r, "plate_appearances") for r in history)
        prior_ip = sum(number(r, "innings_pitched") for r in history)

        if established_only:
            if prior_pa < 1000 and prior_ip < 250:
                continue
        elif prior_pa < 100 and prior_ip < 20:
            continue

        actual = (
            number(seasons[target], "total_fwar")
            if target in seasons else 0
        )

        errors_v1.append(predict_v1(history, target) - actual)
        errors_v2.append(predict_v2(history, target) - actual)

    mae_v1 = sum(abs(e) for e in errors_v1) / len(errors_v1)
    mae_v2 = sum(abs(e) for e in errors_v2) / len(errors_v2)

    bias_v2 = sum(errors_v2) / len(errors_v2)
    improvement = (mae_v1 - mae_v2) / mae_v1 * 100

    print(f"\n{target} {'ESTABLISHED' if established_only else 'ALL PLAYERS'}")
    print("Players:", len(errors_v1))
    print(f"Model 1.0 MAE: {mae_v1:.3f}")
    print(f"Model 2.0 MAE: {mae_v2:.3f}")
    print(f"Improvement: {improvement:+.2f}%")
    print(f"Model 2.0 bias: {bias_v2:+.3f}")


for year in (2025, 2026):
    evaluate(year)
    evaluate(year, established_only=True)
