import csv
import json
from collections import defaultdict
from pathlib import Path

INPUT = Path("public/data/player-fwar-2024-2026.csv")
OUTPUT = Path("public/data/trade-war-projections-2027.json")

WEIGHTS = {2024: 0.20, 2025: 0.30, 2026: 0.50}


def clamp(value, low, high):
    return max(low, min(high, value))


def weighted_average(values):
    denominator = sum(weight for _, weight in values)
    if denominator == 0:
        return 0.0
    return sum(value * weight for value, weight in values) / denominator


def project_component(seasons, war_key, workload_key, typical_workload):
    performances = []
    workloads = []

    for row in seasons:
        year = int(row["season"])
        weight = WEIGHTS[year]
        war = float(row[war_key])
        workload = float(row[workload_key])

        if workload <= 0:
            continue

        performances.append((war / workload, weight * workload))
        workloads.append((workload, weight))

    if not performances:
        return 0.0

    talent_rate = weighted_average(performances)

    # Moderate regression toward zero WAR per unit of workload.
    total_workload = sum(weight for _, weight in performances)
    regression = typical_workload * 0.12
    talent_rate *= total_workload / (total_workload + regression)

    # Forecast workload separately from performance.
    historical_workload = weighted_average(workloads)
    expected_workload = (
        0.75 * historical_workload
        + 0.25 * typical_workload
    )

    expected_workload = clamp(
        expected_workload,
        0,
        typical_workload * 1.15
    )

    return talent_rate * expected_workload


def project_player(seasons):
    seasons = sorted(seasons, key=lambda r: int(r["season"]))
    latest = seasons[-1]

    batting = project_component(
        seasons,
        "batting_fwar",
        "plate_appearances",
        650,
    )

    # Determine pitcher workload category.
    pitching_seasons = [
        row for row in seasons
        if float(row["innings_pitched"]) > 0
    ]

    total_starts = sum(
        float(row["games_started"])
        for row in pitching_seasons
    )

    total_ip = sum(
        float(row["innings_pitched"])
        for row in pitching_seasons
    )

    has_batting_workload = any(
        float(row["plate_appearances"]) >= 300
        for row in seasons
    )

    if has_batting_workload and total_ip > 0:
        typical_pitching_ip = 100
    elif total_starts >= 10:
        typical_pitching_ip = 170
    else:
        typical_pitching_ip = 65

    pitching = project_component(
        seasons,
        "pitching_fwar",
        "innings_pitched",
        typical_pitching_ip,
    )

    age = float(latest["age"]) + (
        2027 - int(latest["season"])
    )

    if age >= 35:
        age_factor = 0.93
    elif age >= 32:
        age_factor = 0.97
    else:
        age_factor = 1.0

    batting *= age_factor
    pitching *= age_factor

    return {
        "fangraphs_id": latest["fangraphs_id"],
        "player_name": latest["player_name"],
        "projected_age": round(age, 1),
        "projected_batting_fwar": round(batting, 2),
        "projected_pitching_fwar": round(pitching, 2),
        "projected_total_fwar": round(batting + pitching, 2),
        "seasons_available": [
            int(row["season"]) for row in seasons
        ],
    }


with INPUT.open(newline="", encoding="utf-8") as file:
    rows = list(csv.DictReader(file))

players = defaultdict(list)

for row in rows:
    players[row["fangraphs_id"]].append(row)

projections = [
    project_player(seasons)
    for seasons in players.values()
]

projections.sort(key=lambda p: p["player_name"])

OUTPUT.write_text(
    json.dumps(projections, indent=2, ensure_ascii=False) + "\n"
)

print(f"Saved {len(projections)} player projections.")

for name in [
    "Aaron Judge",
    "Juan Soto",
    "Shohei Ohtani",
    "Gerrit Cole",
]:
    for player in projections:
        if player["player_name"] == name:
            print(
                f"{name}: "
                f"{player['projected_total_fwar']:.2f} projected WAR "
                f"(batting {player['projected_batting_fwar']:.2f}, "
                f"pitching {player['projected_pitching_fwar']:.2f})"
            )
