import csv
import json
import time
import urllib.request
from pathlib import Path

START_YEAR = 2015
END_YEAR = 2026

OUTPUT = Path("data/projections/mlb-pitching-history.csv")

FIELDS = [
    "player_id", "player_name", "season", "age",
    "gamesPitched", "gamesStarted", "gamesFinished",
    "wins", "losses", "saves", "holds",
    "inningsPitched", "outs", "battersFaced",
    "hits", "runs", "earnedRuns", "homeRuns",
    "baseOnBalls", "intentionalWalks", "strikeOuts",
    "hitBatsmen", "wildPitches",
    "numberOfPitches", "strikes",
    "groundOuts", "airOuts",
    "era", "whip", "strikeoutsPer9Inn",
    "walksPer9Inn", "homeRunsPer9",
    "hitsPer9Inn", "strikePercentage",
]

def fetch_json(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                return json.load(response)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))

def main():
    all_rows = []

    for year in range(START_YEAR, END_YEAR + 1):
        url = (
            "https://statsapi.mlb.com/api/v1/stats"
            "?stats=season"
            "&group=pitching"
            "&leagueListId=mlb_hist"
            "&playerPool=ALL"
            f"&season={year}"
            "&limit=10000"
        )

        data = fetch_json(url)
        splits = data["stats"][0]["splits"]

        players = {}

        for split in splits:
            player = split.get("player", {})
            player_id = player.get("id")

            if not player_id:
                continue

            stat = split.get("stat", {})
            outs = int(stat.get("outs", 0) or 0)

            previous = players.get(player_id)

            if previous is None or outs > previous[0]:
                players[player_id] = (outs, split)

        for player_id, (_, split) in players.items():
            player = split.get("player", {})
            stat = split.get("stat", {})

            row = {
                "player_id": player_id,
                "player_name": player.get("fullName", ""),
                "season": year,
                "age": stat.get("age", ""),
            }

            for field in FIELDS:
                if field not in row:
                    row[field] = stat.get(field, "")

            all_rows.append(row)

        print(
            f"{year}: {len(splits)} raw records -> "
            f"{len(players)} unique pitchers",
            flush=True
        )

        time.sleep(0.2)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(all_rows)

    print("\nHISTORICAL PITCHING COLLECTION COMPLETE")
    print("-" * 50)
    print("Total player-season records:", len(all_rows))
    print("Saved:", OUTPUT)

if __name__ == "__main__":
    main()
