import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

FEEDS = {
    "MLB News": "https://www.mlb.com/feeds/news/rss.xml",
    "MLB Trade Rumors": "https://www.mlbtraderumors.com/feed",
}

CONTENT_TAG = "{http://purl.org/rss/1.0/modules/content/}encoded"

data = json.loads(
    Path("public/data/free-agents-2027.json").read_text()
)

players = [
    player["name"]
    for player in data["players"]
    if player.get("contractOption")
]


def clean_text(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def fetch_articles(url):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        root = ET.fromstring(response.read())

    articles = []

    for item in root.findall(".//item"):
        title = clean_text(item.findtext("title", ""))
        summary = clean_text(item.findtext("description", ""))
        content = clean_text(item.findtext(CONTENT_TAG, ""))

        articles.append({
            "title": title,
            "summary": summary,
            "content": content,
            "url": item.findtext("link", ""),
            "published": item.findtext("pubDate", ""),
        })

    return articles

if __name__ == "__main__":
    for source, url in FEEDS.items():
        print(f"\nSOURCE: {source}")

        try:
            articles = fetch_articles(url)
        except Exception as error:
            print("ERROR:", error)
            continue

        print("Articles fetched:", len(articles))

        for article in articles:
            searchable_text = (
                article["title"] + " " + article["summary"]
            ).lower()

            matches = [
                name
                for name in players
                if re.search(
                    rf"(?<!\w){re.escape(name.lower())}(?!\w)",
                    searchable_text,
                )
            ]

            if matches:
                print("\nTITLE:", article["title"])
                print("MATCHED PLAYERS:", ", ".join(matches))
                print("URL:", article["url"])

                for player_name in matches:
                    title = article["title"].lower()

                    declined = bool(
                        re.search(
                            r"\b(declines?|declined|rejects?|rejected)\b.*\boption\b",
                            title,
                        )
                        or re.search(
                            r"\b(opts? out|opted out|opting out)\b",
                            title,
                        )
                    )

                    exercised = bool(
                        re.search(
                            r"\b(exercises?|exercised)\b.*\boption\b",
                            title,
                        )
                        or re.search(
                            r"\b(opts? in|opted in|opting in)\b",
                            title,
                        )
                    )

                    future_decision = bool(
                        re.search(
                            r"\bto\s+(exercise|decline|reject|opt)\b",
                            title,
                        )
                    )

                    if future_decision:
                        decision = "Needs confirmation"
                    elif declined:
                        decision = "Available"
                    elif exercised:
                        decision = "Under Contract"
                    else:
                        decision = "No confirmed decision"

                    print(f"DETECTED STATUS ({player_name}): {decision}")