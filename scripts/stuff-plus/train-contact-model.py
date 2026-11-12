from pathlib import Path
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/stuff-plus/raw"

KEYS = ["game_pk", "at_bat_number", "pitch_number"]

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

TARGET = "estimated_woba_using_speedangle"

PITCH_TYPES = {
    "FF", "SI", "SL", "CH", "FC",
    "ST", "CU", "FS", "KC", "SV",
}

def load(year):
    frames = []

    for file in sorted(RAW.glob(f"statcast_{year}-*.csv")):
        df = pd.read_csv(
            file,
            usecols=KEYS + FEATURES + ["description", TARGET],
            low_memory=False,
        )
        frames.append(df)

    df = pd.concat(frames, ignore_index=True)
    df = df.drop_duplicates(subset=KEYS)

    df = df[
        (df["description"] == "hit_into_play")
        & df["pitch_type"].isin(PITCH_TYPES)
    ].copy()

    df = df.dropna(subset=FEATURES + [TARGET])

    return df

train = pd.concat(
    [load(2023), load(2024)],
    ignore_index=True
)

valid = load(2025)

preprocessor = ColumnTransformer([
    ("numeric", "passthrough", NUMERIC),
    ("categorical", OrdinalEncoder(
        handle_unknown="use_encoded_value",
        unknown_value=-1,
    ), CATEGORICAL),
])

model = Pipeline([
    ("preprocessor", preprocessor),
    ("regressor", HistGradientBoostingRegressor(
        max_iter=150,
        max_leaf_nodes=31,
        learning_rate=0.05,
        l2_regularization=10,
        random_state=42,
    )),
])

print("Training balls in play:", f"{len(train):,}", flush=True)
print("Validation balls in play:", f"{len(valid):,}", flush=True)
print("Training contact-quality model...", flush=True)

model.fit(train[FEATURES], train[TARGET])

pred = model.predict(valid[FEATURES])

print("\nPHYSICAL CONTACT MODEL — 2025 VALIDATION")
print("MAE:", round(mean_absolute_error(valid[TARGET], pred), 5))
print("RMSE:", round(mean_squared_error(valid[TARGET], pred) ** 0.5, 5))
print("R²:", round(r2_score(valid[TARGET], pred), 5))
