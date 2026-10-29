import csv
import json
from collections import defaultdict
from pathlib import Path

INPUT = Path("public/data/player-fwar-2024-2026.csv")
OUTPUT = Path("public/data/trade-war-projections-2027.json")

WEIGHTS = {2024: 0.20, 2025: 0.30, 2026: 0.50}

# Illustrative regression assumptions, not fitted coefficients.
HITTER_REGRESSION_PA = 400
PITCHER_REGRESSION_IP = 100
HITTER_REFERENCE_PA = 600
PITCHER_REFERENCE_IP = 160


def clamp(value, low, high):
    return max(low, min(high, value))


def weighted(values):
    total_weight = sum(weight for value, weight in values)
    if not total_weight:
        return 0
    return sum(value * weight for value, weight in values) / total_weight


def project_component(seasons, war_key, workload_key, reference, regression):
    performance = []
    workload = []

    for row in seasons:
        year = int(row["season"])
        weight = WEIGHTS[year]
        war = float(row[war_key])
        playing_time = float(row[workload_key])

        if playing_time > 0:
            rate = war / playing_time
            performance.append((rate, weight * playing_time))
            workload.append((playing_time, weight))

    if not performance:
        return 0.0

    total_weighted_workload = sum(w for _, w in performance)
    rate = weighted(performance)

    # Shrink extreme rates toward replacement-level WAR.
    shrinkage = total_weighted_workload / (
        total_weighted_workload + regression
    )
    rate *= shrinkage

    # Use recent workload, with a partial return toward typical workload.
    expected_workload = weighted(workload)
    expected_workload = 0.7 * expected_workload + 0.3 * reference

    expected_workload = clamp(expected_workload, 0, reference * 1.15)

    return rate * expected_workload


def project_player(seasons):
    seasons = sorted(seasons, key=lambda r: int(r["season"]))
    latest = seasons[-1]

    batting = project_component(
        seasons,
        "batting_fwar",
        "plate_appearances",
        HITTER_REFERENCE_PA,
        HITTER_REGRESSION_PA,
    )

    pitching = project_component(
        seasons,
        "pitching_fwar",
        "innings_pitched",
        PITCHER_REFERENCE_IP,
        PITCHER_REGRESSION_IP,
    )

    age = float(latest["age"]) + (2027 - int(latest["season"]))

    if age >= 35:
        age_factor = 0.88
    elif age >= 32:
        age_factor = 0.94
    elif age >= 30:
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
        "seasons_available": [int(r["season"]) for r in seasons],
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

for name in ["Aaron Judge", "Juan Soto", "Shohei Ohtani", "Gerrit Cole"]:
    for player in projections:
        if player["player_name"] == name:
            print(
                f"{name}: "
                f"{player['projected_total_fwar']:.2f} projected WAR "
                f"(batting {player['projected_batting_fwar']:.2f}, "
                f"pitching {player['projected_pitching_fwar']:.2f})"
            )
