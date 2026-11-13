"""
DiamondIQ — Breakout & Regression Predictor
Historical MLB hitter dataset builder.
"""

from pathlib import Path
import pandas as pd

RAW_DIR = Path("data/stuff-plus/raw")
OUTPUT_DIR = Path("data/breakout-regression")
OUTPUT_FILE = OUTPUT_DIR / "hitter-seasons-2023-2026.csv"

COLUMNS = [
    "game_type",
    "game_pk",
    "at_bat_number",
    "pitch_number",
    "batter",
    "events",
    "woba_value",
    "woba_denom",
    "launch_speed",
    "launch_speed_angle",
    "estimated_ba_using_speedangle",
    "estimated_slg_using_speedangle",
]

HITS = {"single", "double", "triple", "home_run"}
WALKS = {"walk", "intent_walk"}
STRIKEOUTS = {"strikeout", "strikeout_double_play"}

NON_AB = {
    "walk", "intent_walk", "hit_by_pitch",
    "sac_fly", "sac_fly_double_play",
    "sac_bunt", "catcher_interf", "truncated_pa",
}

NON_PA = {"truncated_pa"}


def build_season(season):
    files = sorted(RAW_DIR.glob(f"statcast_{season}-*.csv"))

    if not files:
        raise FileNotFoundError(f"No Statcast files for {season}")

    frames = []

    for path in files:
        df = pd.read_csv(
            path,
            usecols=COLUMNS,
            low_memory=False,
        )

        df = df[df["game_type"] == "R"]
        frames.append(df)

    df = pd.concat(frames, ignore_index=True)

    df = df.drop_duplicates(
        subset=["game_pk", "at_bat_number", "pitch_number"]
    )

    # One event per completed plate appearance.
    pa = df[df["events"].notna()].copy()
    pa = pa[~pa["events"].isin(NON_PA)]

    pa["PA"] = 1
    pa["AB"] = (~pa["events"].isin(NON_AB)).astype(int)
    pa["H"] = pa["events"].isin(HITS).astype(int)
    pa["BB"] = pa["events"].isin(WALKS).astype(int)
    pa["HBP"] = (pa["events"] == "hit_by_pitch").astype(int)
    pa["SO"] = pa["events"].isin(STRIKEOUTS).astype(int)
    pa["SF"] = pa["events"].isin(
        {"sac_fly", "sac_fly_double_play"}
    ).astype(int)

    pa["TB"] = pa["events"].map({
        "single": 1,
        "double": 2,
        "triple": 3,
        "home_run": 4,
    }).fillna(0)

    grouped = pa.groupby("batter").agg(
        PA=("PA", "sum"),
        AB=("AB", "sum"),
        H=("H", "sum"),
        BB=("BB", "sum"),
        HBP=("HBP", "sum"),
        SO=("SO", "sum"),
        SF=("SF", "sum"),
        TB=("TB", "sum"),
    ).reset_index()

    grouped["AVG"] = grouped["H"] / grouped["AB"].replace(0, float("nan"))

    grouped["OBP"] = (
        (grouped["H"] + grouped["BB"] + grouped["HBP"])
        / (
            grouped["AB"]
            + grouped["BB"]
            + grouped["HBP"]
            + grouped["SF"]
        ).replace(0, float("nan"))
    )

    grouped["SLG"] = grouped["TB"] / grouped["AB"].replace(0, float("nan"))
    grouped["OPS"] = grouped["OBP"] + grouped["SLG"]

    grouped["BB_pct"] = grouped["BB"] / grouped["PA"]
    grouped["K_pct"] = grouped["SO"] / grouped["PA"]

    # Advanced quality-of-contact metrics.
    bbe = df[df["launch_speed_angle"].notna()].copy()

    bbe["hard_hit"] = (
        bbe["launch_speed"] >= 95
    ).astype(int)

    bbe["barrel"] = (
        bbe["launch_speed_angle"] == 6
    ).astype(int)

    contact = bbe.groupby("batter").agg(
        BBE=("launch_speed", "count"),
        avg_exit_velocity=("launch_speed", "mean"),
        hard_hit_pct=("hard_hit", "mean"),
        barrel_pct=("barrel", "mean"),
        contact_xBA=(
            "estimated_ba_using_speedangle", "mean"
        ),
        contact_xSLG=(
            "estimated_slg_using_speedangle", "mean"
        ),
    ).reset_index()

    grouped = grouped.merge(
        contact,
        on="batter",
        how="left",
        validate="one_to_one",
    )

    grouped["season"] = season

    return grouped


def main():
    seasons = []

    for season in range(2023, 2027):
        print(f"Processing {season}...")
        season_df = build_season(season)
        seasons.append(season_df)

        print(
            f"  Hitters: {len(season_df):,} | "
            f"PA: {season_df['PA'].sum():,}"
        )

    combined = pd.concat(seasons, ignore_index=True)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    combined.to_csv(OUTPUT_FILE, index=False)

    print(f"\nSaved: {OUTPUT_FILE}")
    print(f"Player-seasons: {len(combined):,}")


if __name__ == "__main__":
    main()
