from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "data/stuff-plus/processed"

TRAIN_YEARS = [2023, 2024]
CONTEXT = ["balls", "strikes", "stand"]
TARGET = "delta_run_exp"

train = pd.concat(
    [
        pd.read_csv(
            PROCESSED / f"stuff_plus_{year}.csv",
            usecols=CONTEXT + [TARGET],
        )
        for year in TRAIN_YEARS
    ],
    ignore_index=True,
)

context_means = (
    train.groupby(CONTEXT)[TARGET]
    .agg(["mean", "count"])
    .reset_index()
)

overall_mean = train[TARGET].mean()

print("CONTEXT-ADJUSTED RUN VALUE BASELINE")
print("Training pitches:", f"{len(train):,}")
print("Overall mean run value:", round(overall_mean, 5))
print("\nExpected run value by count and batter handedness:")
print(context_means.to_string(index=False))

print("\nContext groups:", len(context_means))
print("Minimum group size:", context_means["count"].min())
print("Maximum group size:", context_means["count"].max())
