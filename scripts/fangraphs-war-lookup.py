import requests
import re
import unicodedata
from html import unescape

URL = "https://www.fangraphs.com/api/leaders/major-league/data"

def clean_name(value):
    value = unescape(re.sub(r"<[^>]+>", "", value))
    value = unicodedata.normalize("NFKD", value)
    return "".join(
        char for char in value
        if not unicodedata.combining(char)
    ).strip().lower()

def fetch_war(year, stats):
    params = {
        "pos": "all",
        "stats": stats,
        "lg": "all",
        "season": year,
        "season1": year,
        "ind": 0,
        "qual": 0,
        "type": 8,
        "month": 0,
        "pageitems": 2000,
    }

    response = requests.get(URL, params=params, timeout=30)
    response.raise_for_status()
    return response.json()["data"]

def main():
    start_year = int(input("First WAR season (example: 2022): "))

    names = input(
        "Enter player names separated by commas: "
    ).split(",")

    names = [name.strip() for name in names if name.strip()]

    for name in names:
        print(f"\\n{name}")

        results = {}

        for stat_type, label in [("bat", "Batting"), ("pit", "Pitching")]:
            seasons = {}

            for year in (start_year, start_year + 1):
                try:
                    players = fetch_war(year, stat_type)
                except Exception as error:
                    print(f"  {label} {year}: ERROR - {error}")
                    seasons = {}
                    break

                matches = [
                    player for player in players
                    if clean_name(player.get("Name", "")) == clean_name(name)
                ]

                seasons[year] = sum(
                    float(player.get("WAR") or 0)
                    for player in matches
                )

            if seasons:
                results[label] = seasons

        if not results:
            print("  No results available.")
            continue

        batting = results.get("Batting", {})
        pitching = results.get("Pitching", {})

        batting_total = sum(batting.values())
        pitching_total = sum(pitching.values())

        label = (
            "Batting"
            if batting_total >= pitching_total
            else "Pitching"
        )

        seasons = results[label]

        for year, war in seasons.items():
            print(f"  {label} {year}: {war:.2f}")

        print(f"  {label} combined: {sum(seasons.values()):.2f}")

if __name__ == "__main__":
    main()
