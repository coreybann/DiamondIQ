import csv
import re
import time
from html import unescape
from pathlib import Path

import requests

URL = "https://www.fangraphs.com/api/leaders/major-league/data"
OUTPUT = Path("public/data/player-fwar-2022-2023.csv")

FIELDS = [
    "fangraphs_id", "player_name", "season", "age",
    "batting_fwar", "pitching_fwar", "total_fwar",
    "plate_appearances", "innings_pitched", "games_started"
]


def clean_name(value):
    return unescape(re.sub(r"<[^>]*>", "", str(value))).strip()


def number(value):
    try:
        return float(value or 0)
    except (ValueError, TypeError):
        return 0.0


def fetch(year, kind):
    params = {
        "pos": "all",
        "stats": kind,
        "lg": "all",
        "season": year,
        "season1": year,
        "ind": 0,
        "qual": 0,
        "type": 8,
        "month": 0,
        "pageitems": 2000,
    }

    response = requests.get(URL, params=params, timeout=45)
    response.raise_for_status()
    return response.json()["data"]


def main():
    players = {}

    for year in (2022, 2023):
        for kind in ("bat", "pit"):
            print(f"Downloading {year} {kind}...", flush=True)

            try:
                records = fetch(year, kind)
            except requests.RequestException as error:
                print(f"Download failed: {error}")
                print("No output file changed.")
                return

            for record in records:
                player_id = str(record.get("playerid") or "")
                if not player_id:
                    continue

                key = (player_id, year)

                if key not in players:
                    players[key] = {
                        "fangraphs_id": player_id,
                        "player_name": clean_name(
                            record.get("PlayerName")
                            or record.get("Name", "")
                        ),
                        "season": year,
                        "age": number(record.get("Age")),
                        "batting_fwar": 0.0,
                        "pitching_fwar": 0.0,
                        "total_fwar": 0.0,
                        "plate_appearances": 0.0,
                        "innings_pitched": 0.0,
                        "games_started": 0.0,
                    }

                player = players[key]

                if kind == "bat":
                    player["batting_fwar"] += number(record.get("WAR"))
                    player["plate_appearances"] += number(record.get("PA"))
                else:
                    player["pitching_fwar"] += number(record.get("WAR"))
                    player["innings_pitched"] += number(record.get("IP"))
                    player["games_started"] += number(record.get("GS"))

            print(f"Received {len(records)} records.")
            time.sleep(3)

    for player in players.values():
        player["total_fwar"] = round(
            player["batting_fwar"] + player["pitching_fwar"], 3
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(
            sorted(players.values(), key=lambda p: (
                p["player_name"], p["season"]
            ))
        )

    print(f"\nSaved {len(players)} player-season records.")
    print(f"File: {OUTPUT}")


if __name__ == "__main__":
    main()
