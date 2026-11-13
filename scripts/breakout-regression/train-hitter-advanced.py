"""
DiamondIQ — Breakout & Regression Predictor
Advanced hitter model: initial holdout evaluation.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

DATA = Path(
    "data/breakout-regression/hitter-year-to-year.csv"
)

df = pd.read_csv(DATA)

train = df[df["target_season"] <= 2025].copy()
test = df[df["target_season"] == 2026].copy()

assert len(train) == 543
assert len(test) == 263

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

model = make_pipeline(
    StandardScaler(),
    Ridge(alpha=10.0),
)

model.fit(train[FEATURES], train["OPS_next"])

predictions = model.predict(test[FEATURES])

mae = mean_absolute_error(test["OPS_next"], predictions)
rmse = np.sqrt(
    mean_squared_error(test["OPS_next"], predictions)
)

BASELINE_MAE = 0.0619
BASELINE_RMSE = 0.0782

print("=== DIAMONDIQ ADVANCED HITTER MODEL ===")
print("Training observations:", len(train))
print("Holdout observations:", len(test))
print("Features:", len(FEATURES))

print("\n=== 2026 HOLDOUT PERFORMANCE ===")
print(f"Advanced MAE:  {mae:.4f}")
print(f"Advanced RMSE: {rmse:.4f}")

print("\n=== COMPARISON WITH BASELINE ===")
print(f"Baseline MAE:  {BASELINE_MAE:.4f}")
print(f"Baseline RMSE: {BASELINE_RMSE:.4f}")
print(
    f"MAE improvement: "
    f"{(BASELINE_MAE - mae) / BASELINE_MAE * 100:.2f}%"
)
print(
    f"RMSE improvement: "
    f"{(BASELINE_RMSE - rmse) / BASELINE_RMSE * 100:.2f}%"
)

print("\n=== STANDARDIZED COEFFICIENTS ===")
coefficients = pd.Series(
    model.named_steps["ridge"].coef_,
    index=FEATURES,
).sort_values(ascending=False)

print(coefficients.round(4).to_string())
