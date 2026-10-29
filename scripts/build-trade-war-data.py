import csv
import importlib.util
import math
from pathlib import Path

script = Path("scripts/fangraphs-war-lookup.py")
spec = importlib.util.spec_from_file_location("fg", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

output = Path("public/data/player-fwar-2024-2026.csv")

def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) else 0.0
    except (ValueError, TypeError):
        return 0.0

def innings(value):
    """Convert baseball innings notation to decimal innings."""
    if value is None or str(value).strip() == "":
        return 0.0

    parts = str(value).split(".")
    whole = int(parts[0])
    outs = int(parts[1]) if len(parts) > 1 else 0

    if outs not in (0, 1, 2):
        raise ValueError(f"Invalid innings value: {value}")

    return whole + outs / 3

records = {}

for year in (2024, 2025, 2026):
    for kind in ("bat", "pit"):
        print(f"Fetching {year} {kind}...", flush=True)
        players = module.fetch_war(year, kind)

        print(f"  Received {len(players)} records")

        for player in players:
            player_id = str(player.get("playerid") or "").strip()
            name = str(
                player.get("PlayerName")
                or player.get("Name")
                or ""
            ).strip()

            if not player_id or not name:
                continue

            key = (player_id, year)

            if key not in records:
                records[key] = {
                    "fangraphs_id": player_id,
                    "player_name": name,
                    "season": year,
                    "age": number(player.get("Age")),
                    "batting_fwar": 0.0,
                    "pitching_fwar": 0.0,
                    "plate_appearances": 0,
                    "innings_pitched": 0.0,
                    "games_started": 0,
                }

            record = records[key]

            if kind == "bat":
                record["batting_fwar"] += number(player.get("WAR"))
                record["plate_appearances"] += int(
                    number(player.get("PA"))
                )
            else:
                record["pitching_fwar"] += number(player.get("WAR"))
                record["innings_pitched"] += innings(player.get("IP"))
                record["games_started"] += int(
                    number(player.get("GS"))
                )

            if not record["age"]:
                record["age"] = number(player.get("Age"))

if not records:
    raise RuntimeError("No records downloaded. File not written.")

rows = []

for record in records.values():
    record["batting_fwar"] = round(record["batting_fwar"], 3)
    record["pitching_fwar"] = round(record["pitching_fwar"], 3)
    record["innings_pitched"] = round(record["innings_pitched"], 3)
    record["total_fwar"] = round(
        record["batting_fwar"] + record["pitching_fwar"], 3
    )
    rows.append(record)

rows.sort(key=lambda r: (r["season"], r["player_name"]))

fields = [
    "fangraphs_id",
    "player_name",
    "season",
    "age",
    "batting_fwar",
    "pitching_fwar",
    "total_fwar",
    "plate_appearances",
    "innings_pitched",
    "games_started",
]

with output.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

print(f"\nSaved {len(rows)} player-season records.")
print(f"Output: {output}")
