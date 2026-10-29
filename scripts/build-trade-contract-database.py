import json
from pathlib import Path

base = Path("public/data")

sources = [
    base / "mlb-contract-comparables-2024.json",
    base / "mlb-contract-comparables.json",
]

contracts = {}

for path in sources:
    data = json.loads(path.read_text())
    records = data.get("contracts", [])

    for row in records:
        name = row.get("player")
        team = row.get("team")
        start = row.get("contractStartYear")
        years = row.get("years")

        if not name or not team or not isinstance(start, int):
            continue
        if not isinstance(years, (int, float)) or years <= 0:
            continue

        end_year = start + int(years) - 1
        key = (name.casefold(), team.casefold(), start)

        contracts[key] = {
            "player": name,
            "team": team,
            "contractStartYear": start,
            "reportedContractYears": int(years),
            "reportedContractEndYear": end_year,
            "reportedTotalMillions": row.get("totalMillions"),
            "reportedAavMillions": row.get("aavMillions"),
            "source": row.get("source"),
            "status": "historical_reference_unverified",
            "verifiedAnnualSalaries": False,
        }

output = sorted(
    contracts.values(),
    key=lambda row: (row["player"].casefold(), row["contractStartYear"]),
)

destination = base / "trade-contract-database.json"
destination.write_text(json.dumps(output, indent=2) + "\n")

print(f"Created {destination}")
print(f"Historical contract records: {len(output)}")
print("Annual salaries marked verified: 0")
print("Current contracts verified: 0")
