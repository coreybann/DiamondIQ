import json
import time
import urllib.request
from pathlib import Path

ids = json.loads(
    Path("public/data/free-agent-mlb-ids-2027.json").read_text()
)["matched"]

data = json.loads(
    Path("public/data/free-agent-teams-2026.json").read_text()
)

report = []

for index, player in enumerate(data["review"], 1):
    name = player["name"]
    player_id = ids[name]

    url = (
        "https://statsapi.mlb.com/api/v1/transactions"
        f"?playerId={player_id}"
        "&startDate=2025-10-01"
        "&endDate=2026-10-27"
    )

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "DiamondIQ/1.0"}
        )

        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)

        transactions = sorted(
            result.get("transactions", []),
            key=lambda t: (t.get("date", ""), t.get("id", 0))
        )

        records = []

        for transaction in transactions:
            records.append({
                "date": transaction.get("date"),
                "fromTeam": (
                    transaction.get("fromTeam") or {}
                ).get("name"),
                "toTeam": (
                    transaction.get("toTeam") or {}
                ).get("name"),
                "description": transaction.get("description", "")
            })

        report.append({
            "name": name,
            "mlbId": player_id,
            "transactions": records
        })

        print(f"\n[{index}/{len(data['review'])}] {name}")

        for record in records[-5:]:
            print(
                record["date"],
                "|",
                record["description"]
            )

        if not records:
            print("No transactions found")

    except Exception as error:
        report.append({
            "name": name,
            "mlbId": player_id,
            "error": str(error),
            "transactions": []
        })

        print(f"\n[{index}/{len(data['review'])}] {name}: ERROR {error}")

    time.sleep(0.15)

output = Path("public/data/free-agent-transaction-review-2026.json")

output.write_text(
    json.dumps(report, indent=2, ensure_ascii=False) + "\n"
)

print("\n=== SUMMARY ===")
print("Players reviewed:", len(report))
print("Players with transactions:", sum(
    bool(player["transactions"]) for player in report
))
print("Players without transactions:", sum(
    not player["transactions"] for player in report
))
print("Report saved:", output)
