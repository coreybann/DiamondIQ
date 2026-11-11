import csv
from collections import defaultdict, Counter
from pathlib import Path

PITCHING = Path("data/projections/mlb-pitching-history.csv")
POSITIONS = Path("data/projections/mlb-historical-positions.csv")
OUTPUT = Path("data/projections/mlb-pitching-modeling.csv")

position_lookup = defaultdict(set)
player_history = defaultdict(set)

with POSITIONS.open(newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        key = (row["player_id"], row["season"])
        position_lookup[key].add(row["position_type"])
        player_history[row["player_id"]].add(row["position_type"])

rows = []
counts = Counter()

with PITCHING.open(newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)

    fields = reader.fieldnames + [
        "historical_position_types",
        "pitcher_classification",
        "pitcher_model_eligible",
    ]

    for row in reader:
        key = (row["player_id"], row["season"])
        types = position_lookup.get(key, set())
        history = player_history.get(row["player_id"], set())

        outs = int(row["outs"] or 0)

        if "Two-Way Player" in types:
            classification = "two_way_player"
            eligible = True

        elif "Pitcher" in types:
            classification = "pitcher"
            eligible = True

        elif types:
            classification = "position_player_pitching"
            eligible = False

        elif history and history <= {"Pitcher"}:
            classification = "inferred_pitcher"
            eligible = True

        elif history and "Pitcher" not in history:
            classification = "inferred_position_player"
            eligible = False

        else:
            classification = "unresolved"
            eligible = False

        # Zero-out appearances cannot train pitching-rate models.
        if eligible and outs == 0:
            classification += "_zero_outs"
            eligible = False

        row["historical_position_types"] = "|".join(sorted(types))
        row["pitcher_classification"] = classification
        row["pitcher_model_eligible"] = int(eligible)

        counts[classification] += 1
        rows.append(row)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with OUTPUT.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

print("PITCHER ELIGIBILITY SUMMARY")
print("-" * 50)

for classification, count in sorted(counts.items()):
    print(f"{classification}: {count}")

print("\nTotal records:", len(rows))
print(
    "Eligible pitching records:",
    sum(int(r["pitcher_model_eligible"]) for r in rows)
)
print(
    "Excluded or unresolved:",
    sum(not int(r["pitcher_model_eligible"]) for r in rows)
)
print("\nSaved:", OUTPUT)
