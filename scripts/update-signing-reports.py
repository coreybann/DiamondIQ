import importlib.util
import json
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

DATA_FILE = Path("public/data/free-agent-signing-reports-2027.json")
PLAYER_FILE = Path("public/data/free-agents-2027.json")
ID_FILE = Path("public/data/free-agent-mlb-ids-2027.json")

spec = importlib.util.spec_from_file_location(
    "news_reader", Path("scripts/check-option-news.py")
)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)

players = json.loads(PLAYER_FILE.read_text())["players"]
player_ids = json.loads(ID_FILE.read_text())["matched"]

with urllib.request.urlopen(
    "https://statsapi.mlb.com/api/v1/teams?sportId=1",
    timeout=20,
) as response:
    teams = json.load(response)["teams"]

queries = {
    "MLB Contract Agreements":
        'MLB ("agrees to terms" OR "agreed to terms" OR '
        '"agrees to deal" OR "agreed to deal") after:2026-10-25',
    "MLB Free Agent Signings":
        'MLB ("free agent signing" OR "signs with" OR '
        '"signed with") after:2026-10-25',
    "MLB Re-Signings":
        'MLB ("re-signs" OR "re-signed" OR '
        '"returns on one-year deal") after:2026-10-25',
    "MLB Pitcher Signings":
        'MLB pitcher ("signs" OR "agrees to" OR '
        '"re-signs") after:2026-10-25',
    "MLB Position Player Signings":
        'MLB hitter ("signs" OR "agrees to" OR '
        '"re-signs") after:2026-10-25',
}

feeds = {
    **reader.FEEDS,
    **{
        name: "https://news.google.com/rss/search?q="
        + urllib.parse.quote(query)
        + "&hl=en-US&gl=US&ceid=US:en"
        for name, query in queries.items()
    },
}

agreement_pattern = re.compile(
    r"\b(agrees? to|agreed to|signs?|signed|re-signs?|"
    r"re-signed|finalizes?|finalized)\b",
    re.I,
)

uncertain_pattern = re.compile(
    r"\b(rumor|could|might|may sign|interested in|"
    r"expected to|close to|negotiating|extension talks)\b",
    re.I,
)

def detect_team(headline):
    matches = set()

    for team in teams:
        names = {team["name"], team.get("teamName", "")}
        for name in names:
            if name and re.search(
                rf"(?<!\w){re.escape(name)}(?!\w)",
                headline,
                re.I,
            ):
                matches.add(team["name"])
                break

    return next(iter(matches)) if len(matches) == 1 else None

def publisher(headline):
    parts = re.split(r"\s[-–—]\s", headline)
    if len(parts) < 2:
        return None

    name = parts[-1].strip().lower()
    return name if name else None

reports = defaultdict(list)

for source, url in feeds.items():
    try:
        articles = reader.fetch_articles(url)
    except Exception as error:
        print(f"Feed error ({source}): {error}")
        continue

    for article in articles:
        headline = article["title"]
        if not agreement_pattern.search(headline):
            continue
        if uncertain_pattern.search(headline):
            continue

        # Contract extensions are not automatically free-agent signings.
        extension_pattern = re.compile(
            r"\b(contract extension|extends contract|"
            r"signs extension|agrees to extension|"
            r"agreed to extension|extended through)\b",
            re.I,
        )
        if extension_pattern.search(headline):
            continue

        team = detect_team(headline)
        if not team:
            continue

        for player in players:
            name = player["name"]
            if not re.search(
                rf"(?<!\w){re.escape(name)}(?!\w)",
                headline,
                re.I,
            ):
                continue

            try:
                date = parsedate_to_datetime(
                    article["published"]
                ).date().isoformat()
            except (ValueError, TypeError):
                continue

            if date < "2026-10-29":
                continue

            # Require an explicit agreement involving this player.
            escaped_name = re.escape(name)
            signing_verb = (
                r"(?:agrees? to|agreed to|signs?|signed|"
                r"re-signs?|re-signed|finalizes?|finalized)"
            )
            player_agreement = (
                re.search(
                    rf"(?<!\w){escaped_name}(?!\w).{{0,90}}\b{signing_verb}\b",
                    headline,
                    re.I,
                )
                or re.search(
                    rf"\b{signing_verb}\b.{{0,90}}(?<!\w){escaped_name}(?!\w)",
                    headline,
                    re.I,
                )
            )
            if not player_agreement:
                continue

            reports[name].append({
                "team": team,
                "date": date,
                "headline": headline,
                "publisher": publisher(headline),
                "url": article["url"],
            })

existing = json.loads(DATA_FILE.read_text())
saved = {
    report["playerId"]: report
    for report in existing["signings"]
}

for name, articles in reports.items():
    by_team = defaultdict(list)

    for article in articles:
        by_team[article["team"]].append(article)

    if len(by_team) != 1:
        print(f"SKIPPED conflicting teams: {name}")
        continue

    team, matches = next(iter(by_team.items()))

    unique_articles = {
        article["url"]: article
        for article in matches
    }

    unique_publishers = {
        article["publisher"]
        for article in unique_articles.values()
        if article["publisher"] is not None
    }

    if len(unique_publishers) < 2:
        print(f"SKIPPED insufficient sources: {name}")
        continue

    print(f"VALIDATION: {name} -> {team}")
    for article in unique_articles.values():
        print(
            f"  {article['date']} | "
            f"{article['publisher']} | "
            f"{article['headline']}"
        )

    player_id = player_ids.get(name)
    if not player_id:
        print(f"SKIPPED missing MLB ID: {name}")
        continue

    if player_id in saved:
        continue

    latest_report = max(
        unique_articles.values(),
        key=lambda article: article["date"],
    )

    saved[player_id] = {
        "playerId": player_id,
        "playerName": name,
        "team": team,
        "date": latest_report["date"],
        "status": "Signing Reported",
        "sources": list(unique_articles.values()),
    }

    print(f"NEW REPORT: {name} -> {team}")

existing["signings"] = sorted(
    saved.values(),
    key=lambda report: report["date"],
    reverse=True,
)
existing["lastUpdated"] = datetime.now(
    timezone.utc
).isoformat()

import sys

if "--write" in sys.argv:
    DATA_FILE.write_text(
        json.dumps(existing, indent=2, ensure_ascii=False) + "\n"
    )
    print("Signing reports saved.")
else:
    print("DRY RUN: No files were modified.")

print(f"Total detected reports: {len(existing['signings'])}")
