import json
import time
import urllib.request
from pathlib import Path

path = Path("public/data/free-agent-teams-2026.json")
data = json.loads(path.read_text())

teams = data["teams"]
remaining = []
resolved = []

multi_team_players = [
    player for player in data["review"]
    if player["reason"] == "Multiple 2026 teams"
]

other_players = [
    player for player in data["review"]
    if player["reason"] != "Multiple 2026 teams"
]

print(f"Checking {len(multi_team_players)} multi-team players...\n")

for index, player in enumerate(multi_team_players, 1):
    name = player["name"]
    player_id = player["mlbId"]

    url = (
        f"https://statsapi.mlb.com/api/v1/people/{player_id}/stats"
        "?stats=gameLog&group=hitting,pitching"
        "&season=2026&leagueListId=mlb_hist"
    )

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "DiamondIQ/1.0"}
        )

        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)

        games = []

        for group in result.get("stats", []):
            for game in group.get("splits", []):
                date = game.get("date")
                team = game.get("team", {}).get("name")

                if date and team:
                    games.append((date, team))

        if not games:
            remaining.append(player)
            print(f"[{index}/{len(multi_team_players)}] NO GAMES: {name}")
            continue

        games.sort(key=lambda item: item[0])
        last_date, last_team = games[-1]

        if last_team not in player["teams"]:
            remaining.append(player)
            print(f"[{index}/{len(multi_team_players)}] REVIEW: {name}")
            continue

        teams[name] = last_team

        resolved.append({
            "name": name,
            "team": last_team,
            "lastGame": last_date
        })

        print(
            f"[{index}/{len(multi_team_players)}] "
            f"{name} → {last_team} ({last_date})"
        )

    except Exception as error:
        remaining.append({
            **player,
            "error": str(error)
        })
        print(f"[{index}/{len(multi_team_players)}] ERROR: {name}: {error}")

    time.sleep(0.15)

data["teams"] = teams
data["review"] = other_players + remaining
data["resolvedByGameLog"] = resolved

path.write_text(
    json.dumps(data, indent=2, ensure_ascii=False) + "\n"
)

print("\n=== UPDATED RESULTS ===")
print("Players with identified teams:", len(teams))
print("Still need review:", len(data["review"]))
print("Resolved using game logs:", len(resolved))
print("Saved:", path)
