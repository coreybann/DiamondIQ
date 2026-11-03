#!/usr/bin/env python3
"""Analyze level-adjusted minor-league performance trajectories."""

import json
from collections import defaultdict
from pathlib import Path

SOURCE = Path("public/data/prospect-history-2026-normalized.json")
MIN_GROUP_SIZE = 30


def innings_outs(value):
    whole, _, outs = str(value or "0").partition(".")
    if not whole.isdigit() or not outs.isdigit() and outs:
        return 0
    if int(outs or 0) > 2:
        return 0
    return int(whole) * 3 + int(outs or 0)


def percentile(values, value, lower_better=False):
    if len(values) <= 1:
        return 50.0

    below = sum(item < value for item in values)
    equal = sum(item == value for item in values)
    result = (below + equal / 2) / len(values) * 100

    return 100 - result if lower_better else result



LEVEL_RANKS = {
    16: 0,
    5442: 0.5,
    15: 0.5,
    14: 1,
    13: 2,
    12: 3,
    11: 4,
}


def advancement_score(previous_level, current_level):
    """Score meaningful advancement between qualifying levels."""
    previous = LEVEL_RANKS.get(previous_level)
    current = LEVEL_RANKS.get(current_level)

    if previous is None or current is None:
        return None

    change = current - previous

    if change < 0:
        return 20
    if change == 0:
        return 65 if current_level == 11 else 50
    if change >= 3:
        return 100
    if change >= 2:
        return 95
    if change >= 1:
        return 75
    return 60


def main():
    data = json.loads(SOURCE.read_text())
    benchmarks = defaultdict(list)
    qualifying = []

    for player in data["players"]:
        for record in player["records"]:
            stats = record["stats"]
            group = player["group"]

            try:
                if group == "hitting":
                    playing_time = int(stats.get("plateAppearances") or 0)
                    if playing_time < 100:
                        continue
                    value = float(stats["ops"])
                else:
                    playing_time = innings_outs(stats.get("inningsPitched"))
                    if playing_time < 60:
                        continue
                    value = float(stats["era"])
            except (ValueError, TypeError, KeyError):
                continue

            key = (record["season"], record["levelId"], group)
            benchmarks[key].append(value)
            qualifying.append((player["id"], key, value, playing_time))

    seasonal = defaultdict(list)

    for player_id, key, value, playing_time in qualifying:
        values = benchmarks[key]

        if len(values) < MIN_GROUP_SIZE:
            continue

        group = key[2]
        score = percentile(values, value, group == "pitching")
        seasonal[(player_id, key[0])].append((score, playing_time))

    player_seasons = defaultdict(dict)

    for (player_id, season), observations in seasonal.items():
        total_time = sum(weight for _, weight in observations)
        score = sum(
            value * weight for value, weight in observations
        ) / total_time

        player_seasons[player_id][season] = round(score, 2)

    comparable = {
        player_id: scores
        for player_id, scores in player_seasons.items()
        if len(scores) >= 2
    }

    print("Comparison groups:", len(benchmarks))
    print(
        "Groups meeting minimum size:",
        sum(len(values) >= MIN_GROUP_SIZE for values in benchmarks.values()),
    )
    print("Prospects with 2+ comparable seasons:", len(comparable))

    changes = []

    for scores in comparable.values():
        years = sorted(scores, key=int)
        latest = scores[years[-1]]
        previous = scores[years[-2]]
        changes.append(latest - previous)

    changes.sort()

    latest_year_counts = defaultdict(int)
    for scores in comparable.values():
        latest_year = max(scores, key=int)
        latest_year_counts[latest_year] += 1

    print("\nLatest qualifying season:")
    for year in sorted(latest_year_counts):
        print(year, ":", latest_year_counts[year])

    previous_year_counts = defaultdict(int)
    for scores in comparable.values():
        years = sorted(scores, key=int)
        previous_year_counts[years[-2]] += 1

    print("\nPrevious qualifying season:")
    for year in sorted(previous_year_counts):
        print(year, ":", previous_year_counts[year])

    consecutive_changes = []

    for scores in comparable.values():
        if "2025" in scores and "2026" in scores:
            consecutive_changes.append(scores["2026"] - scores["2025"])

    consecutive_changes.sort()

    print("\nConsecutive 2025-2026 improvement:")
    print("Eligible prospects:", len(consecutive_changes))
    print(
        "Median change:",
        round(consecutive_changes[len(consecutive_changes) // 2], 2),
    )
    print(
        "10th percentile:",
        round(consecutive_changes[int(len(consecutive_changes) * 0.10)], 2),
    )
    print(
        "90th percentile:",
        round(consecutive_changes[int(len(consecutive_changes) * 0.90)], 2),
    )

    improvement_scores = {}

    for player_id, scores in comparable.items():
        if "2025" not in scores or "2026" not in scores:
            continue

        change = scores["2026"] - scores["2025"]
        improvement_scores[player_id] = round(
            percentile(consecutive_changes, change), 2
        )

    advancement_scores = {}

    for player in data["players"]:
        levels = {"2025": [], "2026": []}

        for record in player["records"]:
            year = str(record["season"])
            if year not in levels:
                continue

            level_id = int(record["levelId"])
            if level_id not in LEVEL_RANKS:
                continue

            stats = record["stats"]

            try:
                if player["group"] == "hitting":
                    qualifies = int(
                        stats.get("plateAppearances") or 0
                    ) >= 100
                else:
                    qualifies = innings_outs(
                        stats.get("inningsPitched")
                    ) >= 60
            except (ValueError, TypeError):
                continue

            if qualifies:
                levels[year].append(level_id)

        if not all(levels.values()):
            continue

        previous = max(
            levels["2025"], key=lambda level: LEVEL_RANKS[level]
        )
        current = max(
            levels["2026"], key=lambda level: LEVEL_RANKS[level]
        )

        advancement_scores[player["id"]] = advancement_score(
            previous, current
        )

    print("\nMinor-League Advancement Scores:")
    print("Scored prospects:", len(advancement_scores))

    for player in data["players"]:
        if player["name"] in (
            "Ramon Marquez",
            "Kade Anderson",
            "Luis Escudero",
            "Josue De Paula",
            "Ryan Sloan",
        ):
            print(
                player["name"],
                "| Advancement score:",
                advancement_scores.get(player["id"]),
            )

    sustained_scores = {}

    for player_id, scores in comparable.items():
        if "2025" not in scores or "2026" not in scores:
            continue

        sustained_scores[player_id] = round(
            (scores["2025"] + scores["2026"]) / 2, 2
        )

    print("\nSustained Performance Scores:")
    print("Scored prospects:", len(sustained_scores))

    for player in data["players"]:
        if player["name"] in (
            "Ramon Marquez",
            "Kade Anderson",
            "Luis Escudero",
            "Josue De Paula",
            "Ryan Sloan",
        ):
            print(
                player["name"],
                "| Sustained score:",
                sustained_scores.get(player["id"]),
            )

    development_scores = {}

    for player_id in improvement_scores:
        if (
            player_id not in advancement_scores
            or player_id not in sustained_scores
        ):
            continue

        development_scores[player_id] = round(
            improvement_scores[player_id] * 0.50
            + advancement_scores[player_id] * 0.30
            + sustained_scores[player_id] * 0.20,
            2,
        )

    output = {
        "season": 2026,
        "method": "historical-level-adjusted-development",
        "weights": {
            "improvement": 0.50,
            "advancement": 0.30,
            "sustained": 0.20,
        },
        "scoredCount": len(development_scores),
        "players": [
            {
                "id": player["id"],
                "developmentScore": development_scores.get(player["id"]),
                "improvementScore": improvement_scores.get(player["id"]),
                "advancementScore": advancement_scores.get(player["id"]),
                "sustainedScore": sustained_scores.get(player["id"]),
            }
            for player in data["players"]
        ],
    }

    output_path = Path(
        "public/data/prospect-development-scores-2026.json"
    )
    temporary_path = output_path.with_suffix(".json.tmp")

    temporary_path.write_text(
        json.dumps(output, indent=2) + "\n"
    )
    temporary_path.replace(output_path)

    print("Exported:", output_path)
    print("Total prospects:", len(output["players"]))

    print("\nCombined Development Trajectory Scores:")
    print("Scored prospects:", len(development_scores))

    for player in data["players"]:
        if player["name"] in (
            "Ramon Marquez",
            "Kade Anderson",
            "Luis Escudero",
            "Josue De Paula",
            "Ryan Sloan",
        ):
            print(
                player["name"],
                "| Development score:",
                development_scores.get(player["id"]),
            )

    print("\nPerformance Improvement Scores:")
    print("Scored prospects:", len(improvement_scores))

    for player in data["players"]:
        if player["name"] in (
            "Ramon Marquez",
            "Kade Anderson",
            "Luis Escudero",
            "Josue De Paula",
            "Ryan Sloan",
        ):
            print(
                player["name"],
                "| Improvement score:",
                improvement_scores.get(player["id"]),
            )

    print("\nLatest year-over-year percentile changes:")
    print("Prospects analyzed:", len(changes))
    print("Median change:", round(changes[len(changes) // 2], 2))
    print("10th percentile:", round(changes[int(len(changes) * 0.10)], 2))
    print("90th percentile:", round(changes[int(len(changes) * 0.90)], 2))
    print("Improved:", sum(change > 0 for change in changes))
    print("Declined:", sum(change < 0 for change in changes))

    for player in data["players"]:
        if player["name"] in (
            "Ramon Marquez",
            "Kade Anderson",
            "Luis Escudero",
            "Josue De Paula",
            "Ryan Sloan",
        ):
            print(
                player["name"],
                "| Seasonal percentiles:",
                player_seasons.get(player["id"], {}),
            )


if __name__ == "__main__":
    main()
