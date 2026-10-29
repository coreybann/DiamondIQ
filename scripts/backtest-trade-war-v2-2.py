
import csv
from collections import defaultdict
from pathlib import Path

INPUT = Path("public/data/player-fwar-2022-2026-modeling.csv")

TARGETS = (2025, 2026)

def number(row, key):
    return float(row.get(key) or 0)


def weighted_average(values):
    denominator = sum(weight for _, weight in values)
    if denominator <= 0:
        return 0.0
    return sum(value * weight for value, weight in values) / denominator


with INPUT.open(newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

players = defaultdict(dict)

for row in rows:
    players[row["fangraphs_id"]][int(row["season"])] = row


def build_trend_pa_samples(target):
    samples = defaultdict(list)

    for seasons in players.values():
        for year in sorted(seasons):
            next_year = year + 1

            # Never use the target season or later.
            if next_year >= target:
                continue
            if next_year not in seasons:
                continue

            current = seasons[year]
            following = seasons[next_year]

            prior_history = [
                seasons[y]
                for y in range(year - 2, year + 1)
                if y in seasons
            ]

            experience_pa = sum(
                number(row, "plate_appearances")
                for row in prior_history
            )

            current_pa = number(
                current, "plate_appearances"
            )

            if experience_pa < 100 or current_pa < 100:
                continue

            previous_pa = number(
                seasons.get(year - 1, {}),
                "plate_appearances",
            )

            if experience_pa >= 1000:
                category = "Established"
            elif current_pa - previous_pa >= 100:
                category = "Increasing"
            elif current_pa - previous_pa <= -100:
                category = "Decreasing"
            else:
                category = "Stable"

            samples[category].append(
                number(following, "plate_appearances")
            )

    return samples


def build_trend_pa_samples(target):
    samples = defaultdict(list)

    for seasons in players.values():
        for year in sorted(seasons):
            next_year = year + 1

            if next_year >= target:
                continue
            if next_year not in seasons:
                continue

            current = seasons[year]
            following = seasons[next_year]

            prior_history = [
                seasons[y]
                for y in range(year - 2, year + 1)
                if y in seasons
            ]

            experience_pa = sum(
                number(row, "plate_appearances")
                for row in prior_history
            )

            current_pa = number(
                current, "plate_appearances"
            )

            if experience_pa < 100 or current_pa < 100:
                continue

            previous_pa = number(
                seasons.get(year - 1, {}),
                "plate_appearances",
            )

            if experience_pa >= 1000:
                category = "Established"
            elif current_pa - previous_pa >= 100:
                category = "Increasing"
            elif current_pa - previous_pa <= -100:
                category = "Decreasing"
            else:
                category = "Stable"

            samples[category].append(
                number(following, "plate_appearances")
            )

    return samples

def project_player(seasons, target, trend_pa_samples):
    # Only seasons preceding the target are eligible.
    history = {
        year: seasons[year]
        for year in range(target - 3, target)
        if year in seasons
    }

    if not history:
        return None

    prior_pa = sum(
        number(row, "plate_appearances")
        for row in history.values()
    )

    if prior_pa < 100:
        return None

    # Experience classification.
    if prior_pa < 500:
        experience = "100-499 PA"
    elif prior_pa < 1000:
        experience = "500-999 PA"
    else:
        experience = "1000+ PA"

    weights = {
        target - 3: 0.20,
        target - 2: 0.30,
        target - 1: 0.50,
    }

    rates = []
    workloads = []

    for year, row in history.items():
        pa = number(row, "plate_appearances")
        if pa <= 0:
            continue

        weight = weights[year]
        rates.append((
            number(row, "batting_fwar") / pa,
            pa * weight,
        ))
        workloads.append((pa, weight))

    if not rates:
        return None

    latest_year = max(history)
    latest = history[latest_year]

    age = number(latest, "age") + target - latest_year

    # Historical age-group changes must be estimated using
    # transitions that end before the target season.
    transitions = defaultdict(list)

    for year in sorted(history):
        next_year = year + 1
        if next_year not in history:
            continue

        current = history[year]
        following = history[next_year]

        current_pa = number(current, "plate_appearances")
        following_pa = number(following, "plate_appearances")

        if current_pa >= 100 and following_pa > 0:
            current_rate = (
                number(current, "batting_fwar") / current_pa * 600
            )
            following_rate = (
                number(following, "batting_fwar") / following_pa * 600
            )

            current_age = number(current, "age")

            if current_age <= 24:
                age_group = "young"
            elif current_age <= 29:
                age_group = "prime"
            elif current_age <= 34:
                age_group = "older"
            else:
                age_group = "old"

            transitions[age_group].append(
                following_rate - current_rate
            )

    if age <= 24:
        age_group = "young"
    elif age <= 29:
        age_group = "prime"
    elif age <= 34:
        age_group = "older"
    else:
        age_group = "old"

    changes = transitions.get(age_group, [])
    age_change = (
        sum(changes) / len(changes) / 600
        if changes else 0.0
    )

    sample = sum(weight for _, weight in rates)
    talent_rate = weighted_average(rates)

    # Preserve the existing model's regression formula.
    talent_rate *= sample / (sample + 650 * 0.12)
    talent_rate += age_change

    historical_pa = weighted_average(workloads)

    factor = (
        0.97 if age <= 25 else
        0.88 if age <= 30 else
        0.83 if age <= 35 else
        0.65
    )

    original_pa = max(
        0,
        min(
            (0.75 * historical_pa + 0.25 * 650) * factor,
            650 * 1.15,
        ),
    )

    # Identify recent playing-time trend using prior seasons only.
    previous_pa = number(
        history.get(target - 2, {}),
        "plate_appearances",
    )
    recent_pa = number(
        history.get(target - 1, {}),
        "plate_appearances",
    )
    change = recent_pa - previous_pa

    if prior_pa >= 1000:
        trend = "Established"
    elif change >= 100:
        trend = "Increasing"
    elif change <= -100:
        trend = "Decreasing"
    else:
        trend = "Stable"

    
    # Use pooled historical observations from all players.
    samples = trend_pa_samples.get(trend, [])

    trend_pa = (
        sum(samples) / len(samples)
        if len(samples) >= 20
        else original_pa
    )

    # Keep original projections for increasing and established hitters.
    selective_pa = (
        original_pa
        if trend in ("Increasing", "Established")
        else trend_pa
    )


    target_row = seasons.get(target)
    actual_war = (
        number(target_row, "batting_fwar")
        if target_row else 0.0
    )

    return {
        "experience": experience,
        "trend": trend,
        "actual": actual_war,
        "original": talent_rate * original_pa,
        "selective": talent_rate * selective_pa,
    }



  
for target in TARGETS:
    trend_pa_samples = build_trend_pa_samples(target)

    print(f"\nHistorical PA samples available for {target}:")
    for category, values in sorted(trend_pa_samples.items()):
        avg = sum(values) / len(values) if values else 0
        print(
            f"{category}: n={len(values)}, "
            f"average next-season PA={avg:.1f}"
        )

    results = []

    for seasons in players.values():
        result = project_player(
            seasons, target, trend_pa_samples
        )
        if result is not None:
            results.append(result)


    
    print(f"\n{'=' * 12} {target} ROLLING BACKTEST {'=' * 12}")
    print("Players evaluated:", len(results))

    for model in ("original", "selective"):
        errors = [
            row[model] - row["actual"]
            for row in results
        ]

        mae = sum(abs(error) for error in errors) / len(errors)
        bias = sum(errors) / len(errors)

        print(f"\n{model.title()} model")
        print(f"WAR MAE: {mae:.3f}")
        print(f"WAR bias: {bias:+.3f}")

    for trend in (
        "Increasing", "Stable", "Decreasing", "Established"
    ):
        subset = [r for r in results if r["trend"] == trend]

        if not subset:
            continue

        print(f"\n{trend} ({len(subset)} hitters)")

        for model in ("original", "selective"):
            errors = [
                row[model] - row["actual"]
                for row in subset
            ]

            mae = sum(abs(error) for error in errors) / len(errors)
            print(f"{model.title()} MAE: {mae:.3f}")

