import json
import re
import unicodedata
from collections import defaultdict
from html import unescape
from pathlib import Path

import importlib.util

spec = importlib.util.spec_from_file_location(
    "fangraphs_war_lookup",
    Path(__file__).with_name("fangraphs-war-lookup.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
fetch_war = module.fetch_war

FILES = [
    Path("public/data/mlb-contract-comparables-2024.json"),
    Path("public/data/mlb-contract-comparables.json"),
]

def normalize(value):
    value = unescape(re.sub(r"<[^>]+>", "", str(value)))
    value = unicodedata.normalize("NFKD", value)
    return "".join(
        c for c in value.lower()
        if not unicodedata.combining(c) and c.isalnum()
    )

def main():
    datasets = [(p, json.loads(p.read_text())) for p in FILES]
    cache = {}

    # Six requests total: batting and pitching for 2022, 2023, 2024.
    for year in (2022, 2023, 2024):
        for kind in ("bat", "pit"):
            print(f"Fetching {year} {kind}...", flush=True)
            cache[(year, kind)] = defaultdict(list)
            for row in fetch_war(year, kind):
                name = row.get("PlayerName") or row.get("Name", "")
                cache[(year, kind)][normalize(name)].append(row)

    updates = []
    flagged = []

    confirmed_missing = {
        ("Rhys Hoskins", 2023),
        ("Kenta Maeda", 2022),
        ("James Paxton", 2022),
        ("Walker Buehler", 2023),
        ("Blake Treinen", 2023),
    }

    confirmed_war_updates = {
        "Juan Soto": 14.36,
        "Willy Adames": 8.26,
    }

    for path, data in datasets:
        for player in data["contracts"]:
            name = player["player"]
            year = player["contractStartYear"]
            kind = "pit" if player["position"] in ("SP", "RP") else "bat"
            values = []
            issues = []

            for season in (year - 2, year - 1):
                matches = cache[(season, kind)].get(normalize(name), [])
                ids = {str(r.get("playerid")) for r in matches}

                if len(ids) > 1:
                    issues.append(f"{season}: multiple player IDs")
                if not matches:
                    if (name, season) not in confirmed_missing:
                        issues.append(f"{season}: no matching season")
                    values.append(0.0)
                else:
                    values.append(sum(float(r.get("WAR") or 0) for r in matches))

            combined = sum(values)
            existing = float(player["priorTwoYearWar"])

            if name in confirmed_war_updates:
                player["priorTwoYearWar"] = confirmed_war_updates[name]
                existing = confirmed_war_updates[name]

            if abs(combined - existing) > 0.15:
                issues.append(
                    f"combined {combined:.2f} vs saved {existing:.2f}"
                )

            if issues:
                flagged.append((name, "; ".join(issues)))
            else:
                updates.append((player, year, values))

    print(f"\nMatched without flags: {len(updates)}")
    print(f"Flagged for review: {len(flagged)}")
    for name, issue in flagged:
        print(f"CHECK {name}: {issue}")

    # Do not write anything if a source lookup failed or
    # a significant mismatch remains unresolved.
    if flagged:
        print("\nNo files changed. Review flags first.")
        return

    for player, year, values in updates:
        player[f"war{year - 2}"] = round(values[0], 3)
        player[f"war{year - 1}"] = round(values[1], 3)

    for path, data in datasets:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    print("\nIndividual-season WAR saved successfully.")

if __name__ == "__main__":
    main()
