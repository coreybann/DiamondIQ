import requests
import pandas as pd
import time
import json
import os

INPUT = "data/statcast/statcast_2025.csv"
OUTPUT = "data/statcast/runner-advancement-2025-raw.csv"
PROGRESS = "data/statcast/runner-advancement-progress.json"

df = pd.read_csv(
    INPUT,
    usecols=["game_pk"],
    low_memory=False
)

game_ids = sorted(
    df["game_pk"].dropna().astype("int64").unique().tolist()
)

completed = set()

if os.path.exists(PROGRESS):
    with open(PROGRESS) as f:
        completed = set(json.load(f))

session = requests.Session()

rows = []
failed = []

def extract_play(play, game_id):
    event = play.get("result", {}).get("event", "")

    if event not in ["Single", "Double"]:
        return []

    movements = {}

    for runner in play.get("runners", []):
        details = runner.get("details", {})
        movement = runner.get("movement", {})

        runner_info = details.get("runner", {})
        runner_id = runner_info.get("id")

        if runner_id is None:
            continue

        start = movement.get("start")
        end = movement.get("end")

        # Ignore the batter. We only want existing baserunners.
        if start is None:
            continue

        if runner_id not in movements:
            movements[runner_id] = {
                "runner_id": runner_id,
                "runner_name": runner_info.get("fullName"),
                "start": start,
                "end": end,
                "is_out": bool(movement.get("isOut")),
                "out_base": movement.get("outBase"),
                "scored": bool(details.get("isScoringEvent")),
            }
        else:
            current = movements[runner_id]

            if end is not None:
                current["end"] = end

            current["is_out"] = (
                current["is_out"] or
                bool(movement.get("isOut"))
            )

            if movement.get("outBase"):
                current["out_base"] = movement["outBase"]

            current["scored"] = (
                current["scored"] or
                bool(details.get("isScoringEvent"))
            )

    about = play.get("about", {})
    count = play.get("count", {})
    matchup = play.get("matchup", {})

    initial_bases = sorted({
        movement["start"]
        for movement in movements.values()
    })

    output = []

    for runner in movements.values():
        output.append({
            "game_id": game_id,
            "at_bat_index": about.get("atBatIndex"),
            "inning": about.get("inning"),
            "half_inning": about.get("halfInning"),
            "event": event,
            "outs_before": count.get("outs"),
            "initial_bases": ",".join(initial_bases),
            "batter_id": matchup.get("batter", {}).get("id"),
            **runner,
        })

    return output


print("Total games:", len(game_ids))
print("Already completed:", len(completed))

for index, game_id in enumerate(game_ids, 1):
    if game_id in completed:
        continue

    url = (
        f"https://statsapi.mlb.com/api/v1.1/"
        f"game/{game_id}/feed/live"
    )

    success = False

    for attempt in range(4):
        try:
            response = session.get(url, timeout=45)
            response.raise_for_status()

            data = response.json()

            plays = data.get(
                "liveData", {}
            ).get(
                "plays", {}
            ).get(
                "allPlays", []
            )

            game_rows = []

            for play in plays:
                game_rows.extend(
                    extract_play(play, game_id)
                )

            rows.extend(game_rows)
            completed.add(int(game_id))
            success = True
            break

        except Exception as error:
            wait = 2 ** attempt
            print(
                f"Game {game_id} failed: {error}. "
                f"Retrying in {wait}s"
            )
            time.sleep(wait)

    if not success:
        failed.append(game_id)
        continue

    # Save progress every 25 successful games.
    if len(completed) % 25 == 0:
        pd.DataFrame(rows).to_csv(
            OUTPUT,
            mode="a",
            header=not os.path.exists(OUTPUT),
            index=False
        )
        rows = []

        with open(PROGRESS, "w") as f:
            json.dump(sorted(completed), f)

        print(
            f"Progress: {len(completed)}/{len(game_ids)} games"
        )

    time.sleep(0.15)

# Save remaining observations.
if rows:
    pd.DataFrame(rows).to_csv(
        OUTPUT,
        mode="a",
        header=not os.path.exists(OUTPUT),
        index=False
    )

with open(PROGRESS, "w") as f:
    json.dump(sorted(completed), f)

with open(
    "data/statcast/runner-advancement-failures.json", "w"
) as f:
    json.dump(failed, f)

print("\nEXTRACTION COMPLETE")
print("Games processed:", len(completed))
print("Failed games:", len(failed))
print("Output:", OUTPUT)
