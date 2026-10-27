import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

source = Path("public/data/free-agents-2027.json")
output = Path("public/data/free-agent-mlb-ids-2027.json")

players = json.loads(source.read_text())["players"]

matched = {}
review = []

def normalize(value):
    import unicodedata
    value = unicodedata.normalize("NFKD", value)
    return "".join(
        char for char in value
        if not unicodedata.combining(char)
    ).lower().replace("’", "'").strip()

def position_matches(expected, actual):
    if expected == actual:
        return True

    pitcher_positions = {"P", "SP", "RP"}
    outfield_positions = {"OF", "LF", "CF", "RF"}

    if expected in pitcher_positions and actual in pitcher_positions:
        return True

    if expected in outfield_positions and actual in outfield_positions:
        return True

    return False

for index, player in enumerate(players, 1):
    name = player["name"]
    expected_position = player.get("position", "")

    url = (
        "https://statsapi.mlb.com/api/v1/people/search?"
        + urllib.parse.urlencode({"names": name})
    )

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "DiamondIQ/1.0"}
        )

        with urllib.request.urlopen(request, timeout=20) as response:
            results = json.load(response).get("people", [])

        candidates = [
            result for result in results
            if normalize(result.get("fullName", "")) == normalize(name)
            and position_matches(
                expected_position,
                result.get("primaryPosition", {}).get("abbreviation", "")
            )
        ]

        if len(candidates) == 1:
            matched[name] = candidates[0]["id"]
            print(f"[{index}/{len(players)}] MATCH: {name}")
        else:
            review.append({
                "name": name,
                "expectedPosition": expected_position,
                "candidates": [
                    {
                        "id": result.get("id"),
                        "name": result.get("fullName"),
                        "position": result.get(
                            "primaryPosition", {}
                        ).get("abbreviation")
                    }
                    for result in results[:10]
                ]
            })
            print(f"[{index}/{len(players)}] REVIEW: {name}")

    except Exception as error:
        review.append({
            "name": name,
            "expectedPosition": expected_position,
            "error": str(error)
        })
        print(f"[{index}/{len(players)}] ERROR: {name}: {error}")

    time.sleep(0.15)

output.write_text(
    json.dumps({
        "season": 2027,
        "matched": matched,
        "review": review
    }, indent=2, ensure_ascii=False) + "\n"
)

print("\n=== RESULTS ===")
print("Matched:", len(matched))
print("Needs review:", len(review))
print("Saved to:", output)
