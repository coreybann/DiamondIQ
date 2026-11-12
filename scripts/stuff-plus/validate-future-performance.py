from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
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

CATEGORICAL = ["pitch_type", "p_throws"]
FEATURES = NUMERIC + CATEGORICAL
TARGET = "delta_run_exp"

def load(year):
    return pd.read_csv(
        DATA / f"stuff_plus_{year}.csv",
        usecols=FEATURES + [TARGET, "pitcher"],
    ).dropna(subset=FEATURES + [TARGET, "pitcher"])

train = load(2023)
season_2024 = load(2024)
season_2025 = load(2025)

print("Training pitches:", f"{len(train):,}")
print("2024 pitches:", f"{len(season_2024):,}")
print("2025 pitches:", f"{len(season_2025):,}")

preprocessor = ColumnTransformer([
    ("numeric", "passthrough", NUMERIC),
    (
        "categorical",
        OrdinalEncoder(
            handle_unknown="use_encoded_value",
            unknown_value=-1,
        ),
        CATEGORICAL,
    ),
])

model = Pipeline([
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
])

print("Training physical model on 2023 only...")
model.fit(train[FEATURES], train[TARGET])

season_2024["physical_prediction"] = model.predict(
    season_2024[FEATURES]
)

type_means = train.groupby("pitch_type")[TARGET].mean()
overall_mean = train[TARGET].mean()

season_2024["baseline_prediction"] = (
    season_2024["pitch_type"]
    .map(type_means)
    .fillna(overall_mean)
)

predicted = season_2024.groupby("pitcher").agg(
    pitches_2024=(TARGET, "size"),
    physical=("physical_prediction", "mean"),
    baseline=("baseline_prediction", "mean"),
    actual_2024=(TARGET, "mean"),
)

actual = season_2025.groupby("pitcher").agg(
    pitches_2025=(TARGET, "size"),
    actual_2025=(TARGET, "mean"),
)

comparison = predicted.join(actual, how="inner")

comparison = comparison[
    (comparison["pitches_2024"] >= 500)
    & (comparison["pitches_2025"] >= 500)
]

print("\nFAIR FUTURE-PERFORMANCE COMPARISON")
print("Qualified pitchers:", len(comparison))

for name in ["actual_2024", "baseline", "physical"]:
    correlation = comparison[name].corr(
        comparison["actual_2025"]
    )
    print(f"{name.title()} correlation: {correlation:.4f}")

print("\nPrediction distributions:")
print(
    comparison[["baseline", "physical"]]
    .describe()
    .round(5)
    .to_string()
)


# Exploratory equal-weight combination.
# Standardization is performed across the 2024 predictor values.
physical_std = comparison["physical"].std()
actual_std = comparison["actual_2024"].std()

if physical_std <= 0 or actual_std <= 0:
    raise ValueError("Predictor has zero variance.")

physical_z = (
    comparison["physical"] - comparison["physical"].mean()
) / physical_std

actual_z = (
    comparison["actual_2024"] - comparison["actual_2024"].mean()
) / actual_std

comparison["combined"] = (physical_z + actual_z) / 2

print("\\nCOMBINED PREDICTOR DIAGNOSTIC")
print(
    "Physical vs actual 2024 correlation:",
    round(
        comparison["physical"].corr(
            comparison["actual_2024"]
        ),
        4,
    ),
)
print(
    "Combined vs 2025 actual correlation:",
    round(
        comparison["combined"].corr(
            comparison["actual_2025"]
        ),
        4,
    ),
)


# Examine predicted run value by pitch type.
pitch_type_summary = (
    season_2024.groupby("pitch_type")
    .agg(
        pitches=("physical_prediction", "size"),
        predicted_rv=("physical_prediction", "mean"),
        actual_rv=(TARGET, "mean"),
    )
    .sort_values("predicted_rv")
)

print("\\nPITCH-TYPE QUALITY DIAGNOSTIC — 2024")
print(pitch_type_summary.round(5).to_string())


# Examine variation in predicted quality within each pitch type.
variation = season_2024.groupby("pitch_type")[
    "physical_prediction"
].agg(
    pitches="size",
    mean="mean",
    std="std",
    p10=lambda x: x.quantile(0.10),
    p90=lambda x: x.quantile(0.90),
)

variation["p10_p90_range"] = variation["p90"] - variation["p10"]

print("\\nWITHIN-PITCH-TYPE VARIATION — 2024")
print(
    variation.sort_values("p10_p90_range", ascending=False)
    .round(5)
    .to_string()
)


# Validate predicted pitch quality within each pitch type.
# Lower predicted and actual run values favor the pitcher.
validation = season_2024[
    ["pitch_type", "physical_prediction", TARGET]
].copy()

validation["quality_group"] = (
    validation.groupby("pitch_type")["physical_prediction"]
    .transform(
        lambda x: pd.qcut(
            x.rank(method="first"),
            q=5,
            labels=False,
        )
    )
)

summary = (
    validation.groupby(["pitch_type", "quality_group"])
    .agg(
        pitches=(TARGET, "size"),
        predicted_rv=("physical_prediction", "mean"),
        actual_rv=(TARGET, "mean"),
    )
    .reset_index()
)

summary["quality_group"] += 1

print("\nWITHIN-TYPE OUTCOME VALIDATION — 2024")
print("Group 1 = best predicted quality")
print("Group 5 = worst predicted quality")
print(summary.round(5).to_string(index=False))


# Compare actual outcomes of best- and worst-rated pitches.
separation = summary.pivot(
    index="pitch_type",
    columns="quality_group",
    values="actual_rv",
)

separation["best_group_rv"] = separation[1]
separation["worst_group_rv"] = separation[5]
separation["actual_separation"] = (
    separation["worst_group_rv"] - separation["best_group_rv"]
)

results = separation[
    ["best_group_rv", "worst_group_rv", "actual_separation"]
].sort_values("actual_separation", ascending=False)

print("\nPITCH-TYPE SEPARATION SUMMARY — 2024")
print("Positive separation = correct ranking direction")
print(results.round(5).to_string())

print(
    "\nPitch types with positive separation:",
    int((results["actual_separation"] > 0).sum()),
    "of",
    len(results),
)


# Validate knuckle-curve predictions at the pitcher level.
kc = season_2024[
    season_2024["pitch_type"] == "KC"
].copy()

kc_pitchers = (
    kc.groupby("pitcher")
    .agg(
        pitches=(TARGET, "size"),
        predicted_rv=("physical_prediction", "mean"),
        actual_rv=(TARGET, "mean"),
    )
)

kc_qualified = kc_pitchers[
    kc_pitchers["pitches"] >= 100
].copy()

print("\nKNUCKLE-CURVE PITCHER VALIDATION — 2024")
print("Qualified pitchers:", len(kc_qualified))

if len(kc_qualified) >= 3:
    print(
        "Predicted vs actual correlation:",
        round(
            kc_qualified["predicted_rv"].corr(
                kc_qualified["actual_rv"]
            ),
            4,
        ),
    )

print("\nTOP 10 BY KC USAGE")
print(
    kc_qualified.sort_values(
        "pitches", ascending=False
    ).head(10).round(5).to_string()
)


# Evaluate pitcher-level prediction accuracy for every pitch type.
pitcher_types = (
    season_2024.groupby(["pitch_type", "pitcher"])
    .agg(
        pitches=(TARGET, "size"),
        predicted_rv=("physical_prediction", "mean"),
        actual_rv=(TARGET, "mean"),
    )
    .reset_index()
)

pitcher_types = pitcher_types[
    pitcher_types["pitches"] >= 100
].copy()

rows = []

for pitch_type, group in pitcher_types.groupby("pitch_type"):
    correlation = (
        group["predicted_rv"].corr(group["actual_rv"])
        if len(group) >= 3
        else float("nan")
    )

    rows.append({
        "pitch_type": pitch_type,
        "qualified_pitchers": len(group),
        "total_pitches": int(group["pitches"].sum()),
        "correlation": correlation,
    })

robustness = (
    pd.DataFrame(rows)
    .sort_values("correlation", ascending=False)
)

print("\nALL-PITCH-TYPE PITCHER VALIDATION — 2024")
print("Minimum 100 pitches per pitcher per pitch type")
print(robustness.round(4).to_string(index=False))


# Examine the distribution before constructing Stuff+ ratings.
predictions = season_2024["physical_prediction"]

print("\nSTUFF PLUS SCALE DIAGNOSTIC — 2024")
print("Pitches:", len(predictions))
print("Mean predicted RV:", round(predictions.mean(), 6))
print("Standard deviation:", round(predictions.std(), 6))

print("\nPREDICTED RUN VALUE PERCENTILES")
print(
    predictions.quantile(
        [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]
    ).round(6).to_string()
)


# Provisional 100-centered Stuff+ ratings.
# These reference values come from the 2024 diagnostic.
REFERENCE_MEAN = -0.000334
REFERENCE_STD = 0.004563

season_2024["stuff_plus"] = (
    100
    - 10 * (
        (season_2024["physical_prediction"] - REFERENCE_MEAN)
        / REFERENCE_STD
    )
)

pitcher_ratings = (
    season_2024.groupby("pitcher")
    .agg(
        pitches=("stuff_plus", "size"),
        stuff_plus=("stuff_plus", "mean"),
    )
)

qualified_ratings = pitcher_ratings[
    pitcher_ratings["pitches"] >= 500
].copy()

print("\\nPITCHER STUFF PLUS DIAGNOSTIC — 2024")
print("Qualified pitchers:", len(qualified_ratings))

print("\\nRATING DISTRIBUTION")
print(
    qualified_ratings["stuff_plus"]
    .describe()
    .round(2)
    .to_string()
)

print("\\nTOP 10 PITCHERS BY STUFF+")
print(
    qualified_ratings.sort_values(
        "stuff_plus", ascending=False
    ).head(10).round(2).to_string()
)

print("\\nBOTTOM 10 PITCHERS BY STUFF+")
print(
    qualified_ratings.sort_values(
        "stuff_plus", ascending=True
    ).head(10).round(2).to_string()
)


# Compare provisional Stuff+ averages across pitch types.
type_ratings = (
    season_2024.groupby("pitch_type")
    .agg(
        pitches=("stuff_plus", "size"),
        average_stuff_plus=("stuff_plus", "mean"),
        std_stuff_plus=("stuff_plus", "std"),
    )
    .sort_values("average_stuff_plus", ascending=False)
)

print("\nPITCH-TYPE STUFF PLUS AVERAGES — 2024")
print(type_ratings.round(2).to_string())


# Examine a fixed reference based on the training season.
training_predictions = model.predict(train[FEATURES])

print("\nTRAINING-SEASON SCALE REFERENCE — 2023")
print("Pitches:", len(training_predictions))
print("Mean predicted RV:", round(training_predictions.mean(), 6))
print("Standard deviation:", round(training_predictions.std(), 6))

print("\n2024 COMPARISON")
print("2024 mean predicted RV:", round(season_2024["physical_prediction"].mean(), 6))
print("2024 standard deviation:", round(season_2024["physical_prediction"].std(), 6))
