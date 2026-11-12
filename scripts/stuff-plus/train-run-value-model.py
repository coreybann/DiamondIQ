from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/stuff-plus/processed"

NUMERIC = [
    "release_speed",
    "release_spin_rate",
    "pfx_x",
    "pfx_z",
    "release_pos_x",
    "release_pos_z",
    "release_extension",
]

CATEGORICAL = [
    "pitch_type",
    "p_throws",
]

FEATURES = NUMERIC + CATEGORICAL
TARGET = "delta_run_exp"

def load(year):
    return pd.read_csv(
        DATA / f"stuff_plus_{year}.csv",
        usecols=FEATURES + [TARGET],
    ).dropna(subset=FEATURES + [TARGET])

train = pd.concat(
    [load(2023), load(2024)],
    ignore_index=True,
)

valid = load(2025)

print("Training pitches:", f"{len(train):,}")
print("Validation pitches:", f"{len(valid):,}")

preprocessor = ColumnTransformer(
    [
        ("numeric", "passthrough", NUMERIC),
        (
            "categorical",
            OrdinalEncoder(
                handle_unknown="use_encoded_value",
                unknown_value=-1,
            ),
            CATEGORICAL,
        ),
    ]
)

model = Pipeline(
    [
        ("preprocessor", preprocessor),
        (
            "regressor",
            HistGradientBoostingRegressor(
                max_iter=150,
                max_leaf_nodes=31,
                learning_rate=0.05,
                l2_regularization=10,
                random_state=42,
            ),
        ),
    ]
)

print("Training physical run-value model...")

model.fit(train[FEATURES], train[TARGET])

pred = model.predict(valid[FEATURES])
actual = valid[TARGET]

print("\nPHYSICAL RUN-VALUE MODEL — 2025 VALIDATION")
print("MAE:", round(mean_absolute_error(actual, pred), 5))
print("RMSE:", round(np.sqrt(mean_squared_error(actual, pred)), 5))
print("R²:", round(r2_score(actual, pred), 5))

# Aggregate predicted and actual run value by pitcher.
pitchers = pd.read_csv(
    DATA / "stuff_plus_2025.csv",
    usecols=FEATURES + [TARGET, "pitcher"],
).dropna(subset=FEATURES + [TARGET])

if len(pitchers) != len(valid):
    raise ValueError("Validation rows do not align with pitcher IDs.")

results = pd.DataFrame({
    "pitcher": pitchers["pitcher"].to_numpy(),
    "predicted": pred,
    "actual": actual.to_numpy(),
})

summary = results.groupby("pitcher").agg(
    pitches=("actual", "size"),
    predicted_rv=("predicted", "mean"),
    actual_rv=("actual", "mean"),
)

qualified = summary[summary["pitches"] >= 500]

print("\\nPITCHER-LEVEL VALIDATION — MINIMUM 500 PITCHES")
print("Qualified pitchers:", len(qualified))
print(
    "Pearson correlation:",
    round(qualified["predicted_rv"].corr(qualified["actual_rv"]), 4),
)
print("\\nPredicted run-value distribution:")
print(qualified["predicted_rv"].describe().round(5).to_string())



# Year-to-year stability diagnostic.
# Note: 2024 is in-sample; 2025 is out-of-sample.
yearly = {}

for year in [2024, 2025]:
    df = pd.read_csv(
        DATA / f"stuff_plus_{year}.csv",
        usecols=FEATURES + [TARGET, "pitcher"],
    ).dropna(subset=FEATURES + [TARGET])

    predictions = model.predict(df[FEATURES])

    results = pd.DataFrame({
        "pitcher": df["pitcher"].to_numpy(),
        "predicted_rv": predictions,
    })

    summary = results.groupby("pitcher").agg(
        pitches=("predicted_rv", "size"),
        predicted_rv=("predicted_rv", "mean"),
    )

    yearly[year] = summary[summary["pitches"] >= 500][
        ["predicted_rv"]
    ].rename(columns={"predicted_rv": f"rv_{year}"})

comparison = yearly[2024].join(yearly[2025], how="inner")

print("\\nYEAR-TO-YEAR STABILITY — 2024 VS 2025")
print("Qualified pitchers:", len(comparison))
print(
    "Pearson correlation:",
    round(comparison["rv_2024"].corr(comparison["rv_2025"]), 4),
)

print("\\n2024 predicted run-value distribution:")
print(comparison["rv_2024"].describe().round(5).to_string())

print("\\n2025 predicted run-value distribution:")
print(comparison["rv_2025"].describe().round(5).to_string())


# Compare 2024 predicted pitch quality with actual 2025 results.
future = pd.read_csv(
    DATA / "stuff_plus_2025.csv",
    usecols=["pitcher", TARGET],
).dropna()

actual_2025 = future.groupby("pitcher").agg(
    pitches=(TARGET, "size"),
    actual_rv_2025=(TARGET, "mean"),
)

actual_2025 = actual_2025[
    actual_2025["pitches"] >= 500
]

comparison = yearly[2024].join(
    actual_2025[["actual_rv_2025"]],
    how="inner",
)

print("\nFUTURE PERFORMANCE VALIDATION")
print("Qualified pitchers:", len(comparison))
print(
    "2024 predicted vs 2025 actual correlation:",
    round(
        comparison["rv_2024"].corr(
            comparison["actual_rv_2025"]
        ),
        4,
    ),
)
