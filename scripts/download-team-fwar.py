import csv
import json
import time
from pathlib import Path

import requests

SEASON = 2026
DATA_DIR = Path("public/data")
OUTPUT = DATA_DIR / "mlb-team-fwar-2026.csv"
MAPPING = DATA_DIR / "mlb-fangraphs-team-map.json"
URL = "https://www.fangraphs.com/api/leaders/major-league/data"

mapping = json.loads(MAPPING.read_text())
fields = ["mlb_team_id", "mlb_player_id", "season", "stat_type", "fwar"]

existing = []

if OUTPUT.exists():
    with OUTPUT.open(newline="") as file:
        existing = list(csv.DictReader(file))

completed = {
    (str(row["mlb_team_id"]), row["stat_type"])
    for row in existing
}

session = requests.Session()
completed_this_run = 0
MAX_GROUPS = 10

for mlb_team_id, fg_team_id in mapping.items():
    for stat_type in ("bat", "pit"):
        key = (str(mlb_team_id), stat_type)

        if key in completed:
            print("Skipping completed:", key, flush=True)
            continue

        params = {
            "pos": "all",
            "stats": stat_type,
            "lg": "all",
            "season": SEASON,
            "season1": SEASON,
            "team": fg_team_id,
            "qual": 0,
            "type": 8,
            "month": 0,
            "pageitems": 2000,
        }

        try:
            response = session.get(URL, params=params, timeout=30)

            if response.status_code == 429:
                print("FanGraphs rate limit reached. Stopping safely.")
                raise SystemExit(0)

            response.raise_for_status()
            players = response.json()["data"]

            if not players:
                print("Empty response. Stopping without marking complete.")
                raise SystemExit(1)

            new_rows = []

            for player in players:
                player_id = player.get("xMLBAMID")
                war = player.get("WAR")

                if not player_id or war is None:
                    continue

                new_rows.append({
                    "mlb_team_id": mlb_team_id,
                    "mlb_player_id": player_id,
                    "season": SEASON,
                    "stat_type": stat_type,
                    "fwar": round(float(war), 3),
                })

            if not new_rows:
                print("No usable records. Stopping.")
                raise SystemExit(1)

            existing.extend(new_rows)

            temporary = OUTPUT.with_suffix(".tmp")

            with temporary.open("w", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=fields)
                writer.writeheader()
                writer.writerows(existing)

            temporary.replace(OUTPUT)
            completed.add(key)
            completed_this_run += 1

            if completed_this_run >= MAX_GROUPS:
                print("Batch complete: 10 groups saved.")
                raise SystemExit(0)

            print(
                f"Saved team {mlb_team_id} {stat_type}: "
                f"{len(new_rows)} players",
                flush=True
            )

            time.sleep(3)

        except requests.RequestException as error:
            print("Download stopped:", error)
            raise SystemExit(1)

print("All 30 teams completed!")
print("Total records:", len(existing))
