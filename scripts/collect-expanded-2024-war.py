
import json
import re
import unicodedata
import importlib.util
from collections import defaultdict
from html import unescape
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = Path("public/data")

INPUT = DATA_DIR / "mlb-contract-comparables-2024-merged.json"
OUTPUT = DATA_DIR / "mlb-contract-comparables-2024-war-enriched.json"
REVIEW = DATA_DIR / "mlb-contract-comparables-2024-war-review.json"

spec = importlib.util.spec_from_file_location(
    "fangraphs_war_lookup",
    SCRIPT_DIR / "fangraphs-war-lookup.py",
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
fetch_war = module.fetch_war


def normalize(value):
    value = unescape(re.sub(r"<[^>]+>", "", str(value)))
    value = unicodedata.normalize("NFKD", value)
    return "".join(
        c for c in value.lower()
        if not unicodedata.combining(c) and c.isalnum()
    )


def get_position_kind(contract):
    position = str(contract.get("position", "")).upper()
    return "pit" if position in ("SP", "RP") else "bat"


def main():
    data = json.loads(INPUT.read_text(encoding="utf-8"))
    contracts = data["contracts"]

    cache = {}

    # Retrieve both batting and pitching WAR for the two seasons
    # preceding 2024 contracts.
    for year in (2022, 2023):
        for kind in ("bat", "pit"):
            print(f"Fetching {year} {kind}...", flush=True)

            rows = fetch_war(year, kind)
            indexed = defaultdict(list)

            for row in rows:
                name = row.get("PlayerName") or row.get("Name", "")
                indexed[normalize(name)].append(row)

            cache[(year, kind)] = indexed
            print(f"  Retrieved {len(rows)} records", flush=True)

    enriched = []
    review = []

    for contract in contracts:
        player = dict(contract)
        name = player["player"]
        kind = get_position_kind(player)

        values = {}
        issues = []

        for year in (2022, 2023):
            matches = cache[(year, kind)].get(normalize(name), [])

            # Multiple IDs can mean a name collision. Do not guess.
            ids = {
                str(row.get("playerid"))
                for row in matches
                if row.get("playerid") is not None
            }

            if len(ids) > 1:
                issues.append(f"{year}: multiple player IDs")
                continue

            if not matches:
                issues.append(f"{year}: no matching {kind} record")
                continue

            values[year] = round(
                sum(float(row.get("WAR") or 0) for row in matches),
                3,
            )

        if len(values) == 2 and not issues:
            player["war2022"] = values[2022]
            player["war2023"] = values[2023]
            player["priorTwoYearWar"] = round(
                values[2022] + values[2023], 3
            )
            player["warTrainingEligible"] = True
            player["warReviewStatus"] = "matched"
        else:
            # Preserve existing verified WAR where available, but do
            # not mark an incomplete lookup as verified.
            player["warTrainingEligible"] = False
            player["warReviewStatus"] = "needs_review"

            review.append({
                "player": name,
                "position": player.get("position"),
                "issues": issues,
                "matchedWar": values,
            })

        enriched.append(player)

    result = dict(data)
    result["contracts"] = enriched
    result["war_source"] = (
        "FanGraphs major-league batting and pitching leaderboards"
    )
    result["war_seasons"] = [2022, 2023]

    OUTPUT.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    REVIEW.write_text(
        json.dumps({"records": review}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    eligible = sum(
        contract.get("warTrainingEligible") is True
        for contract in enriched
    )

    print("\nEXPANDED 2024 WAR ENRICHMENT")
    print("=" * 50)
    print("Contracts processed:", len(enriched))
    print("Complete WAR matches:", eligible)
    print("Needs review:", len(review))
    print("Enriched output:", OUTPUT)
    print("Review file:", REVIEW)
    print("\nOriginal datasets were not modified.")


if __name__ == "__main__":
    main()
