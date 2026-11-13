"""
DiamondIQ — Breakout & Regression Predictor
Initial hitter baseline evaluation.
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
assert train["target_season"].max() < test["target_season"].min()

y_train = train["OPS_next"]
y_test = test["OPS_next"]

# Baseline 1: Assume OPS stays unchanged.
no_change = test["OPS"].to_numpy()

# Baseline 2: Learn regression toward the mean.
model = make_pipeline(
    StandardScaler(),
    Ridge(alpha=10.0),
)

model.fit(train[["OPS"]], y_train)

regression_predictions = model.predict(test[["OPS"]])


def evaluate(name, predictions):
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))

    print(f"\n{name}")
    print(f"  MAE:  {mae:.4f}")
    print(f"  RMSE: {rmse:.4f}")


print("=== DIAMONDIQ HITTER BASELINE ===")
print("Training observations:", len(train))
print("Holdout observations:", len(test))

evaluate("No-change baseline", no_change)
evaluate("Regression-to-the-mean baseline", regression_predictions)

print("\nRegression model:")
print("Intercept:", round(model.named_steps["ridge"].intercept_, 4))
print(
    "Standardized OPS coefficient:",
    round(model.named_steps["ridge"].coef_[0], 4),
)
