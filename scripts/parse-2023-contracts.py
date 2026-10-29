
import csv
import json
import re
from collections import Counter
from pathlib import Path

SOURCE = Path("public/data/raw/fangraphs-free-agents-2023.txt")
OUTPUT = Path("public/data/mlb-contract-comparables-2023.json")
REVIEW = Path("public/data/raw/contracts-2023-review.json")


def money(value):
    value = value.strip().replace(",", "")
    match = re.fullmatch(r"\$([\d.]+)\s*([MmKk]?)", value)

    if not match:
        return None

    amount = float(match.group(1))
    unit = match.group(2).upper()

    if unit == "K":
        return amount / 1000
    if unit == "M":
        return amount

    return amount / 1_000_000


def main():
    with SOURCE.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.reader(file, delimiter="\t"))

    candidates = []
    skipped = []
    flagged = []

    for row in rows:
        if not row or row[0] == "Name" or len(row) < 17:
            continue

        name = row[0].strip()
        if not name or name == "📝":
            continue

        position = row[1].strip()
        team = row[13].strip()
        years_text = row[14].strip()
        total_text = row[15].strip()
        aav_text = row[16].strip()

        if not team or not years_text or not total_text:
            skipped.append({"player": name, "reason": "No MLB contract"})
            continue

        if total_text.lower() == "milb":
            skipped.append({"player": name, "reason": "Minor league deal"})
            continue

        try:
            age = int(row[5].strip())
            years = int(years_text)
        except ValueError:
            flagged.append({"player": name, "reason": "Invalid age or years"})
            continue

        total = money(total_text)
        listed_aav = money(aav_text)

        if total is None or years <= 0:
            flagged.append({"player": name, "reason": "Invalid contract value"})
            continue

        calculated_aav = total / years

        if listed_aav is None or abs(listed_aav - calculated_aav) > 0.25:
            flagged.append({
                "player": name,
                "reason": "AAV does not match total divided by years",
                "years": years,
                "totalMillions": total,
                "listedAavMillions": listed_aav,
                "calculatedAavMillions": round(calculated_aav, 3),
            })
            continue

        role = (
            "SP" if "SP" in position.split("/")
            else "RP" if "RP" in position.split("/")
            else "POSITION"
        )

        candidates.append({
            "player": name,
            "position": role,
            "ageAtSigning": age,
            "priorTwoYearWar": None,
            "team": team,
            "contractStartYear": 2023,
            "years": years,
            "totalMillions": round(total, 3),
            "aavMillions": round(calculated_aav, 3),
            "source": "FanGraphs 2023 Free Agent Tracker",
            "war2021": None,
            "war2022": None,
        })

    counts = Counter(item["player"] for item in candidates)
    contracts = []

    for item in candidates:
        if counts[item["player"]] > 1:
            flagged.append({
                "player": item["player"],
                "reason": "Multiple contracts: manual review required",
                "contract": item,
            })
        else:
            contracts.append(item)

    result = {
        "season": 2023,
        "contracts": contracts,
    }

    review = {
        "skipped": skipped,
        "flagged": flagged,
    }

    OUTPUT.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    )
    REVIEW.write_text(
        json.dumps(review, indent=2, ensure_ascii=False) + "\n"
    )

    print("2023 contract extraction complete")
    print("Usable contracts:", len(contracts))
    print("Skipped entries:", len(skipped))
    print("Flagged for review:", len(flagged))
    print("Output:", OUTPUT)
    print("Review:", REVIEW)


if __name__ == "__main__":
    main()
