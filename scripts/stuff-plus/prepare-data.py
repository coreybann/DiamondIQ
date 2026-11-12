from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/stuff-plus/raw"
PROCESSED = ROOT / "data/stuff-plus/processed"

PROCESSED.mkdir(parents=True, exist_ok=True)

PITCH_TYPES = {
    "FF", "SI", "SL", "CH", "FC",
    "ST", "CU", "FS", "KC", "SV",
}

KEYS = [
    "game_pk",
    "at_bat_number",
    "pitch_number",
]

FEATURES = [
    "release_speed",
    "release_spin_rate",
    "pfx_x",
    "pfx_z",
    "release_pos_x",
    "release_pos_z",
    "release_extension",
    "p_throws",
    "pitch_type",
]

TARGET = "delta_run_exp"

COLUMNS = KEYS + [
    "game_date",
    "pitcher",
    "stand",
    "balls",
    "strikes",
    "description",
] + FEATURES + [TARGET]


def prepare_season(year):
    files = sorted(RAW.glob(f"statcast_{year}-*.csv"))

    if not files:
        raise FileNotFoundError(
            f"No Statcast files found for {year}"
        )

    frames = []

    for file in files:
        frame = pd.read_csv(
            file,
            usecols=COLUMNS,
            low_memory=False,
        )
        frames.append(frame)

    df = pd.concat(frames, ignore_index=True)

    original = len(df)

    df = df.drop_duplicates(
        subset=KEYS,
        keep="first",
    )

    deduplicated = len(df)

    df = df[df["pitch_type"].isin(PITCH_TYPES)].copy()

    eligible = len(df)

    df = df.dropna(
        subset=FEATURES + [TARGET]
    ).copy()

    complete = len(df)

    df["season"] = year

    df = df.sort_values(
        ["game_date", "game_pk", "at_bat_number", "pitch_number"]
    ).reset_index(drop=True)

    output = PROCESSED / f"stuff_plus_{year}.csv"

    df.to_csv(output, index=False)

    print(f"\n{year}")
    print("Original records:", f"{original:,}")
    print("After deduplication:", f"{deduplicated:,}")
    print("Eligible pitch types:", f"{eligible:,}")
    print("Complete records:", f"{complete:,}")
    print("Saved:", output)

    return complete


def main():
    total = 0

    for year in range(2023, 2027):
        total += prepare_season(year)

    print("\n" + "=" * 45)
    print("STUFF+ PREPROCESSING COMPLETE")
    print("Total modeling records:", f"{total:,}")
    print("=" * 45)


if __name__ == "__main__":
    main()
