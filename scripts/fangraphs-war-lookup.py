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
    names = input(
        "Enter player names separated by commas: "
    ).split(",")

    names = [name.strip() for name in names if name.strip()]

    for name in names:
        print(f"\n{name}")

        for stat_type, label in [("pit", "Pitching"), ("bat", "Batting")]:
            seasons = {}

            for year in (2023, 2024):
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

                if matches:
                    seasons[year] = sum(
                        float(player.get("WAR") or 0)
                        for player in matches
                    )

            if seasons:
                for year, war in seasons.items():
                    print(f"  {label} {year}: {war:.2f}")

                if len(seasons) == 2:
                    print(
                        f"  {label} combined: "
                        f"{sum(seasons.values()):.2f}"
                    )
                break
        else:
            print("  Player not found in batting or pitching results.")

if __name__ == "__main__":
    main()
