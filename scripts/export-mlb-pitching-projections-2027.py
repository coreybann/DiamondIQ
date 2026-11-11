"""Export DiamondIQ's experimental 2027 MLB pitching projections."""

import importlib.util
import json
from pathlib import Path

import numpy as np
import pandas as pd

MODEL_PATH = Path("scripts/mlb-comprehensive-pitching-model.py")

CSV_TARGET = Path(
    "data/projections/mlb-pitching-projections-2027-experimental.csv"
)

JSON_TARGET = Path(
    "public/data/mlb-pitching-projections-2027-experimental.json"
)

EXPECTED_PITCHERS = 812

if not MODEL_PATH.exists():
    raise SystemExit(f"STOP: Missing model: {MODEL_PATH}")

if CSV_TARGET.exists() or JSON_TARGET.exists():
    raise SystemExit(
        "STOP: Pitching export already exists. "
        "Existing files will not be overwritten."
    )

spec = importlib.util.spec_from_file_location(
    "diamondiq_pitching_model",
    MODEL_PATH
)

model_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model_module)

history = model_module.load_pitching_history()
current = model_module.classify_projection_methods(history)

return_model, _ = model_module.train_return_model(history)

current["return_probability"] = (
    model_module.predict_return_probabilities(
        return_model, current
    )
)

innings_model, _ = model_module.train_innings_model(history)

current["projected_ip"] = model_module.predict_innings(
    innings_model, current
)

if (
    current["return_probability"].isna().any()
    or not np.isfinite(current["return_probability"]).all()
    or (current["return_probability"] <= 0).any()
    or (current["return_probability"] > 1).any()
):
    raise SystemExit("STOP: Invalid return probabilities.")

current["conditional_ip"] = (
    current["projected_ip"] / current["return_probability"]
)

qualifying = (
    current["projection_method"] == "full_rate_model"
)

models = [
    ("k9", model_module.train_k9_model, model_module.predict_k9),
    ("bb9", model_module.train_bb9_model, model_module.predict_bb9),
    ("hr9", model_module.train_hr9_model, model_module.predict_hr9),
    ("h9", model_module.train_h9_model, model_module.predict_h9),
    ("era", model_module.train_era_model, model_module.predict_era),
]

rate_columns = []

for stat, train, predict in models:
    fitted, _ = train(history)

    column = f"projected_{stat}"
    rate_columns.append(column)

    current[column] = np.nan

    current.loc[qualifying, column] = predict(
        fitted,
        current.loc[qualifying]
    )

fallbacks = [
    (
        "experienced_fallback",
        model_module.project_experienced_fallback,
    ),
    (
        "inexperienced_fallback",
        model_module.project_inexperienced_fallback,
    ),
]

for method, projector in fallbacks:
    mask = current["projection_method"] == method

    predictions = projector(
        history,
        current.loc[mask].copy()
    ).set_index("player_id")

    for column in rate_columns:
        current.loc[mask, column] = (
            current.loc[mask, "player_id"]
            .map(predictions[column])
            .to_numpy()
        )

current = model_module.calculate_pitching_counting_stats(
    current
)

columns = [
    "player_id",
    "player_name",
    "projection_method",
    "return_probability",
    "projected_ip",
    "conditional_ip",
    "projected_k9",
    "projected_bb9",
    "projected_hr9",
    "projected_h9",
    "projected_era",
    "projected_whip",
    "projected_so",
    "projected_bb",
    "projected_hr",
    "projected_hits",
    "projected_er",
]

if len(current) != EXPECTED_PITCHERS:
    raise SystemExit("STOP: Unexpected pitcher count.")

if current["player_id"].duplicated().any():
    raise SystemExit("STOP: Duplicate pitcher IDs.")

if current["player_id"].isna().any():
    raise SystemExit("STOP: Missing pitcher IDs.")

if current["player_name"].isna().any():
    raise SystemExit("STOP: Missing pitcher names.")

numeric_columns = columns[3:]

for column in numeric_columns:
    values = current[column]

    if (
        values.isna().any()
        or not np.isfinite(values).all()
        or (values < 0).any()
    ):
        raise SystemExit(
            f"STOP: Invalid values in {column}"
        )

if not np.allclose(
    current["projected_ip"],
    current["conditional_ip"] * current["return_probability"],
):
    raise SystemExit("STOP: Conditional innings inconsistency.")

if not np.allclose(
    current["projected_whip"],
    (current["projected_h9"] + current["projected_bb9"]) / 9,
):
    raise SystemExit("STOP: WHIP inconsistency.")

export = current[columns].copy()
export.insert(2, "projection_season", 2027)

export = export.sort_values(
    ["player_name", "player_id"]
).reset_index(drop=True)

records = json.loads(
    export.to_json(
        orient="records",
        double_precision=10
    )
)

payload = {
    "season": 2027,
    "status": "experimental",
    "description": (
        "DiamondIQ 2027 MLB pitching projections "
        "for pitchers appearing in the 2026 MLB dataset."
    ),
    "count": len(records),
    "innings_basis": (
        "projected_ip is unconditional expected MLB innings; "
        "conditional_ip is projected_ip divided by "
        "return_probability."
    ),
    "counting_stats_basis": (
        "Expected counting statistics derived from "
        "unconditional projected innings and projected rates."
    ),
    "players": records,
}

CSV_TARGET.parent.mkdir(parents=True, exist_ok=True)
JSON_TARGET.parent.mkdir(parents=True, exist_ok=True)

export.to_csv(CSV_TARGET, index=False)

JSON_TARGET.write_text(
    json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
)

print("2027 MLB PITCHING EXPORT COMPLETE")
print("=" * 60)
print("Pitchers exported:", len(records))
print("CSV:", CSV_TARGET)
print("JSON:", JSON_TARGET)

print("\nProjection methods:")
print(export["projection_method"].value_counts().to_string())

print("\nSample projections:")
print(
    export.nlargest(10, "projected_so")[
        [
            "player_name",
            "projected_ip",
            "projected_so",
            "projected_era",
            "projected_whip",
        ]
    ].round(2).to_string(index=False)
)

print("\nPASS: All 812 pitching projections exported.")
