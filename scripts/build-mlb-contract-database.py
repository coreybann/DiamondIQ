import json
import re
import time
import sys
from datetime import date
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

BASE = Path("public/data")
OUTPUT = BASE / "mlb-contracts-2026.json"

# Baseball-Reference uses historical codes for these team pages.
URL_CODES = {
    "LAA": "ANA",
    "MIA": "FLA",
    "TBR": "TBD",
}

TEAMS = {
    "ARI": "arizona-diamondbacks",
    "ATL": "atlanta-braves",
    "BAL": "baltimore-orioles",
    "BOS": "boston-red-sox",
    "CHC": "chicago-cubs",
    "CHW": "chicago-white-sox",
    "CIN": "cincinnati-reds",
    "CLE": "cleveland-guardians",
    "COL": "colorado-rockies",
    "DET": "detroit-tigers",
    "HOU": "houston-astros",
    "KCR": "kansas-city-royals",
    "LAA": "los-angeles-angels",
    "LAD": "los-angeles-dodgers",
    "MIA": "miami-marlins",
    "MIL": "milwaukee-brewers",
    "MIN": "minnesota-twins",
    "NYM": "new-york-mets",
    "NYY": "new-york-yankees",
    "OAK": "oakland-athletics",
    "PHI": "philadelphia-phillies",
    "PIT": "pittsburgh-pirates",
    "SDP": "san-diego-padres",
    "SFG": "san-francisco-giants",
    "SEA": "seattle-mariners",
    "STL": "st-louis-cardinals",
    "TBR": "tampa-bay-rays",
    "TEX": "texas-rangers",
    "TOR": "toronto-blue-jays",
    "WSN": "washington-nationals",
}


def clean(value):
    if pd.isna(value):
        return ""
    return str(value).strip()


def parse_salary(raw):
    """Return salary in millions and retain the original source text."""
    text = clean(raw)

    if not text or text.lower() in {"nan", "none", "-"}:
        return {
            "raw": text,
            "salary_millions": None,
            "status": "unavailable",
        }

    if re.match(r"^FA\b", text, re.I):
        return {
            "raw": text,
            "salary_millions": None,
            "status": "free_agent",
        }

    match = re.search(r"\$([\d,.]+)\s*([MK]?)", text, re.I)

    if not match:
        return {
            "raw": text,
            "salary_millions": None,
            "status": "unparsed",
        }

    amount = float(match.group(1).replace(",", ""))
    unit = match.group(2).upper()

    if unit == "K":
        amount /= 1000
    elif unit != "M":
        amount /= 1_000_000

    status = (
        "salary_with_fa_marker"
        if re.search(r"\bFA\b", text, re.I)
        else "salary_listed"
    )

    return {
        "raw": text,
        "salary_millions": round(amount, 6),
        "status": status,
    }


def main():
    BASE.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; DiamondIQ/1.0)"
    })

    # Preserve existing records during partial imports.
    previous = {}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text())
        except (json.JSONDecodeError, OSError):
            previous = {}

    records = list(previous.get("records", []))
    successful = list(previous.get("successful_teams", []))
    failed = [
        item for item in previous.get("failed_teams", [])
        if item.get("team") not in (sys.argv[1:] or list(TEAMS))
    ]

    requested_teams = sys.argv[1:] or list(TEAMS)

    for team in requested_teams:
        if team not in TEAMS:
            print(f"Skipping unknown team code: {team}")
            continue

        slug = TEAMS[team]
        url = (
            f"https://www.baseball-reference.com/teams/"
            f"{URL_CODES.get(team, team)}/{slug}-salaries-and-contracts.shtml"
        )

        print(f"Fetching {team}...", flush=True)

        try:
            response = session.get(url, timeout=25)

            if not response.ok:
                raise RuntimeError(f"HTTP {response.status_code}")

            tables = pd.read_html(StringIO(response.text))
            table = next(
                (t for t in tables if "Name" in t.columns),
                None,
            )

            if table is None:
                raise RuntimeError("Player salary table not found")

            year_columns = [
                column for column in table.columns
                if str(column).isdigit()
                and 2026 <= int(column) <= 2040
            ]

            if not year_columns:
                raise RuntimeError("No annual salary columns found")

            team_records = []

            for _, row in table.iterrows():
                name = clean(row.get("Name"))

                if not name:
                    continue

                salaries = {
                    str(year): parse_salary(row[year])
                    for year in year_columns
                }

                team_records.append({
                    "player": name,
                    "team_code": team,
                    "age": clean(row.get("Age")),
                    "service_time": clean(row.get("SrvTm")),
                    "contract_status": clean(
                        row.get("Contract Status")
                    ),
                    "salary_by_year": salaries,
                    "source": url,
                    "source_checked": date.today().isoformat(),
                })

            # Replace this team's previous records only after a
            # successful fetch and parse.
            records = [
                record for record in records
                if record.get("team_code") != team
            ]
            records.extend(team_records)

            if team not in successful:
                successful.append(team)

            failed = [
                item for item in failed if item.get("team") != team
            ]
            print(f"  Retrieved {len(team_records)} players")

        except Exception as error:
            failed.append({"team": team, "error": str(error)})
            print(f"  FAILED: {error}")

        time.sleep(5)

    result = {
        "season": 2026,
        "source": "Baseball-Reference team salary tables",
        "source_checked": date.today().isoformat(),
        "successful_teams": successful,
        "failed_teams": failed,
        "player_records": len(records),
        "records": records,
    }

    if records:
        OUTPUT.write_text(
            json.dumps(result, indent=2, ensure_ascii=False) + "\n"
        )
        print(f"\nSaved {len(records)} player-team records.")
        print(f"Output: {OUTPUT}")
    else:
        print("\nNo data saved because every team request failed.")

    print(f"Teams retrieved: {len(successful)}/{len(TEAMS)}")

    if failed:
        print("\nTeams needing another attempt:")
        for item in failed:
            print(f"  {item['team']}: {item['error']}")

    for target in ("Aaron Judge", "Juan Soto", "Shohei Ohtani"):
        matches = [
            record for record in records
            if record["player"] == target
        ]

        for player in matches:
            print(f"\n{player['player']} ({player['team_code']})")
            print("Contract:", player["contract_status"])
            print("2026:", player["salary_by_year"].get("2026"))
            print("2027:", player["salary_by_year"].get("2027"))


if __name__ == "__main__":
    main()
