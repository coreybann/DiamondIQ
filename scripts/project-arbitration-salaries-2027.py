
import csv
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"


def normalize_name(name):
    text = unicodedata.normalize("NFKD", name)
    return "".join(
        char for char in text.lower()
        if char.isalnum() and not unicodedata.combining(char)
    )


def load_json(filename):
    with (DATA / filename).open(encoding="utf-8") as file:
        return json.load(file)


def load_historical_war():
    path = DATA / "player-fwar-2022-2026-modeling.csv"

    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))

def baseline_arbitration_salary(player):
    salary = player["salary_by_year"]["2026"]["salary_millions"]

    if salary is None:
        return None

    return round(float(salary), 3)
def estimate_arbitration_salary(player, performance):
    previous_salary = baseline_arbitration_salary(player)

    if previous_salary is None:
        return None

    recent_war = performance["war_2yr_avg"]
    latest_war = performance["war_2026"]

    if recent_war is not None and latest_war is not None:
        recent_war = (0.60 * latest_war) + (0.40 * recent_war)

    elif recent_war is None:
        recent_war = performance["war_3yr_avg"]

    if recent_war is None:
        return previous_salary

    if recent_war is None:
        return None

    if recent_war < 0:
        raise_rate = 0.00
    elif recent_war < 1:
        raise_rate = 0.10
    elif recent_war < 2:
        raise_rate = 0.25
    elif recent_war < 3:
        raise_rate = 0.40
    else:
        raise_rate = 0.60

    return round(previous_salary * (1 + raise_rate), 3)
def main():
    contracts = load_json("mlb-contracts-2026.json")["records"]
    historical_war = load_historical_war()
    projected_war = load_json("trade-war-projections-2027.json")

    arbitration_players = [
        player for player in contracts
        if player["salary_by_year"].get("2027", {}).get("status")
        == "arbitration"
    ]

    historical_by_name = {}
    projected_by_name = {}

    for row in historical_war:
        key = normalize_name(row["player_name"])
        historical_by_name.setdefault(key, []).append(row)

    for row in projected_war:
        key = normalize_name(row["player_name"])
        projected_by_name.setdefault(key, []).append(row)

    matched_players = []
    missing_players = []
    identity_conflicts = []

    for player in arbitration_players:
        key = normalize_name(player["player"])

        history = historical_by_name.get(key, [])
        projections = projected_by_name.get(key, [])

        historical_ids = {
            str(row["fangraphs_id"]) for row in history
        }
        projected_ids = {
            str(row["fangraphs_id"]) for row in projections
        }

        if not history or not projections:
            missing_players.append(player["player"])
            continue

        if (
            len(historical_ids) != 1
            or len(projected_ids) != 1
            or historical_ids != projected_ids
        ):
            identity_conflicts.append(player["player"])
            continue

        war_by_season = {
            int(row["season"]): float(row["total_fwar"])
            for row in history
        }

        recent_two = [
            war_by_season[year]
            for year in (2025, 2026)
            if year in war_by_season
        ]

        recent_three = [
            war_by_season[year]
            for year in (2024, 2025, 2026)
            if year in war_by_season
        ]

        performance = {
            "war_2026": war_by_season.get(2026),
            "war_2yr_avg": (
                sum(recent_two) / len(recent_two)
                if recent_two else None
            ),
            "war_3yr_avg": (
                sum(recent_three) / len(recent_three)
                if recent_three else None
            ),
            "projected_war_2027": float(
                projections[0]["projected_total_fwar"]
            ),
        }

        matched_players.append({
            "player": player,
            "historical_war": history,
            "projected_war": projections[0],
            "performance": performance,
            "baseline_salary_2027": baseline_arbitration_salary(player),
            "estimated_salary_2027": estimate_arbitration_salary(
                player, performance
            ),
        })

    print("2027 Arbitration Salary Model")
    print("-----------------------------")
    print("Contract records:", len(contracts))
    print("Historical WAR rows:", len(historical_war))
    print("Projected WAR records:", len(projected_war))
    print("Arbitration players:", len(arbitration_players))
    print("Verified player matches:", len(matched_players))
    print("Missing players:", len(missing_players))
    print("Identity conflicts:", len(identity_conflicts))

    salaries = []

    for entry in matched_players:
        salary = entry["player"]["salary_by_year"]["2026"]["salary_millions"]

        if salary is not None:
            salaries.append(float(salary))

    salaries.sort()

    print("\n2026 Arbitration Player Salaries:")
    print("Players with salaries:", len(salaries))
    print("Minimum salary: $", round(salaries[0], 2), "M")
    print("Median salary: $", round(salaries[len(salaries) // 2], 2), "M")
    print("Maximum salary: $", round(salaries[-1], 2), "M")
    print("Average salary: $", round(sum(salaries) / len(salaries), 2), "M")

    print("\nSample performance metrics:")

    for entry in matched_players[:5]:
        p = entry["performance"]

        print(
            entry["player"]["player"],
            "| 2026 WAR:", p["war_2026"],
            "| 2Y Avg:", round(p["war_2yr_avg"], 2)
            if p["war_2yr_avg"] is not None else "N/A",
            "| 3Y Avg:", round(p["war_3yr_avg"], 2)
            if p["war_3yr_avg"] is not None else "N/A",
            "| 2027 Projection:", p["projected_war_2027"]
        )

    print("\nPreliminary 2027 Arbitration Salary Estimates")
    print("---------------------------------------------")

    for entry in matched_players[:15]:
        player = entry["player"]
        previous = entry["baseline_salary_2027"]
        estimated = entry["estimated_salary_2027"]

        if previous is None or estimated is None:
            continue

        print(
            f"{player['player']}: "
            f"2026 ${previous:.2f}M → "
            f"2027 ${estimated:.2f}M "
            f"(+${estimated - previous:.2f}M)"
        )
    valid_estimates = [
        entry for entry in matched_players
        if entry["baseline_salary_2027"] is not None
        and entry["estimated_salary_2027"] is not None
    ]

    total_2026 = sum(
        entry["baseline_salary_2027"]
        for entry in valid_estimates
    )

    total_2027 = sum(
        entry["estimated_salary_2027"]
        for entry in valid_estimates
    )

    print("\nFull Arbitration Model Summary")
    print("------------------------------")
    print("Players projected:", len(valid_estimates))
    print(f"2026 total salaries: ${total_2026:.2f}M")
    print(f"2027 estimated salaries: ${total_2027:.2f}M")
    print(f"Total estimated increase: ${total_2027 - total_2026:.2f}M")
    print(
        f"Average estimated raise: "
        f"${(total_2027 - total_2026) / len(valid_estimates):.2f}M"
    )

    largest_raises = sorted(
        valid_estimates,
        key=lambda entry: (
            entry["estimated_salary_2027"]
            - entry["baseline_salary_2027"]
        ),
        reverse=True
    )

    print("\nTop 10 Estimated Raises:")

    for entry in largest_raises[:10]:
        increase = (
            entry["estimated_salary_2027"]
            - entry["baseline_salary_2027"]
        )

        print(
            f"{entry['player']['player']}: "
            f"+${increase:.2f}M "
            f"(2027: ${entry['estimated_salary_2027']:.2f}M)"
        )
    mlbtr_records = load_json(
        "mlb-arbitration-projections-2027.json"
    )["records"]

    mlbtr_by_name = {}

    for record in mlbtr_records:
        key = normalize_name(record["player"])
        mlbtr_by_name.setdefault(key, []).append(record)

    comparisons = []

    for entry in matched_players:
        key = normalize_name(entry["player"]["player"])
        matches = mlbtr_by_name.get(key, [])

        if len(matches) != 1:
            continue

        estimated = entry["estimated_salary_2027"]
        baseline = entry["baseline_salary_2027"]
        external = float(
            matches[0]["projected_salary_millions"]
        )

        if estimated is None or baseline is None:
            continue

        comparisons.append({
            "player": entry["player"]["player"],
            "diamondiq": estimated,
            "baseline": baseline,
            "mlbtr": external,
            "difference": abs(estimated - external),
            "baseline_difference": abs(baseline - external),
        })

    comparisons.sort(
        key=lambda item: item["difference"],
        reverse=True
    )

    model_mae = sum(
        item["difference"] for item in comparisons
    ) / len(comparisons)

    baseline_mae = sum(
        item["baseline_difference"] for item in comparisons
    ) / len(comparisons)

    print("\n2027 External Projection Comparison")
    print("-----------------------------------")
    print("Players compared:", len(comparisons))
    print(f"DiamondIQ vs MLBTR MAE: ${model_mae:.3f}M")
    print(f"2026 baseline vs MLBTR MAE: ${baseline_mae:.3f}M")

    print("\nTop 10 Largest Differences:")

    for item in comparisons[:10]:
        print(
            f"{item['player']}: "
            f"DiamondIQ ${item['diamondiq']:.2f}M | "
            f"MLBTR ${item['mlbtr']:.2f}M | "
            f"Difference ${item['difference']:.2f}M"
        )
    print("\nLargest Differences - Model Inputs")
    print("----------------------------------")

    entries_by_name = {
        normalize_name(entry["player"]["player"]): entry
        for entry in matched_players
    }

    for item in comparisons[:10]:
        entry = entries_by_name[normalize_name(item["player"])]
        player = entry["player"]
        performance = entry["performance"]

        future_arb_years = sum(
            1
            for year, data in player["salary_by_year"].items()
            if int(year) >= 2027
            and str(data.get("raw", "")).strip().lower() == "arb"
        )

        print(
            f"{item['player']} | "
            f"2026 salary: ${item['baseline']:.2f}M | "
            f"2026 WAR: {performance['war_2026']} | "
            f"2Y WAR: {performance['war_2yr_avg']} | "
            f"Service: {player['service_time']} | "
            f"Arb years remaining: {future_arb_years}"
        )
    export_records = []

    for entry in matched_players:
        player = entry["player"]
        performance = entry["performance"]

        estimate = entry["estimated_salary_2027"]
        baseline = entry["baseline_salary_2027"]

        if estimate is None or baseline is None:
            continue

        if performance["war_2yr_avg"] is not None:
            method = "recent_war_weighted"
        elif performance["war_3yr_avg"] is not None:
            method = "three_year_war_fallback"
        else:
            method = "previous_salary_fallback"

        export_records.append({
            "player": player["player"],
            "team_code": player["team_code"],
            "fangraphs_id": entry["historical_war"][0]["fangraphs_id"],
            "season": 2027,
            "salary_status": "arbitration_estimate",
            "salary_2026_millions": baseline,
            "estimated_salary_2027_millions": estimate,
            "estimated_raise_millions": round(estimate - baseline, 3),
            "war_2026": performance["war_2026"],
            "war_2yr_avg": performance["war_2yr_avg"],
            "projection_method": method,
        })

    export_records.sort(
        key=lambda record: (
            record["team_code"],
            record["player"]
        )
    )

    output = {
        "season": 2027,
        "model": "DiamondIQ Arbitration Salary Model v0.1",
        "status": "provisional",
        "salary_unit": "millions_usd",
        "description": (
            "Independent preliminary arbitration salary estimates "
            "using previous salary and historical FanGraphs WAR. "
            "Not confirmed contracts or actual arbitration awards."
        ),
        "records": export_records,
    }

    output_path = DATA / "arbitration-salary-projections-2027.json"

    output_path.write_text(
        json.dumps(output, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )

    print("\n2027 Arbitration Projection Export")
    print("----------------------------------")
    print("Output:", output_path)
    print("Players exported:", len(export_records))
    print(
        "Total estimated salaries:",
        f"${sum(r['estimated_salary_2027_millions'] for r in export_records):.2f}M"
    )

    methods = {}

    for record in export_records:
        method = record["projection_method"]
        methods[method] = methods.get(method, 0) + 1

    print("Projection methods:", methods)
    if missing_players:
        print("Missing:", missing_players)

    if identity_conflicts:
        print("Identity conflicts:", identity_conflicts)

    assert len(matched_players) == 165, "Player matching incomplete"

if __name__ == "__main__":
    main()
