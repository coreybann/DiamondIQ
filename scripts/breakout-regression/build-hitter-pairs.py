"""
DiamondIQ — Breakout & Regression Predictor
Build consecutive-season MLB hitter training pairs.
"""

from pathlib import Path
import pandas as pd

INPUT = Path(
    "data/breakout-regression/hitter-seasons-2023-2026.csv"
)

OUTPUT = Path(
    "data/breakout-regression/hitter-year-to-year.csv"
)

MIN_PA = 200

FEATURES = [
    "PA",
    "AVG",
    "OBP",
    "SLG",
    "OPS",
    "BB_pct",
    "K_pct",
    "BBE",
    "avg_exit_velocity",
    "hard_hit_pct",
    "barrel_pct",
    "contact_xBA",
    "contact_xSLG",
]


def main():
    df = pd.read_csv(INPUT)

    pairs = []

    for season in (2023, 2024, 2025):
        current = df[df["season"] == season]
        following = df[df["season"] == season + 1]

        matched = current.merge(
            following[
                ["batter", "PA", "OPS"]
            ],
            on="batter",
            suffixes=("", "_next"),
            validate="one_to_one",
        )

        matched = matched[
            (matched["PA"] >= MIN_PA)
            & (matched["PA_next"] >= MIN_PA)
        ].copy()

        matched["target_season"] = season + 1
        matched["OPS_change"] = (
            matched["OPS_next"] - matched["OPS"]
        )

        pairs.append(
            matched[
                ["batter", "season", "target_season"]
                + FEATURES
                + ["PA_next", "OPS_next", "OPS_change"]
            ]
        )

        print(
            f"{season} → {season + 1}: "
            f"{len(matched)} hitters"
        )

    combined = pd.concat(pairs, ignore_index=True)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(OUTPUT, index=False)

    print(f"\nSaved: {OUTPUT}")
    print(f"Total observations: {len(combined)}")
    print(
        "Training observations:",
        len(combined[combined["target_season"] <= 2025])
    )
    print(
        "Holdout observations:",
        len(combined[combined["target_season"] == 2026])
    )


if __name__ == "__main__":
    main()
