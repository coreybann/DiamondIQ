import urllib.parse
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

google_news_queries = [
    (
        "Google News",
        'MLB ("player option" OR "mutual option" OR '
        '"declines option" OR "opts out" OR "elects free agency")',
    ),
    (
        "Google News - Clay Holmes",
        '"Clay Holmes" declines player option 2027',
    ),
    (
        "Google News - Matthew Boyd",
        '"Matthew Boyd" passes on mutual option 2027',
    ),
]

all_feeds = {
    **reader.FEEDS,
    **{
        source: (
            "https://news.google.com/rss/search?q="
            + urllib.parse.quote(query)
            + "&hl=en-US&gl=US&ceid=US:en"
        )
        for source, query in google_news_queries
    },
}

for source, url in all_feeds.items():
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

        # Allow a surname-only headline when the match is unambiguous.
        if not matches:
            for name in option_players:
                first_name, last_name = name.rsplit(" ", 1)

                if not re.search(
                    rf"(?<!\w){re.escape(last_name)}(?!\w)",
                    title,
                    flags=re.IGNORECASE,
                ):
                    continue

                # Reject a surname match if the headline names
                # someone else with that surname.
                other_person = re.search(
                    rf"\b([A-Z][a-z'-]+)\s+{re.escape(last_name)}\b",
                    title,
                )

                if other_person and (
                    other_person.group(1).lower() != first_name.lower()
                ):
                    continue

                matches.append(name)

        if len(matches) != 1:
            continue

        # Ignore headlines explicitly about seasons before 2027.
        if re.search(
            r"(?:'2[0-6]\b|\b202[0-6]\b)",
            title,
            flags=re.IGNORECASE,
        ):
            continue
        # Ignore future, speculative, or unconfirmed reports.
        if re.search(
            r"\b(to\s+(exercise|decline|reject|opt)|"
            r"may|might|could|expected|likely|plans to|intends to)\b",
            title,
            flags=re.IGNORECASE,
        ):
            continue

        # Only classify explicit decisions involving the matched player.
        declined = re.search(
            r"\b(declines?|declined|rejects?|rejected)\b.*\b(option|options)\b"
            r"|\b(passes on|passed on|turns down|turned down)\b.*\b(option|options)\b"
            r"|\b(opts? out|opted out|opting out)\b"
            r"|\b(elects?|elected)\s+free agency\b",
            title,
            flags=re.IGNORECASE,
        )

        exercised = re.search(
            r"\b(exercises?|exercised)\b.*\b(option|options)\b"
            r"|\b(opts? in|opted in|opting in)\b",
            title,
            flags=re.IGNORECASE,
        )

        # If both decision types appear in a headline, skip it.
        if bool(declined) == bool(exercised):
            continue

        status = "Available" if declined else "Under Contract"

        decisions.append({
            "name": matches[0],
            "status": status,
            "source": article["url"],
        })

        print(f"HEADLINE: {title}")
        print(f"PLAYER: {matches[0]} -> {status}")
        print(f"SOURCE: {article['url']}")
        print()

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