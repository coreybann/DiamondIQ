
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

SOURCE = Path("public/data/diamondiq-2024-fangraphs-raw.csv")
OUTPUT = Path("public/data/mlb-contract-comparables-2024-expanded.json")
REVIEW = Path("public/data/mlb-contracts-2024-review.json")

SOURCE_URL = (
    "https://www.fangraphs.com/roster-resource/"
    "free-agent-tracker?season=2024"
)


def money_to_millions(value):
    value = (value or "").strip().replace(",", "")

    if not value.startswith("$"):
        return None

    if value.endswith("M"):
        return float(value[1:-1])

    if value.endswith("k"):
        return float(value[1:-1]) / 1000

    return None


def player_role(position):
    position = position.upper().split("/")

    if "SP" in position:
        return "SP"

    if "RP" in position:
        return "RP"

    return "POSITION"


def main():
    with SOURCE.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    by_player = defaultdict(list)

    for row_number, row in enumerate(rows, start=2):
        name = row["Name"].strip()

        if name:
            by_player[name].append((row_number, row))

    contracts = []
    review = []
    reasons = Counter()

    for name, entries in by_player.items():
        # Duplicate entries may represent later transactions.
        # Review them instead of automatically selecting one.
        if len(entries) > 1:
            for row_number, row in entries:
                review.append({
                    "player": name,
                    "rowNumber": row_number,
                    "reason": "duplicate_player",
                    "raw": row,
                })
                reasons["duplicate_player"] += 1
            continue

        row_number, row = entries[0]

        team = row["Signing Team"].strip()
        years_text = row["Years"].strip()
        total_text = row["Total Salary"].strip()
        aav_text = row["AAV"].strip()

        if not team:
            reasons["unsigned_or_no_team"] += 1
            continue

        if total_text == "MiLB":
            reasons["minor_league_deal"] += 1
            continue

        if total_text == "TBD":
            review.append({
                "player": name,
                "rowNumber": row_number,
                "reason": "unknown_contract_amount",
                "raw": row,
            })
            reasons["unknown_contract_amount"] += 1
            continue

        total = money_to_millions(total_text)
        reported_aav = money_to_millions(aav_text)

        try:
            years = int(years_text)
            age = int(row["Age"])
        except ValueError:
            years = None
            age = None

        if (
            not team
            or not years
            or not age
            or total is None
            or reported_aav is None
        ):
            review.append({
                "player": name,
                "rowNumber": row_number,
                "reason": "missing_or_invalid_contract_data",
                "raw": row,
            })
            reasons["missing_or_invalid_contract_data"] += 1
            continue

        calculated_aav = total / years
        aav_difference = abs(reported_aav - calculated_aav)

        contract = {
            "player": name,
            "position": player_role(row["Pos"]),
            "originalPosition": row["Pos"],
            "ageAtSigning": age,
            "team": team,
            "contractStartYear": 2024,
            "years": years,
            "totalMillions": round(total, 4),
            "aavMillions": round(reported_aav, 4),
            "calculatedAavMillions": round(calculated_aav, 4),
            "aavDifferenceMillions": round(aav_difference, 4),
            "war2022": None,
            "war2023": None,
            "priorTwoYearWar": None,
            "warTrainingEligible": False,
            "source": SOURCE_URL,
            "sourceRowNumber": row_number,
            "dataStatus": "pending_war_and_contract_review",
        }

        contracts.append(contract)

        if aav_difference > 0.1:
            review.append({
                "player": name,
                "rowNumber": row_number,
                "reason": "aav_mismatch",
                "reportedAavMillions": reported_aav,
                "calculatedAavMillions": round(calculated_aav, 4),
                "raw": row,
            })
            reasons["aav_mismatch"] += 1

    contracts.sort(key=lambda c: c["player"])

    OUTPUT.write_text(
        json.dumps({"contracts": contracts}, indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )

    REVIEW.write_text(
        json.dumps({"records": review}, indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )

    print("DIAMONDIQ 2024 CONTRACT CLEANING")
    print("=" * 50)
    print("Raw tracker rows:", len(rows))
    print("Unique players:", len(by_player))
    print("Provisional contracts:", len(contracts))
    print("Review records:", len(review))

    print("\nEXCLUSIONS AND FLAGS")
    for reason, count in sorted(reasons.items()):
        print(f"{reason}: {count}")

    print("\nOUTPUT FILES")
    print(OUTPUT)
    print(REVIEW)
    print("\nExisting 2024 database was not modified.")


if __name__ == "__main__":
    main()
