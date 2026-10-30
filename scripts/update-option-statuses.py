import argparse
import importlib.util
import json
import re
import urllib.parse
from collections import defaultdict
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

STATUS_FILE = Path("public/data/free-agent-status-2027.json")
PLAYER_FILE = Path("public/data/free-agents-2027.json")

parser = argparse.ArgumentParser()
parser.add_argument("--write", action="store_true")
args = parser.parse_args()

data = json.loads(STATUS_FILE.read_text())
player_data = json.loads(PLAYER_FILE.read_text())
option_players = [
    player["name"]
    for player in player_data["players"]
    if player.get("contractOption")
]

spec = importlib.util.spec_from_file_location(
    "option_news_reader", Path("scripts/check-option-news.py")
)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)

google_news_queries = [
    (
        "Google News",
        'MLB ("player option" OR "mutual option" OR '
        '"declines option" OR "opts out" OR "elects free agency")',
    )
]
for name in option_players:
    google_news_queries.extend([
        (
            f"Google News - {name}",
            f'"{name}" ("option" OR "opt out" OR "opt in") after:2026-10-20',
        ),
        (
            f"MLB Official - {name}",
            f'site:mlb.com "{name}" option 2027',
        ),
    ])

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

# Match the complete name, or an unambiguous surname. Never match a
# surname if another option player shares it.
def player_surname(name):
    parts = name.split()
    if parts[-1].rstrip(".").casefold() in {"jr", "sr", "ii", "iii", "iv"}:
        return parts[-2]
    return parts[-1]


surname_counts = defaultdict(int)
for name in option_players:
    surname_counts[player_surname(name).casefold()] += 1


def mentions_player(text, name):
    if re.search(rf"(?<!\w){re.escape(name)}(?!\w)", text, re.I):
        return True
    first, surname = name.split()[0], player_surname(name)
    if surname_counts[surname.casefold()] != 1:
        return False
    if not re.search(rf"(?<!\w){re.escape(surname)}(?!\w)", text, re.I):
        return False
    # Reject "Someone Else Surname" headlines.
    for match in re.finditer(
        rf"\b([A-Z][\w'-]+)\s+{re.escape(surname)}\b", text
    ):
        if match.group(1).casefold() != first.casefold():
            return False
    return True


def classify_clause(clause, name):
    """Return a status only for an explicit decision tied to one player."""
    if not mentions_player(clause, name):
        return None

    # Avoid attributing a decision to the wrong player in a shared clause.
    named = [p for p in option_players if mentions_player(clause, p)]
    if len(named) != 1:
        return None

    if re.search(
        r"\b(should|would|may|might|could|expected|likely|"
        r"plans to|intends to|leaning toward)\b"
        r"|\bto\s+(exercise|decline|reject|opt)\b",
        clause, re.I,
    ):
        return None

    # Declining an opt-out means the player stays under contract.
    if re.search(
        r"\b(?:will\s+not|won['’]t|does\s+not|doesn['’]t|"
        r"did\s+not|didn['’]t|declines?|declined)\s+"
        r"(?:(?:exercise|exercised)\s+(?:(?:his|their|the)\s+)?"
        r"(?:opt[- ]out|option)|opt[- ]out)\b",
        clause, re.I,
    ):
        return "Under Contract"

    available = bool(re.search(
        r"\b(?:declines?|declined|rejects?|rejected|passes on|"
        r"passed on|turns down|turned down)\b.{0,90}\boptions?\b"
        r"|\b(?:opts? out|opted out|opting out)\b"
        r"|\b(?:elects?|elected)\s+free agency\b"
        r"|\b(?:becomes?|became)\s+(?:a\s+)?free agent\b",
        clause, re.I,
    ))
    under_contract = bool(re.search(
        r"\b(?:exercises?|exercised|picks? up|picked up|"
        r"activates?|activated)\b.{0,90}\boptions?\b"
        r"|\b(?:opts? in|opted in|opting in)\b",
        clause, re.I,
    ))
    if available == under_contract:
        return None
    return "Available" if available else "Under Contract"


def classify_headline(title, players):
    headline = title.rsplit(" - ", 1)[0]
    # Ignore reports explicitly discussing a prior option year.
    if re.search(r"(?:'2[0-6]\b|\b202[0-6]\b)", headline, re.I):
        return []

    # Split independent decisions, including comma-separated MLB headlines.
    clauses = re.split(r"\s*[;:,]\s*", headline)
    results = []
    for clause in clauses:
        matches = [name for name in players if mentions_player(clause, name)]
        for name in matches:
            status = classify_clause(clause, name)
            if status:
                results.append((name, status))
    return results


decisions = []
successful_feeds = 0
failed_feeds = 0

for source, url in all_feeds.items():
    try:
        articles = reader.fetch_articles(url)
        successful_feeds += 1
        print(f"{source}: fetched {len(articles)} articles")
    except Exception as error:
        failed_feeds += 1
        print(f"{source}: ERROR - {error}")
        continue

    for article in articles:
        published = article.get("published", "")
        try:
            published_date = parsedate_to_datetime(published)
            if published_date is None:
                continue
            if published_date.astimezone(timezone.utc) < datetime(
                2026, 10, 20, tzinfo=timezone.utc
            ):
                continue
        except (TypeError, ValueError, OverflowError):
            continue

        title = article["title"]
        publisher = title.rsplit(" - ", 1)[-1].strip() if " - " in title else ""
        for name, status in classify_headline(title, option_players):
            decisions.append({
                "name": name,
                "status": status,
                "source": article["url"],
                "publisher": publisher,
            })
            print(f"HEADLINE: {title}")
            print(f"PLAYER: {name} -> {status}")
            print(f"SOURCE: {article['url']}")
            print()

print(f"News feeds: {successful_feeds} succeeded, {failed_feeds} failed.")
if successful_feeds == 0:
    raise SystemExit("ERROR: All news feeds failed. No statuses saved.")

reports_by_player = defaultdict(list)
for decision in decisions:
    reports_by_player[decision["name"]].append(decision)

verified_decisions = []
for name, reports in reports_by_player.items():
    statuses = {report["status"] for report in reports}
    if len(statuses) != 1:
        print(f"CONFLICT: {name} has contradictory reports. Skipping.")
        continue

    publishers = {}
    for report in reports:
        publisher = report["publisher"].casefold()
        if publisher:
            publishers.setdefault(publisher, report)

    official_report = publishers.get("mlb.com")
    if official_report:
        print(f"OFFICIAL: {name} confirmed by MLB.com.")
        verified_decisions.append(official_report)
    elif len(publishers) >= 2:
        print(f"CONFIRMED: {name} has {len(publishers)} publishers.")
        verified_decisions.append(next(iter(publishers.values())))
    else:
        print(f"UNCONFIRMED: {name} needs another source.")

now = datetime.now(timezone.utc).isoformat()
changes = 0
for decision in verified_decisions:
    name = decision["name"]
    if data["players"].get(name):
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
