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
    "OAK": "athletics",
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

    if not text or text.lower() in {"nan", "none", "-", "0"}:
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
    if re.fullmatch(r"Arb(?:-\d+)?", text, re.I):
        return {
            "raw": text,
            "salary_millions": None,
            "status": "arbitration",
        }

    if re.fullmatch(r"Pre-Arb(?:-\d+)?", text, re.I):
        return {
            "raw": text,
            "salary_millions": None,
            "status": "pre_arbitration",
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

    # Preserve previously verified MLB player IDs during refreshes.
    existing_player_ids = {}

    for record in records:
        player_id = record.get("mlb_player_id")
        player_name = record.get("player", "").strip().casefold()

        if isinstance(player_id, int) and player_id > 0:
            existing_player_ids.setdefault(player_name, set()).add(player_id)

    successful = list(previous.get("successful_teams", []))
    failed = [
        item for item in previous.get("failed_teams", [])
        if item.get("team") not in (sys.argv[1:] or list(TEAMS))
    ]

    requested_teams = sys.argv[1:] or list(TEAMS)
    refreshed_team_count = 0

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

            tables = pd.read_html(StringIO(response.content.decode("utf-8")))
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

                invalid_names = {
                    "Name",
                    "Signed",
                    "Contract Options",
                    "Option Values",
                    "Arb Eligible",
                    "Other Players",
                    "Dollars Committed",
                    "Arb Costs",
                    "Other Costs",
                    "Payroll (no options)",
                    "Payroll (options)",
                }

                if not name or name in invalid_names:
                    continue

                salaries = {
                    str(year): parse_salary(row[year])
                    for year in year_columns
                }

                known_ids = existing_player_ids.get(
                    name.casefold(), set()
                )

                preserved_id = (
                    next(iter(known_ids))
                    if len(known_ids) == 1
                    else None
                )

                team_records.append({
                    "player": name,
                    "mlb_player_id": preserved_id,
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

            # Preserve previously listed salaries when the source
            # temporarily returns an unavailable or unparsed value.
            previous_team_records = {
                record.get("player", "").strip().casefold(): record
                for record in records
                if record.get("team_code") == team
            }

            for refreshed in team_records:
                player_key = refreshed["player"].strip().casefold()
                previous_record = previous_team_records.get(player_key)

                if previous_record is None:
                    continue

                previous_salaries = previous_record.get(
                    "salary_by_year", {}
                )

                # Preserve salary years omitted entirely by the source.
                for year, old_salary in previous_salaries.items():
                    if year in refreshed["salary_by_year"]:
                        continue

                    if not isinstance(old_salary, dict):
                        continue

                    if old_salary.get("status") not in (
                        "salary_listed",
                        "salary_with_fa_marker",
                    ):
                        continue

                    if old_salary.get("salary_millions") is None:
                        continue

                    refreshed["salary_by_year"][year] = old_salary.copy()

                for year, new_salary in refreshed["salary_by_year"].items():
                    old_salary = previous_salaries.get(year)

                    if not isinstance(old_salary, dict):
                        continue

                    if new_salary.get("status") not in (
                        "unavailable",
                        "unparsed",
                    ):
                        continue

                    if old_salary.get("status") not in (
                        "salary_listed",
                        "salary_with_fa_marker",
                    ):
                        continue

                    if old_salary.get("salary_millions") is None:
                        continue

                    refreshed["salary_by_year"][year] = old_salary.copy()

            # Reject incomplete or suspiciously small salary tables.
            previous_team_count = sum(
                1 for record in records
                if record.get("team_code") == team
            )

            new_team_count = len(team_records)

            if new_team_count < 10:
                raise RuntimeError(
                    f"Suspicious salary table: only "
                    f"{new_team_count} players"
                )

            if (
                previous_team_count >= 10
                and new_team_count < previous_team_count * 0.5
            ):
                raise RuntimeError(
                    f"Suspicious salary table reduction: "
                    f"{previous_team_count} -> {new_team_count}"
                )

            # Reject refreshes that lose previously known player IDs.
            previous_ids_by_name = {
                record["player"].strip().casefold(): record["mlb_player_id"]
                for record in records
                if record.get("team_code") == team
                and isinstance(record.get("mlb_player_id"), int)
                and record["mlb_player_id"] > 0
            }

            for refreshed in team_records:
                player_name = refreshed["player"].strip().casefold()
                previous_id = previous_ids_by_name.get(player_name)

                if (
                    previous_id is not None
                    and refreshed.get("mlb_player_id") != previous_id
                ):
                    raise RuntimeError(
                        f"Player ID lost during refresh: "
                        f"{refreshed['player']}"
                    )

            # Replace this team's previous records only after a
            # successful fetch and parse.
            records = [
                record for record in records
                if record.get("team_code") != team
            ]
            records.extend(team_records)
            refreshed_team_count += 1

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

    # Preserve historical contract snapshots before saving refreshed data.
    archive_path = BASE / "mlb-contract-history.json"

    if refreshed_team_count > 0:
        archive = {
            "description": "DiamondIQ historical MLB salary records",
            "created": date.today().isoformat(),
            "source_dataset": OUTPUT.name,
            "record_count": 0,
            "records": [],
        }

        if archive_path.exists():
            archive = json.loads(archive_path.read_text())

        historical_records = archive.get("records", [])

        def record_key(record):
            return json.dumps(
                {
                    "player": record.get("player"),
                    "mlb_player_id": record.get("mlb_player_id"),
                    "team_code": record.get("team_code"),
                    "salary_by_year": record.get("salary_by_year"),
                },
                sort_keys=True,
                ensure_ascii=False,
            )

        existing_keys = {
            record_key(record)
            for record in historical_records
        }

        for record in previous.get("records", []):
            key = record_key(record)

            if key not in existing_keys:
                historical_records.append(record)
                existing_keys.add(key)

        archive["records"] = historical_records
        archive["record_count"] = len(historical_records)

        archive_path.write_text(
            json.dumps(
                archive,
                indent=2,
                ensure_ascii=False
            ) + "\n"
        )

        print(
            f"Historical archive: {len(historical_records)} records"
        )

    result = {
        "season": 2026,
        "source": "Baseball-Reference team salary tables",
        "source_checked": (
            date.today().isoformat()
            if refreshed_team_count > 0
            else previous.get("source_checked")
        ),
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

    # Report requested-team failures to scheduled workflows.
    requested_failures = [
        item for item in failed
        if item.get("team") in requested_teams
    ]

    if requested_failures:
        print(
            f"WARNING: {len(requested_failures)} requested "
            "team refresh(es) failed."
        )

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

    # Return failure only after saving all preserved and refreshed data.
    return 1 if requested_failures else 0


if __name__ == "__main__":
    sys.exit(main())
