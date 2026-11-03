
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

INPUT = Path("public/data/prospect-history-2026-normalized.json")
OUTPUT = Path("public/data/prospect-projection-scores-2026.json")

LEVEL_ORDER = {
    16: 0,
    17: 0,
    14: 1,
    13: 2,
    12: 3,
    11: 4,
}

MIN_PA = 100
MIN_IP = 20

HITTING_METRICS = {
    "ops": (0.35, False),
    "iso": (0.25, False),
    "bbRate": (0.15, False),
    "kRate": (0.15, True),
    "avg": (0.10, False),
}

PITCHING_METRICS = {
    "era": (0.15, True),
    "whip": (0.15, True),
    "k9": (0.25, False),
    "bb9": (0.15, True),
    "hr9": (0.15, True),
    "pitchesPerInning": (0.15, True),
}

HITTING_SKILLS = {
    "iso": (0.40, False),
    "bbRate": (0.30, False),
    "kRate": (0.30, True),
}

PITCHING_SKILLS = {
    "k9": (0.40, False),
    "bb9": (0.30, True),
    "hr9": (0.30, True),
}


def number(value):
    try:
        result = float(value)
        return result if result == result and abs(result) != float("inf") else None
    except (TypeError, ValueError):
        return None


def innings_to_outs(value):
    if value is None:
        return None

    text = str(value)
    parts = text.split(".")

    if len(parts) > 2:
        return None

    try:
        innings = int(parts[0])
        remainder = int(parts[1]) if len(parts) == 2 else 0

        if remainder not in (0, 1, 2):
            return None

        return innings * 3 + remainder
    except ValueError:
        return None


def percentile(values, value, lower_better=False):
    if not values or value is None:
        return None

    below = sum(v < value for v in values)
    equal = sum(v == value for v in values)

    result = ((below + equal / 2) / len(values)) * 100

    return 100 - result if lower_better else result


def weighted_score(metric_scores, definitions):
    total = 0
    weight = 0

    for key, (metric_weight, _) in definitions.items():
        value = metric_scores.get(key)

        if value is None:
            continue

        total += value * metric_weight
        weight += metric_weight

    if weight == 0:
        return None

    return total / weight


def aggregate_records(records, group):
    grouped = defaultdict(list)

    for record in records:
        season = record.get("season")
        level_id = record.get("levelId")

        if not season or level_id not in LEVEL_ORDER:
            continue

        grouped[(str(season), level_id)].append(record)

    observations = []

    for (season, level_id), items in grouped.items():
        stats_list = [r.get("stats", {}) for r in items]

        if group == "hitting":
            pa = sum(number(s.get("plateAppearances")) or 0
                     for s in stats_list)

            if pa < MIN_PA:
                continue

            bb = sum(number(s.get("baseOnBalls")) or 0
                     for s in stats_list)
            so = sum(number(s.get("strikeOuts")) or 0
                     for s in stats_list)
            hits = sum(number(s.get("hits")) or 0
                       for s in stats_list)
            at_bats = sum(number(s.get("atBats")) or 0
                          for s in stats_list)
            total_bases = sum(number(s.get("totalBases")) or 0
                              for s in stats_list)

            ops_values = [
                (number(s.get("ops")), number(s.get("plateAppearances")))
                for s in stats_list
            ]

            ops_values = [
                (v, w) for v, w in ops_values
                if v is not None and w and w > 0
            ]

            ops = (
                sum(v * w for v, w in ops_values) /
                sum(w for _, w in ops_values)
                if ops_values else None
            )

            avg = hits / at_bats if at_bats else None
            slg = total_bases / at_bats if at_bats else None

            metrics = {
                "ops": ops,
                "iso": slg - avg if slg is not None and avg is not None else None,
                "bbRate": bb / pa * 100,
                "kRate": so / pa * 100,
                "avg": avg,
            }

            playing_time = pa

        else:
            outs = sum(
                innings_to_outs(s.get("inningsPitched")) or 0
                for s in stats_list
            )

            if outs < MIN_IP * 3:
                continue

            innings = outs / 3

            so = sum(number(s.get("strikeOuts")) or 0
                     for s in stats_list)
            bb = sum(number(s.get("baseOnBalls")) or 0
                     for s in stats_list)
            hr = sum(number(s.get("homeRuns")) or 0
                     for s in stats_list)
            earned_runs = sum(number(s.get("earnedRuns")) or 0
                              for s in stats_list)
            hits = sum(number(s.get("hits")) or 0
                       for s in stats_list)

            era = earned_runs * 9 / innings
            whip = (bb + hits) / innings

            pitches = sum(number(s.get("numberOfPitches")) or 0
                          for s in stats_list)

            metrics = {
                "era": era,
                "whip": whip,
                "k9": so * 9 / innings,
                "bb9": bb * 9 / innings,
                "hr9": hr * 9 / innings,
                "pitchesPerInning": (
                    pitches / innings if pitches > 0 else None
                ),
            }

            playing_time = outs

        ages = [
            number(s.get("age"))
            for s in stats_list
            if number(s.get("age")) is not None
        ]

        age = sum(ages) / len(ages) if ages else None

        observations.append({
            "season": season,
            "levelId": level_id,
            "age": age,
            "playingTime": playing_time,
            "metrics": metrics,
        })

    return observations


def build_projection():
    with INPUT.open() as file:
        data = json.load(file)

    players = data["players"]

    observations_by_player = {}
    populations = defaultdict(lambda: defaultdict(list))
    age_populations = defaultdict(list)

    # Build one observation per player, season and level.
    for player in players:
        group = player["group"]

        observations = aggregate_records(
            player.get("records", []),
            group
        )

        observations_by_player[player["id"]] = observations

        for observation in observations:
            cohort = (
                group,
                observation["season"],
                observation["levelId"],
            )

            if observation["age"] is not None:
                age_populations[cohort].append(observation["age"])

            for key, value in observation["metrics"].items():
                if value is not None:
                    populations[cohort][key].append(value)

    results = []

    for player in players:
        group = player["group"]
        observations = observations_by_player[player["id"]]

        if not observations:
            results.append({
                "id": player["id"],
                "name": player["name"],
                "group": group,
                "projectionScore": None,
                "ageAdjustedPerformance": None,
                "performanceTranslation": None,
                "projectableSkills": None,
                "qualifyingSeasons": 0,
                "status": "Insufficient qualifying playing time",
            })
            continue

        definitions = (
            HITTING_METRICS if group == "hitting"
            else PITCHING_METRICS
        )

        skill_definitions = (
            HITTING_SKILLS if group == "hitting"
            else PITCHING_SKILLS
        )

        scored_observations = []

        for observation in observations:
            cohort = (
                group,
                observation["season"],
                observation["levelId"],
            )

            metric_scores = {}

            for key, (_, lower_better) in definitions.items():
                value = observation["metrics"].get(key)
                population = populations[cohort][key]

                metric_scores[key] = percentile(
                    population,
                    value,
                    lower_better
                )

            production = weighted_score(
                metric_scores,
                definitions
            )

            skill_score = weighted_score(
                metric_scores,
                skill_definitions
            )

            age_score = None

            if observation["age"] is not None:
                age_score = percentile(
                    age_populations[cohort],
                    observation["age"],
                    lower_better=True
                )

            if production is not None and age_score is not None:
                age_adjusted = production * 0.80 + age_score * 0.20
            else:
                age_adjusted = None

            scored_observations.append({
                **observation,
                "production": production,
                "ageAdjusted": age_adjusted,
                "skills": skill_score,
            })

        # Use the latest qualifying observation at each level.
        by_level = {}

        for observation in scored_observations:
            level = observation["levelId"]
            current = by_level.get(level)

            if current is None or observation["season"] > current["season"]:
                by_level[level] = observation

        ordered = sorted(
            by_level.values(),
            key=lambda x: LEVEL_ORDER[x["levelId"]]
        )

        latest = ordered[-1]

        # Age-adjusted performance: latest qualifying level.
        age_component = latest["ageAdjusted"]

        # Performance translation: emphasize the highest level,
        # while retaining evidence from the preceding level.
        if latest["production"] is None:
            translation = None
        elif len(ordered) >= 2:
            previous = ordered[-2]["production"]

            translation = (
                latest["production"] * 0.65 + previous * 0.35
                if previous is not None
                else latest["production"]
            )
        else:
            translation = latest["production"]

        # Projectable skill indicators at the latest qualifying level.
        skills_component = latest["skills"]

        components = [
            (age_component, 0.40),
            (translation, 0.35),
            (skills_component, 0.25),
        ]

        available = [
            (value, weight)
            for value, weight in components
            if value is not None
        ]

        # Require all three components to avoid misleading partial scores.
        if len(available) == 3:
            projection = sum(
                value * weight for value, weight in available
            )
        else:
            projection = None

        results.append({
            "id": player["id"],
            "name": player["name"],
            "group": group,
            "projectionScore": (
                round(projection, 2)
                if projection is not None else None
            ),
            "ageAdjustedPerformance": (
                round(age_component, 2)
                if age_component is not None else None
            ),
            "performanceTranslation": (
                round(translation, 2)
                if translation is not None else None
            ),
            "projectableSkills": (
                round(skills_component, 2)
                if skills_component is not None else None
            ),
            "qualifyingSeasons": len(set(
                item["season"] for item in scored_observations
            )),
            "qualifyingLevels": len(ordered),
            "status": (
                "Scored" if projection is not None
                else "Insufficient component data"
            ),
        })

    results.sort(
        key=lambda x: (
            x["projectionScore"] is None,
            -(x["projectionScore"] or 0)
        )
    )

    output = {
        "season": data["season"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "ageAdjustedPerformanceWeight": 0.40,
            "performanceTranslationWeight": 0.35,
            "projectableSkillsWeight": 0.25,
            "minimumPlateAppearances": MIN_PA,
            "minimumInningsPitched": MIN_IP,
            "comparison": "Within season, competition level and group",
            "scoreScale": "0-100 percentile index",
        },
        "playerCount": len(results),
        "scoredCount": sum(
            p["projectionScore"] is not None for p in results
        ),
        "unavailableCount": sum(
            p["projectionScore"] is None for p in results
        ),
        "players": results,
    }

    with OUTPUT.open("w") as file:
        json.dump(output, file, indent=2)
        file.write("\n")

    print("Projection and Upside scoring complete.")
    print("Total prospects:", len(results))
    print("Scored:", output["scoredCount"])
    print("Unavailable:", output["unavailableCount"])
    print("Exported:", OUTPUT)


if __name__ == "__main__":
    build_projection()
