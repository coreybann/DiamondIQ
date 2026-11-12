"""Generate provisional DiamondIQ Stuff+ leaderboards."""

from pathlib import Path
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

from stuff_plus_scoring import calculate_stuff_plus

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/stuff-plus/processed"
OUTPUT = ROOT / "data/stuff-plus/leaderboards"

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

print("Training Stuff+ model on 2023...")
model.fit(train[FEATURES], train[TARGET])

OUTPUT.mkdir(parents=True, exist_ok=True)

for year in [2026]:
    df = load(year).copy()

    df["predicted_rv"] = model.predict(df[FEATURES])
    df["stuff_plus"] = calculate_stuff_plus(
        df["predicted_rv"]
    )

    pitchers = (
        df.groupby("pitcher")
        .agg(
            pitches=("stuff_plus", "size"),
            predicted_rv=("predicted_rv", "mean"),
            stuff_plus=("stuff_plus", "mean"),
        )
        .reset_index()
    )

    pitchers = pitchers[pitchers["pitches"] >= 500]
    pitchers = pitchers.sort_values(
        "stuff_plus", ascending=False
    )

    pitch_types = (
        df.groupby(["pitcher", "pitch_type"])
        .agg(
            pitches=("stuff_plus", "size"),
            predicted_rv=("predicted_rv", "mean"),
            stuff_plus=("stuff_plus", "mean"),
        )
        .reset_index()
    )

    pitch_types = pitch_types[
        pitch_types["pitches"] >= 100
    ]
    pitch_types = pitch_types.sort_values(
        "stuff_plus", ascending=False
    )

    pitcher_path = OUTPUT / f"pitcher_stuff_plus_{year}.csv"
    type_path = OUTPUT / f"pitch_type_stuff_plus_{year}.csv"

    pitchers.to_csv(pitcher_path, index=False)
    pitch_types.to_csv(type_path, index=False)

    print(f"\\n{year} RESULTS")
    print("Qualified pitchers:", len(pitchers))
    print("Qualified pitcher-pitch types:", len(pitch_types))
    print("Pitcher leaderboard:", pitcher_path)
    print("Pitch-type leaderboard:", type_path)

print("\\nStuff+ leaderboard generation complete.")
