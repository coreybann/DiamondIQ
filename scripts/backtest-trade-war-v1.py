import csv
from collections import defaultdict
from pathlib import Path

INPUT = Path("public/data/player-fwar-2022-2026-modeling.csv")

players = defaultdict(dict)

with INPUT.open(newline="", encoding="utf-8") as file:
    for row in csv.DictReader(file):
        players[row["fangraphs_id"]][int(row["season"])] = row


def number(row, key):
    return float(row.get(key) or 0)


def weighted_average(values):
    denominator = sum(weight for _, weight in values)
    if denominator == 0:
        return 0.0
    return sum(value * weight for value, weight in values) / denominator


def project_component(history, war_key, workload_key, typical, weights):
    performances = []
    workloads = []

    for row in history:
        weight = weights[int(row["season"])]
        workload = number(row, workload_key)

        if workload <= 0:
            continue

        war = number(row, war_key)

        performances.append((war / workload, weight * workload))
        workloads.append((workload, weight))

    if not performances:
        return 0.0

    talent_rate = weighted_average(performances)

    total_workload = sum(weight for _, weight in performances)
    regression = typical * 0.12

    talent_rate *= total_workload / (total_workload + regression)

    historical_workload = weighted_average(workloads)

    expected_workload = (
        0.75 * historical_workload + 0.25 * typical
    )

    expected_workload = max(
        0, min(expected_workload, typical * 1.15)
    )

    return talent_rate * expected_workload


def predict(history, target):
    history = sorted(history, key=lambda r: int(r["season"]))
    latest = history[-1]

    weights = {
        target - 3: 0.20,
        target - 2: 0.30,
        target - 1: 0.50,
    }

    batting = project_component(
        history, "batting_fwar", "plate_appearances", 650, weights
    )

    pitching_history = [
        row for row in history
        if number(row, "innings_pitched") > 0
    ]

    starts = sum(number(r, "games_started") for r in pitching_history)
    innings = sum(number(r, "innings_pitched") for r in pitching_history)

    has_batting_workload = any(
        number(r, "plate_appearances") >= 300
        for r in history
    )

    if has_batting_workload and innings > 0:
        typical_ip = 100
    elif starts >= 10:
        typical_ip = 170
    else:
        typical_ip = 65

    pitching = project_component(
        history, "pitching_fwar", "innings_pitched",
        typical_ip, weights
    )

    age = number(latest, "age") + (
        target - int(latest["season"])
    )

    if age >= 35:
        age_factor = 0.93
    elif age >= 32:
        age_factor = 0.97
    else:
        age_factor = 1.0

    return (batting + pitching) * age_factor


for target in (2025, 2026):
    errors = []
    predictions = []
    actuals = []
    missing = 0

    for seasons in players.values():
        training_years = range(target - 3, target)

        history = [
            seasons[y]
            for y in training_years
            if y in seasons
        ]

        prior_pa = sum(
            number(r, "plate_appearances") for r in history
        )
        prior_ip = sum(
            number(r, "innings_pitched") for r in history
        )

        if prior_pa < 100 and prior_ip < 20:
            continue

        prediction = predict(history, target)

        actual = (
            number(seasons[target], "total_fwar")
            if target in seasons else 0.0
        )

        if target not in seasons:
            missing += 1

        predictions.append(prediction)
        actuals.append(actual)
        errors.append(prediction - actual)

    mae = sum(abs(e) for e in errors) / len(errors)
    bias = sum(errors) / len(errors)

    print(f"\n{target} MODEL 1.0 BACKTEST")
    print(f"Players evaluated: {len(errors)}")
    print(f"No target-season appearance: {missing}")
    print(f"MAE: {mae:.3f} WAR")
    print(f"Bias: {bias:+.3f} WAR")
    print(f"Average predicted WAR: {sum(predictions)/len(predictions):.3f}")
    print(f"Average actual WAR: {sum(actuals)/len(actuals):.3f}")
