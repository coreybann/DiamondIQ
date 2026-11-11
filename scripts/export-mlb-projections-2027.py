import csv
import json
import math
import shutil
from pathlib import Path

SOURCE = Path("data/projections/mlb-player-pool-2027-experimental.csv")
TARGET = Path("public/data/mlb-player-projections-2027-experimental.json")
BACKUP = TARGET.with_suffix(".json.before-counting-stats.bak")


def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def projected_total(rate, pa):
    if rate is None or pa is None:
        return None
    return round(max(0, rate * pa))


with SOURCE.open(newline="", encoding="utf-8-sig") as f:
    source_rows = list(csv.DictReader(f))

existing = json.loads(TARGET.read_text())
existing_players = existing["players"]

existing_by_id = {
    str(player["player_id"]): player
    for player in existing_players
}

source_by_id = {
    str(row["player_id"]): row
    for row in source_rows
}

if len(existing_by_id) != 2878 or len(source_by_id) != 2878:
    raise SystemExit("STOP: Unexpected player count or duplicate IDs.")

if set(existing_by_id) != set(source_by_id):
    raise SystemExit("STOP: Source and JSON player IDs do not match.")

updated = []

for original in existing_players:
    player = original.copy()
    row = source_by_id[str(player["player_id"])]

    if player["projection_type"] == "established_mlb_hitter":
        pa = number(row.get("conditional_PA_2027"))
        avg = number(row.get("AVG"))

        bb_rate = number(row.get("projected_baseOnBalls_rate"))
        so_rate = number(row.get("projected_strikeOuts_rate"))
        hr_rate = number(row.get("projected_homeRuns_rate"))
        doubles_rate = number(row.get("projected_doubles_rate"))
        triples_rate = number(row.get("projected_triples_rate"))
        hbp_rate = number(row.get("projected_hitByPitch_rate"))

        if any(v is None for v in [
            pa, avg, bb_rate, so_rate, hr_rate,
            doubles_rate, triples_rate, hbp_rate
        ]):
            raise SystemExit(
                f"STOP: Missing projection inputs for {player['player_id']}"
            )

        # Reconstruct AB rate using the model's AVG and OBP.
        # OBP = (AVG * AB + BB + HBP) / (AB + BB + HBP + SF)
        # Sacrifice flies are approximated at the league level.
        sf_rate = 0.007

        obp = number(row.get("OBP"))
        if obp is None or abs(avg - obp) < 1e-9:
            raise SystemExit(
                f"STOP: Invalid AVG/OBP for {player['player_id']}"
            )

        ab_rate = (
            obp * (bb_rate + hbp_rate + sf_rate)
            - bb_rate
            - hbp_rate
        ) / (avg - obp)

        if not 0 < ab_rate <= 1:
            raise SystemExit(
                f"STOP: Invalid AB rate for {player['player_id']}: {ab_rate}"
            )

        ab = projected_total(ab_rate, pa)
        hits = projected_total(avg, ab)

        doubles = projected_total(doubles_rate, pa)
        triples = projected_total(triples_rate, pa)
        homers = projected_total(hr_rate, pa)

        singles = max(0, hits - doubles - triples - homers)

        player.update({
            "conditional_PA_2027": round(pa),
            "projected_AB": ab,
            "projected_H": hits,
            "projected_1B": singles,
            "projected_2B": doubles,
            "projected_3B": triples,
            "projected_HR": homers,
            "projected_BB": projected_total(bb_rate, pa),
            "projected_SO": projected_total(so_rate, pa),
        })

    updated.append(player)

if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)

existing["players"] = updated
existing["counting_stats_basis"] = (
    "Conditional 2027 MLB plate appearances; "
    "experimental estimates, not probability-adjusted totals."
)

TARGET.write_text(
    json.dumps(existing, ensure_ascii=False, indent=2) + "\n"
)

hitters = [
    p for p in updated
    if p["projection_type"] == "established_mlb_hitter"
]

assert len(updated) == 2878
assert len(hitters) == 659
assert all(p.get("player_name") for p in updated)

print("PASS: All 2,878 players preserved.")
print("PASS: Counting stats added for 659 MLB hitters.")
print("PASS: Player names preserved.")
print("Backup:", BACKUP)

print("\nSample projections:")
for player in sorted(
    hitters,
    key=lambda p: p["projected_HR"],
    reverse=True
)[:10]:
    print(
        player["player_name"],
        "PA:", player["conditional_PA_2027"],
        "HR:", player["projected_HR"],
        "H:", player["projected_H"]
    )
