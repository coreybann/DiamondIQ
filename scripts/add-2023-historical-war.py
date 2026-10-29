
import importlib.util
import json
import shutil
import unicodedata
from datetime import datetime
from pathlib import Path

DATA_PATH = Path("public/data/mlb-contract-comparables-2023.json")
BACKUP_PATH = Path("public/data/raw/mlb-contract-comparables-2023-before-war.json")
REPORT_PATH = Path("public/data/raw/contracts-2023-war-review.json")

LOOKUP_PATH = Path("scripts/fangraphs-war-lookup.py")


def normalize(name):
    text = unicodedata.normalize("NFKD", name.lower())
    return "".join(
        char for char in text
        if char.isalnum() and not unicodedata.combining(char)
    )


def load_lookup():
    spec = importlib.util.spec_from_file_location("lookup", LOOKUP_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def get_player_name(row):
    return row.get("PlayerName") or row.get("Name") or ""


def get_war(row):
    for key in ("WAR", "war"):
        if key in row and row[key] is not None:
            try:
                return float(str(row[key]).replace(",", ""))
            except (ValueError, TypeError):
                return None
    return None


def main():
    original = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    contracts = original["contracts"]

    lookup = load_lookup()
    indexes = {}

    for year in (2021, 2022):
        for kind in ("bat", "pit"):
            print(f"Fetching {year} {kind}...", flush=True)

            rows = lookup.fetch_war(year, kind)
            index = {}

            for row in rows:
                name = normalize(get_player_name(row))
                war = get_war(row)

                if not name or war is None:
                    continue

                index.setdefault(name, []).append(war)

            indexes[(year, kind)] = index

    international = {
        "Scott McGough",
        "Drew Rucinski",
        "Masataka Yoshida",
        "Kodai Senga",
        "Shintaro Fujinami",
    }

    report = {
        "internationalPlayers": [],
        "missingSeasons": [],
        "ambiguousMatches": [],
        "unmatchedPlayers": [],
    }

    complete = 0
    partial = 0

    for contract in contracts:
        player = contract["player"]
        name = normalize(player)
        kind = (
            "pit"
            if contract["position"] in ("SP", "RP")
            else "bat"
        )

        values = {}

        for year in (2021, 2022):
            matches = indexes[(year, kind)].get(name, [])

            if len(matches) == 1:
                values[year] = matches[0]
            else:
                values[year] = None

                if len(matches) > 1:
                    report["ambiguousMatches"].append({
                        "player": player,
                        "year": year,
                        "values": matches,
                    })
                else:
                    report["missingSeasons"].append({
                        "player": player,
                        "year": year,
                    })

        contract["war2021"] = values[2021]
        contract["war2022"] = values[2022]

        if player in international:
            contract["priorTwoYearWar"] = None
            contract["warTrainingEligible"] = False
            report["internationalPlayers"].append(player)
            continue

        if values[2021] is None and values[2022] is None:
            contract["priorTwoYearWar"] = None
            contract["warTrainingEligible"] = False
            report["unmatchedPlayers"].append(player)
            continue

        # A missing MLB season is not automatically zero WAR.
        if values[2021] is None or values[2022] is None:
            contract["priorTwoYearWar"] = None
            contract["warTrainingEligible"] = False
            partial += 1
            continue

        contract["priorTwoYearWar"] = round(
            values[2021] + values[2022], 3
        )
        contract["warTrainingEligible"] = True
        complete += 1

    # Save the original dataset before making changes.
    if not BACKUP_PATH.exists():
        shutil.copy2(DATA_PATH, BACKUP_PATH)

    REPORT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    DATA_PATH.write_text(
        json.dumps(original, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print("\n2023 WAR enrichment complete")
    print("Contracts:", len(contracts))
    print("Complete two-year WAR:", complete)
    print("Partial MLB history:", partial)
    print("International cases:", len(report["internationalPlayers"]))
    print("Ambiguous matches:", len(report["ambiguousMatches"]))
    print("Fully unmatched MLB players:", len(report["unmatchedPlayers"]))
    print("Backup:", BACKUP_PATH)
    print("Review report:", REPORT_PATH)


if __name__ == "__main__":
    main()
