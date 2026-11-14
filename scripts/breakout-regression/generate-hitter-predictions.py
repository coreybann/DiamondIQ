"""
DiamondIQ — Experimental 2027 Hitter Breakout & Regression Predictions
"""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

BASE = Path("data/breakout-regression")
OUTPUT = BASE / "hitter-predictions-2027-experimental.csv"

FEATURES = [
    "OPS",
    "BB_pct",
    "K_pct",
    "avg_exit_velocity",
    "hard_hit_pct",
    "barrel_pct",
    "contact_xBA",
    "contact_xSLG",
]

training = pd.read_csv(BASE / "hitter-year-to-year.csv")
seasons = pd.read_csv(BASE / "hitter-seasons-2023-2026.csv")

training = training.dropna(subset=FEATURES + ["OPS_next"]).copy()

eligible = seasons[
    (seasons["season"] == 2026) &
    (seasons["PA"] >= 200)
].dropna(subset=FEATURES).copy()

assert len(training) == 806, "Unexpected training population"
assert len(eligible) == 361, "Unexpected prediction population"
assert eligible["batter"].is_unique, "Duplicate player IDs"

model = make_pipeline(
    StandardScaler(),
    Ridge(alpha=10.0),
)

model.fit(training[FEATURES], training["OPS_next"])

eligible["projected_OPS_2027"] = model.predict(
    eligible[FEATURES]
)

eligible["projected_OPS_change"] = (
    eligible["projected_OPS_2027"] - eligible["OPS"]
)

eligible["prediction"] = np.select(
    [
        eligible["projected_OPS_change"] >= 0.030,
        eligible["projected_OPS_change"] <= -0.030,
    ],
    [
        "Breakout",
        "Regression",
    ],
    default="Stable",
)

eligible["projection_season"] = 2027

columns = [
    "batter",
    "season",
    "projection_season",
    "PA",
    "OPS",
    "projected_OPS_2027",
    "projected_OPS_change",
    "prediction",
] + [feature for feature in FEATURES if feature != "OPS"]

results = eligible[columns].sort_values(
    "projected_OPS_change",
    ascending=False,
)

assert np.isfinite(
    results[["projected_OPS_2027", "projected_OPS_change"]]
    .to_numpy()
).all(), "Non-finite predictions"

results.to_csv(OUTPUT, index=False)

print("=== DIAMONDIQ 2027 HITTER PREDICTIONS ===")
print("Training observations:", len(training))
print("Eligible hitters:", len(results))
print("Output:", OUTPUT)

print("\\n=== PREDICTION DISTRIBUTION ===")
print(results["prediction"].value_counts().to_string())

print("\\n=== TOP 10 PROJECTED IMPROVEMENTS ===")
print(
    results[
        ["batter", "OPS", "projected_OPS_2027",
         "projected_OPS_change", "prediction"]
    ].head(10).round(3).to_string(index=False)
)

print("\\n=== TOP 10 PROJECTED DECLINES ===")
print(
    results[
        ["batter", "OPS", "projected_OPS_2027",
         "projected_OPS_change", "prediction"]
    ].tail(10).round(3).to_string(index=False)
)
