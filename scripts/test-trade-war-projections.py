import csv
from collections import defaultdict
from pathlib import Path

INPUT = Path("public/data/player-fwar-2024-2026.csv")

with INPUT.open(newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

players = defaultdict(dict)

for row in rows:
    players[row["fangraphs_id"]][int(row["season"])] = row


def number(row, key):
    return float(row.get(key) or 0)


def predict_component(history, war_key, workload_key, typical_workload):
    weights = {2022: 0.15, 2023: 0.25, 2024: 0.60}
    rates = []
    workloads = []

    for year, weight in weights.items():
        row = history.get(year)
        if not row:
            continue

        workload = number(row, workload_key)
        war = number(row, war_key)

        if workload > 0:
            rates.append((war / workload, weight * workload))
            workloads.append((workload, weight))

    if not rates:
        return None

    denominator = sum(weight for _, weight in rates)
    rate = sum(value * weight for value, weight in rates) / denominator

    # Moderate regression toward zero.
    rate *= denominator / (denominator + typical_workload * 0.12)

    workload_denominator = sum(weight for _, weight in workloads)
    historical_workload = (
        sum(value * weight for value, weight in workloads)
        / workload_denominator
    )

    expected_workload = 0.75 * historical_workload + 0.25 * typical_workload
    expected_workload = min(expected_workload, typical_workload * 1.15)

    return rate * expected_workload


predictions = []
actuals = []

for player_id, seasons in players.items():
    # Only use players with 2024, 2025, and 2026 records.
    if not all(year in seasons for year in (2024, 2025, 2026)):
        continue

    history = {year: seasons[year] for year in (2024, 2025)}

    batting = predict_component(
        history, "batting_fwar", "plate_appearances", 650
    )

    pitching = predict_component(
        history, "pitching_fwar", "innings_pitched", 170
    )

    predicted = (batting or 0) + (pitching or 0)
    actual = number(seasons[2026], "total_fwar")

    # Require meaningful prior playing time so the test isn't dominated
    # by players with no established MLB history.
    prior_pa = sum(number(history[y], "plate_appearances") for y in history)
    prior_ip = sum(number(history[y], "innings_pitched") for y in history)

    if prior_pa < 100 and prior_ip < 20:
        continue

    predictions.append(predicted)
    actuals.append(actual)

if not predictions:
    raise SystemExit("No eligible players for backtesting.")

errors = [p - a for p, a in zip(predictions, actuals)]
mae = sum(abs(e) for e in errors) / len(errors)
bias = sum(errors) / len(errors)

print("2026 WAR BACKTEST")
print("Training data: 2024-2025")
print("Test data: 2026")
print(f"Eligible players: {len(errors)}")
print(f"MAE: {mae:.2f} WAR")
print(f"Bias: {bias:+.2f} WAR")
