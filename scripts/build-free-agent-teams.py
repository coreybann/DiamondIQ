import json
import time
import urllib.request
from pathlib import Path

ids_path = Path("public/data/free-agent-mlb-ids-2027.json")
output = Path("public/data/free-agent-teams-2026.json")

ids = json.loads(ids_path.read_text())["matched"]

teams = {}
review = []

for index, (name, player_id) in enumerate(ids.items(), 1):
    url = (
        f"https://statsapi.mlb.com/api/v1/people/{player_id}"
        "?hydrate=stats(group=[hitting,pitching],type=[yearByYear],leagueListId=[mlb_hist])"
    )

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "DiamondIQ/1.0"}
        )

        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.load(response)

        people = data.get("people", [])
        if not people:
            raise ValueError("No player returned")

        person = people[0]
        season_teams = set()

        for group in person.get("stats", []):
            for split in group.get("splits", []):
                if str(split.get("season")) != "2026":
                    continue

                team = split.get("team", {}).get("name")
                if team:
                    season_teams.add(team)

        if len(season_teams) == 1:
            team = next(iter(season_teams))
            teams[name] = team
            print(f"[{index}/{len(ids)}] MATCH: {name} → {team}")

        elif len(season_teams) > 1:
            review.append({
                "name": name,
                "mlbId": player_id,
                "reason": "Multiple 2026 teams",
                "teams": sorted(season_teams)
            })
            print(f"[{index}/{len(ids)}] REVIEW: {name} (multiple teams)")

        else:
            review.append({
                "name": name,
                "mlbId": player_id,
                "reason": "No 2026 MLB team found"
            })
            print(f"[{index}/{len(ids)}] REVIEW: {name} (no team found)")

    except Exception as error:
        review.append({
            "name": name,
            "mlbId": player_id,
            "reason": str(error)
        })
        print(f"[{index}/{len(ids)}] ERROR: {name}: {error}")

    time.sleep(0.15)

output.write_text(
    json.dumps({
        "season": 2026,
        "teams": teams,
        "review": review
    }, indent=2, ensure_ascii=False) + "\n"
)

print("\n=== RESULTS ===")
print("Players with one 2026 team:", len(teams))
print("Need review:", len(review))
print("Saved to:", output)
