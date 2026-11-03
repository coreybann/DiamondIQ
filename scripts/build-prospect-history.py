#!/usr/bin/env python3
"""Build a cached minor-league history dataset for DiamondIQ."""

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SEASON = 2026
BATCH_SIZE = 25
MAX_RETRIES = 3
OUTPUT = Path(f"public/data/prospect-history-{SEASON}.json")
RANKINGS_URL = f"http://localhost:3000/api/prospect-rankings?season={SEASON}"
MLB_URL = "https://statsapi.mlb.com/api/v1/people"


def fetch_json(url):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "DiamondIQ/1.0"},
    )

    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(2 ** attempt)


def main():
    rankings = fetch_json(RANKINGS_URL)
    players = rankings["overall"]

    if not players:
        raise RuntimeError("Rankings API returned no prospects.")

    ids = [int(player["id"]) for player in players]

    if len(ids) != len(set(ids)):
        raise RuntimeError("Duplicate player IDs found in rankings.")

    history = []

    for start in range(0, len(players), BATCH_SIZE):
        batch = players[start:start + BATCH_SIZE]
        batch_ids = [int(player["id"]) for player in batch]

        params = urllib.parse.urlencode({
            "personIds": ",".join(map(str, batch_ids)),
            "hydrate": (
                "stats(group=[hitting,pitching],"
                "type=[yearByYear],leagueListId=milb_all)"
            ),
        })

        data = fetch_json(f"{MLB_URL}?{params}")
        returned = {
            person["id"]: person
            for person in data.get("people", [])
        }

        if set(returned) != set(batch_ids):
            raise RuntimeError(
                f"Incomplete MLB API batch starting at player {start + 1}."
            )

        for player in batch:
            person = returned[int(player["id"])]
            group_name = player["group"]
            records = []

            for group in person.get("stats", []):
                if (
                    group.get("group", {}).get("displayName", "").lower()
                    != group_name
                ):
                    continue

                for record in group.get("splits", []):
                    level_id = record.get("sport", {}).get("id")

                    if level_id == 21 or level_id is None:
                        continue

                    records.append({
                        "season": record.get("season"),
                        "levelId": level_id,
                        "team": record.get("team", {}).get("name"),
                        "stats": record.get("stat", {}),
                    })

            history.append({
                "id": player["id"],
                "name": player["name"],
                "group": group_name,
                "records": records,
            })

        print(
            f"Processed {len(history)} / {len(players)} prospects",
            flush=True,
        )

        if start + BATCH_SIZE < len(players):
            time.sleep(0.25)

    if len(history) != len(players):
        raise RuntimeError("Final prospect count does not match rankings.")

    result = {
        "season": SEASON,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(history),
        "players": history,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(result, indent=2) + "\n")
    temporary.replace(OUTPUT)

    print("Saved:", OUTPUT)
    print("Players:", len(history))
    print(
        "Historical records:",
        sum(len(player["records"]) for player in history),
    )


if __name__ == "__main__":
    main()
