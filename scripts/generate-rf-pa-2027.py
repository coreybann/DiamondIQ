import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

TRAIN = "data/projections/mlb-comprehensive-hitting-training.csv"
INPUT = "data/projections/mlb-hitting-inputs-2027.csv"
ORIGINAL = "data/projections/mlb-hitting-projections-2027-experimental.csv"
OUTPUT = "data/projections/mlb-rf-pa-comparison-2027-experimental.csv"

features = [
    "target_age",
    "prior_seasons_available",
    "lag1_plateAppearances",
    "lag2_plateAppearances",
    "lag3_plateAppearances",
    "lag1_gamesPlayed",
    "lag2_gamesPlayed",
    "lag3_gamesPlayed",
]

train = pd.read_csv(TRAIN)
future = pd.read_csv(INPUT)
original = pd.read_csv(ORIGINAL)

# Derive each player's age in 2027 from historical records.
history = pd.read_csv("data/projections/mlb-hitting-history.csv")
history = history.sort_values("season").drop_duplicates(
    "player_id", keep="last"
)
history["target_age"] = (
    pd.to_numeric(history["age"], errors="coerce")
    + (2027 - pd.to_numeric(history["season"], errors="coerce"))
)

future = future.merge(
    history[["player_id", "target_age"]],
    on="player_id",
    how="left",
    validate="one_to_one"
)

print("Missing 2027 ages:", future["target_age"].isna().sum())

# Normalize 2020 lagged PA and games played.
for lag in (1, 2, 3):
    col_year = train["target_season"] - lag

    for stat in ("plateAppearances", "gamesPlayed"):
        col = f"lag{lag}_{stat}"
        train[col] = pd.to_numeric(
            train[col], errors="coerce"
        ).astype(float)
        future[col] = pd.to_numeric(
            future[col], errors="coerce"
        ).astype(float)

        train.loc[col_year == 2020, col] *= 162 / 60

# Normalize 2020 training targets.
train["target_pa_adjusted"] = pd.to_numeric(
    train["target_plateAppearances"], errors="coerce"
).astype(float)

train.loc[
    train["target_season"] == 2020,
    "target_pa_adjusted"
] *= 162 / 60

train = train[
    train["lag1_plateAppearances"].notna()
    & train["target_pa_adjusted"].notna()
].copy()

# Match the tested Random Forest configuration.
model = RandomForestRegressor(
    n_estimators=300,
    min_samples_leaf=8,
    max_features=0.8,
    random_state=42,
    n_jobs=-1,
)

model.fit(
    train[features].fillna(0),
    train["target_pa_adjusted"]
)

# Future inputs must contain the same predictors.
missing = [c for c in features if c not in future.columns]
if missing:
    raise ValueError(f"Missing 2027 predictors: {missing}")

future["rf_conditional_PA_2027"] = np.clip(
    model.predict(future[features].fillna(0)),
    0,
    750
)

comparison = original.merge(
    future[["player_id", "rf_conditional_PA_2027"]],
    on="player_id",
    how="left",
    validate="one_to_one"
)

if comparison["rf_conditional_PA_2027"].isna().any():
    raise ValueError("Missing Random Forest predictions")

comparison["rf_expected_PA_2027"] = (
    comparison["rf_conditional_PA_2027"]
    * comparison["return_probability_2027"]
)

comparison["rf_conditional_PA_change"] = (
    comparison["rf_conditional_PA_2027"]
    - comparison["conditional_PA_2027"]
)

comparison.to_csv(OUTPUT, index=False)

print("2027 RANDOM FOREST PA COMPARISON")
print("=" * 65)
print("Training rows:", len(train))
print("Projected hitters:", len(comparison))

print("\nAARON JUDGE")
print(
    comparison.loc[
        comparison["player_name"] == "Aaron Judge",
        [
            "conditional_PA_2027",
            "rf_conditional_PA_2027",
            "expected_PA_2027",
            "rf_expected_PA_2027",
        ]
    ].round(1).to_string(index=False)
)

print("\nTOP 10 INCREASES")
print(
    comparison.nlargest(10, "rf_conditional_PA_change")[
        ["player_name", "rf_conditional_PA_change"]
    ].round(1).to_string(index=False)
)

print("\nTOP 10 DECREASES")
print(
    comparison.nsmallest(10, "rf_conditional_PA_change")[
        ["player_name", "rf_conditional_PA_change"]
    ].round(1).to_string(index=False)
)

print("\nSaved:", OUTPUT)
