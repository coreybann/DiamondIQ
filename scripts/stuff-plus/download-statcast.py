"""
DiamondIQ — Stuff+ Statcast Data Downloader.

Downloads pitch-level Statcast data for a specified date range.
Preserves raw data for reproducible model training.
"""

import argparse
from datetime import date
from pathlib import Path

from pybaseball import statcast


OUTPUT_DIR = Path("data/stuff-plus/raw")

REQUIRED_COLUMNS = [
    "game_date",
    "game_pk",
    "pitcher",
    "pitch_type",
    "release_speed",
    "release_spin_rate",
    "pfx_x",
    "pfx_z",
    "release_pos_x",
    "release_pos_z",
    "release_extension",
    "p_throws",
    "stand",
    "description",
    "delta_run_exp",
]


def download_statcast(start_date, end_date):
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    if start > end:
        raise ValueError("Start date cannot be after end date.")

    if end > date.today():
        raise ValueError("Cannot download future dates.")

    if (end - start).days > 6:
        raise ValueError(
            "Maximum download range is 7 days per request."
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = OUTPUT_DIR / (
        f"statcast_{start_date}_{end_date}.csv"
    )

    if output.exists():
        print(f"Dataset already exists: {output}")
        return

    print(f"Downloading Statcast: {start_date} to {end_date}")

    df = statcast(
        start_dt=start_date,
        end_dt=end_date,
    )

    if df.empty:
        raise ValueError("No Statcast pitches returned.")

    missing = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing required columns: {missing}"
        )

    # Preserve the complete Statcast dataset.
    df.to_csv(output, index=False)

    print(f"Pitches downloaded: {len(df):,}")
    print(f"Columns available: {len(df.columns)}")
    print(f"Saved: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)

    args = parser.parse_args()

    download_statcast(args.start, args.end)
