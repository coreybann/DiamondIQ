from pathlib import Path
import pandas as pd

SOURCE = Path("data/stuff-plus/processed")
OUTPUT = Path("public/data/stuff-plus")

OUTPUT.mkdir(parents=True, exist_ok=True)

columns = [
    "pitcher",
    "pitch_type",
    "release_speed",
    "release_spin_rate",
    "pfx_x",
    "pfx_z",
]

for year in [2024, 2025, 2026]:
    source_file = SOURCE / f"stuff_plus_{year}.csv"
    output_file = OUTPUT / f"arsenal_metrics_{year}.csv"

    df = pd.read_csv(source_file, usecols=columns)

    arsenal = (
        df.groupby(["pitcher", "pitch_type"])
        .agg(
            pitches=("release_speed", "size"),
            avg_velocity=("release_speed", "mean"),
            avg_spin=("release_spin_rate", "mean"),
            avg_h_break=("pfx_x", "mean"),
            avg_v_break=("pfx_z", "mean"),
        )
        .reset_index()
    )

    arsenal["avg_h_break"] *= 12
    arsenal["avg_v_break"] *= 12

    arsenal = arsenal.round({
        "avg_velocity": 1,
        "avg_spin": 0,
        "avg_h_break": 1,
        "avg_v_break": 1,
    })

    arsenal = arsenal.sort_values(
        ["pitcher", "pitches"],
        ascending=[True, False]
    )

    arsenal.to_csv(output_file, index=False)

    print(f"{year}: {len(arsenal):,} pitcher-pitch combinations")
    print(f"Saved: {output_file}")
    print(f"Size: {output_file.stat().st_size / 1024:.1f} KB")
    print()
