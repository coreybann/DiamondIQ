import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

STATUS_FILE = Path("public/data/free-agent-status-2027.json")

parser = argparse.ArgumentParser()
parser.add_argument("--write", action="store_true")
args = parser.parse_args()

data = json.loads(STATUS_FILE.read_text())

import importlib.util
import re

reader_path = Path("scripts/check-option-news.py")

spec = importlib.util.spec_from_file_location(
    "option_news_reader", reader_path
)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)

player_data = json.loads(
    Path("public/data/free-agents-2027.json").read_text()
)

option_players = [
    player["name"]
    for player in player_data["players"]
    if player.get("contractOption")
]

decisions = []

for source, url in reader.FEEDS.items():
    try:
        articles = reader.fetch_articles(url)
        print(f"{source}: fetched {len(articles)} articles")
    except Exception as error:
        print(f"{source}: ERROR - {error}")
        continue

    for article in articles:
        title = article["title"]

        matches = [
            name
            for name in option_players
            if re.search(
                rf"(?<!\w){re.escape(name)}(?!\w)",
                title,
                flags=re.IGNORECASE,
            )
        ]

        # Require exactly one matching player in the headline.
        if len(matches) != 1:
            continue

        # Ignore reports about decisions that haven't happened yet.
        if re.search(
            r"\b(to\s+(exercise|decline|reject|opt)|"
            r"may|might|could|expected|likely|plans to|intends to)\b",
            title,
            flags=re.IGNORECASE,
        ):
            continue

        if re.search(
            r"\b(declines?|declined|rejects?|rejected)\b.*\boption\b"
            r"|\b(opts? out|opted out|opting out)\b",
            title,
            flags=re.IGNORECASE,
        ):
            status = "Available"
        elif re.search(
            r"\b(exercises?|exercised)\b.*\boption\b"
            r"|\b(opts? in|opted in|opting in)\b",
            title,
            flags=re.IGNORECASE,
        ):
            status = "Under Contract"
        else:
            continue

        decisions.append({
            "name": matches[0],
            "status": status,
            "source": article["url"],
        })
# Reject conflicting decisions for the same player.
decisions_by_player = {}
conflicted_players = set()

for decision in decisions:
    name = decision["name"]
    status = decision["status"]

    if name in decisions_by_player:
        previous_status = decisions_by_player[name]["status"]

        if previous_status != status:
            conflicted_players.add(name)
    else:
        decisions_by_player[name] = decision

for name in sorted(conflicted_players):
    print(f"CONFLICT: {name} has contradictory reports. Skipping.")

decisions = [
    decision
    for name, decision in decisions_by_player.items()
    if name not in conflicted_players
]
now = datetime.now(timezone.utc).isoformat()

changes = 0

for decision in decisions:
    name = decision["name"]
    existing = data["players"].get(name)

    if existing:
        print(f"SKIPPED: {name} already has a verified status")
        continue

    print(f"NEW: {name} -> {decision['status']}")
    changes += 1

    if args.write:
        data["players"][name] = {
            "status": decision["status"],
            "verifiedAt": now,
            "source": decision["source"],
        }

if args.write and changes:
    data["lastVerified"] = now
    STATUS_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    )
    print(f"Saved {changes} verified decision(s).")
else:
    print(f"Dry run complete: {changes} proposed change(s).")