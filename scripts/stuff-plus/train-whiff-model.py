import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, log_loss, brier_score_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

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

WHIFFS = {
    "swinging_strike",
    "swinging_strike_blocked",
    "missed_bunt",
}

def load(year):
    df = pd.read_csv(
        f"data/stuff-plus/processed/stuff_plus_{year}.csv",
        usecols=FEATURES + ["description"],
        low_memory=False,
    )
    df["target"] = df["description"].isin(WHIFFS).astype(int)
    return df

train = pd.concat([load(2023), load(2024)], ignore_index=True)
valid = load(2025)

preprocessor = ColumnTransformer([
    ("numeric", "passthrough", NUMERIC),
    ("categorical", OrdinalEncoder(
        handle_unknown="use_encoded_value",
        unknown_value=-1
    ), CATEGORICAL),
])

model = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", HistGradientBoostingClassifier(
        max_iter=150,
        max_leaf_nodes=31,
        learning_rate=0.08,
        l2_regularization=10,
        random_state=42,
    )),
])

print("Training pitches:", f"{len(train):,}", flush=True)
print("Validation pitches:", f"{len(valid):,}", flush=True)
print("Training physical-feature model...", flush=True)

model.fit(train[FEATURES], train["target"])

pred = model.predict_proba(valid[FEATURES])[:, 1]

print("\nPHYSICAL-FEATURE MODEL — 2025 VALIDATION")
print("ROC AUC:", round(roc_auc_score(valid["target"], pred), 4))
print("Log loss:", round(log_loss(valid["target"], pred), 5))
print("Brier score:", round(brier_score_loss(valid["target"], pred), 5))
