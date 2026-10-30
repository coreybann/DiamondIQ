import requests
import pandas as pd
import time
import json
import os

INPUT = "data/statcast/statcast_2025.csv"
OUTPUT = "data/statcast/runner-advancement-2025-v2.csv"
PROGRESS = "data/statcast/runner-advancement-v2-progress.json"

df = pd.read_csv(
    INPUT,
    usecols=[
        "game_pk",
        "at_bat_number",
        "events",
        "on_1b",
        "on_2b",
        "on_3b",
        "outs_when_up"
    ],
    low_memory=False
)

# Keep only singles and doubles.
hit_data = df[
    df["events"].isin(["single", "double"])
].copy()

# Look up each hit using game ID and plate appearance number.
hit_lookup = {}

for row in hit_data.itertuples(index=False):
    key = (int(row.game_pk), int(row.at_bat_number))

    hit_lookup[key] = {
        "on_1b": row.on_1b,
        "on_2b": row.on_2b,
        "on_3b": row.on_3b,
        "outs_before": row.outs_when_up
    }

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

    matchup = play.get("matchup", {})
    batter_id = matchup.get("batter", {}).get("id")

    hit_indices = [
        i for i, play_event in enumerate(play.get("playEvents", []))
        if play_event.get("details", {}).get("isInPlay")
    ]

    if not hit_indices:
        return []

    hit_index = hit_indices[-1]

    for runner in play.get("runners", []):
        details = runner.get("details", {})
        movement = runner.get("movement", {})
        runner_info = details.get("runner", {})
        runner_id = runner_info.get("id")

        if runner_id is None or runner_id == batter_id:
            continue

        if details.get("playIndex") != hit_index:
            continue

        start = movement.get("start")
        end = movement.get("end")

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
                current["is_out"] or bool(movement.get("isOut"))
            )

            if movement.get("outBase"):
                current["out_base"] = movement["outBase"]

            current["scored"] = (
                current["scored"] or bool(details.get("isScoringEvent"))
            )
    about = play.get("about", {})

    at_bat_index = about.get("atBatIndex")

    if at_bat_index is None:
        return []

    key = (int(game_id), int(at_bat_index) + 1)
    hit = hit_lookup.get(key)

    if hit is None:
        return []

    bases = {
        "1B": hit["on_1b"],
        "2B": hit["on_2b"],
        "3B": hit["on_3b"]
    }

    initial_bases = [
        base for base, runner_id in bases.items()
        if pd.notna(runner_id)
    ]

    valid_movements = {}

    for runner_id, movement in movements.items():
        actual_base = next(
            (
                base for base, occupant in bases.items()
                if pd.notna(occupant)
                and int(occupant) == int(runner_id)
            ),
            None
        )

        if actual_base is None:
            continue

        movement["start"] = actual_base
        valid_movements[runner_id] = movement

    movements = valid_movements

    output = []

    for runner in movements.values():
        output.append({
            "game_id": game_id,
            "at_bat_index": about.get("atBatIndex"),
            "inning": about.get("inning"),
            "half_inning": about.get("halfInning"),
            "event": event,
            "outs_before": hit["outs_before"],
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
    "data/statcast/runner-advancement-v2-failures.json", "w"
) as f:
    json.dump(failed, f)

print("\nEXTRACTION COMPLETE")
print("Games processed:", len(completed))
print("Failed games:", len(failed))
print("Output:", OUTPUT)
