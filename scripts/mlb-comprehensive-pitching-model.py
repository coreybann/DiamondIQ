"""
DiamondIQ — 2027 MLB Pitching Projection Model.

Uses historical MLB pitching statistics to project eligible
2026 pitchers into the 2027 season.

Projection categories:
- Full rate model: 30+ IP in 2026
- Experienced fallback: <30 IP in 2026, prior 30+ IP season
- Inexperienced fallback: <30 IP in 2026, no prior 30+ IP season
"""

from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor


SOURCE = Path("data/projections/mlb-pitching-modeling.csv")
TARGET_SEASON = 2027
SOURCE_SEASON = TARGET_SEASON - 1

RATE_MIN_IP = 30


def load_pitching_history():
    """Load eligible MLB pitching seasons."""
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    df = pd.read_csv(SOURCE)

    df = df[df["pitcher_model_eligible"] == 1].copy()
    df["ip"] = df["outs"] / 3

    df = df.sort_values(["player_id", "season"])

    return df


def classify_projection_methods(df):
    """Assign exactly one projection method per eligible pitcher."""
    current = df[df["season"] == SOURCE_SEASON].copy()
    prior = df[df["season"] < SOURCE_SEASON]

    historical_qualified = set(
        prior.loc[
            prior["ip"] >= RATE_MIN_IP,
            "player_id"
        ]
    )

    def classify(row):
        if row["ip"] >= RATE_MIN_IP:
            return "full_rate_model"

        if row["player_id"] in historical_qualified:
            return "experienced_fallback"

        return "inexperienced_fallback"

    current["projection_method"] = current.apply(
        classify,
        axis=1
    )

    if current["player_id"].isna().any():
        raise ValueError("Missing pitcher IDs.")

    if current["player_id"].duplicated().any():
        raise ValueError("Duplicate pitcher IDs.")

    if current["projection_method"].isna().any():
        raise ValueError("Unassigned projection methods.")

    return current



RETURN_FEATURES = [
    "age",
    "previous_ip",
    "gamesPitched",
    "gamesStarted",
    "starter_share",
    "k_per_9",
    "bb_per_9",
    "hr_per_9",
    "strikePercentage",
]


def build_return_features(df):
    """Prepare features from each pitcher's observed season."""
    data = df.copy()

    data["previous_ip"] = data["ip"]

    data["starter_share"] = np.where(
        data["gamesPitched"] > 0,
        data["gamesStarted"] / data["gamesPitched"],
        0
    )

    for name, column in [
        ("k_per_9", "strikeOuts"),
        ("bb_per_9", "baseOnBalls"),
        ("hr_per_9", "homeRuns"),
    ]:
        data[name] = np.where(
            data["outs"] > 0,
            data[column] * 27 / data["outs"],
            0
        )

    return data


def train_return_model(df):
    """Train on historical next-season MLB pitching appearances."""
    data = build_return_features(df)

    next_seasons = data[
        ["player_id", "season"]
    ].copy()

    next_seasons["season"] -= 1
    next_seasons["returned"] = 1

    training = data[
        data["season"] < SOURCE_SEASON
    ].merge(
        next_seasons,
        on=["player_id", "season"],
        how="left",
        validate="one_to_one"
    )

    training["returned"] = (
        training["returned"].fillna(0).astype(int)
    )

    # Exclude transitions whose outcomes are unavailable.
    training = training[
        (training["season"] <= 2025) &
        (~training["season"].isin([2019, 2020]))
    ]

    X = training[RETURN_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    y = training["returned"]

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=20,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    return model, len(training)


def predict_return_probabilities(model, current):
    """Estimate probability of pitching in the next MLB season."""
    features = build_return_features(current)

    X = features[RETURN_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    probabilities = model.predict_proba(X)[:, 1]

    return probabilities


def train_innings_model(df):
    """Train next-season IP model, including zero-IP outcomes."""
    data = build_return_features(df)

    next_seasons = data[
        ["player_id", "season", "ip"]
    ].copy()

    next_seasons["season"] -= 1
    next_seasons = next_seasons.rename(
        columns={"ip": "next_ip"}
    )

    training = data[
        (data["season"] <= 2025) &
        (~data["season"].isin([2019, 2020]))
    ].merge(
        next_seasons,
        on=["player_id", "season"],
        how="left",
        validate="one_to_one"
    )

    training["next_ip"] = (
        training["next_ip"].fillna(0)
    )

    features = [
        "age",
        "previous_ip",
        "gamesPitched",
        "gamesStarted",
        "starter_share",
        "k_per_9",
        "bb_per_9",
        "hr_per_9",
        "strikePercentage",
    ]

    X = training[features].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    y = training["next_ip"]

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=10,
        min_samples_leaf=15,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    return model, len(training)


def predict_innings(model, current):
    """Predict unconditional next-season MLB innings."""
    features = build_return_features(current)

    X = features[RETURN_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    predictions = model.predict(X)

    return np.maximum(predictions, 0)


RATE_FEATURES = [
    "age",
    "ip",
    "gamesPitched",
    "gamesStarted",
    "starter_share",
    "k_per_9",
    "bb_per_9",
    "hr_per_9",
    "h_per_9",
    "strikePercentage",
]


def build_rate_features(df):
    """Prepare rate-model features from observed MLB seasons."""
    data = build_return_features(df)

    data["h_per_9"] = np.where(
        data["outs"] > 0,
        data["hits"] * 27 / data["outs"],
        0
    )

    return data


def train_k9_model(df):
    """Train K/9 on consecutive qualifying pitcher seasons."""
    data = build_rate_features(df)

    next_seasons = data[
        ["player_id", "season", "ip", "k_per_9"]
    ].copy()

    next_seasons["season"] -= 1
    next_seasons = next_seasons.rename(
        columns={
            "ip": "next_ip",
            "k_per_9": "next_k_per_9",
        }
    )

    training = data[
        (data["season"] <= 2025) &
        (data["ip"] >= RATE_MIN_IP)
    ].merge(
        next_seasons,
        on=["player_id", "season"],
        how="inner",
        validate="one_to_one"
    )

    training = training[
        training["next_ip"] >= RATE_MIN_IP
    ].copy()

    X = training[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    y = training["next_k_per_9"]

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=15,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    return model, len(training)


def predict_k9(model, current):
    """Predict K/9 for qualifying 2026 pitchers."""
    features = build_rate_features(current)

    X = features[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    return np.maximum(model.predict(X), 0)


def train_bb9_model(df):
    """Train BB/9 on consecutive qualifying pitcher seasons."""
    data = build_rate_features(df)

    next_seasons = data[
        ["player_id", "season", "ip", "bb_per_9"]
    ].copy()

    next_seasons["season"] -= 1
    next_seasons = next_seasons.rename(
        columns={
            "ip": "next_ip",
            "bb_per_9": "next_bb_per_9",
        }
    )

    training = data[
        (data["season"] <= 2025) &
        (data["ip"] >= RATE_MIN_IP)
    ].merge(
        next_seasons,
        on=["player_id", "season"],
        how="inner",
        validate="one_to_one"
    )

    training = training[
        training["next_ip"] >= RATE_MIN_IP
    ].copy()

    X = training[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    y = training["next_bb_per_9"]

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=15,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    return model, len(training)


def predict_bb9(model, current):
    """Predict BB/9 for qualifying 2026 pitchers."""
    features = build_rate_features(current)

    X = features[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    return np.maximum(model.predict(X), 0)


def train_hr9_model(df):
    """Train HR/9 on consecutive qualifying pitcher seasons."""
    data = build_rate_features(df)

    next_seasons = data[
        ["player_id", "season", "ip", "hr_per_9"]
    ].copy()

    next_seasons["season"] -= 1
    next_seasons = next_seasons.rename(
        columns={
            "ip": "next_ip",
            "hr_per_9": "next_hr_per_9",
        }
    )

    training = data[
        (data["season"] <= 2025) &
        (data["ip"] >= RATE_MIN_IP)
    ].merge(
        next_seasons,
        on=["player_id", "season"],
        how="inner",
        validate="one_to_one"
    )

    training = training[
        training["next_ip"] >= RATE_MIN_IP
    ].copy()

    X = training[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    y = training["next_hr_per_9"]

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=15,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    return model, len(training)


def predict_hr9(model, current):
    """Predict HR/9 for qualifying 2026 pitchers."""
    features = build_rate_features(current)

    X = features[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    return np.maximum(model.predict(X), 0)


def train_h9_model(df):
    """Train H/9 on consecutive qualifying pitcher seasons."""
    data = build_rate_features(df)

    next_seasons = data[
        ["player_id", "season", "ip", "h_per_9"]
    ].copy()

    next_seasons["season"] -= 1
    next_seasons = next_seasons.rename(
        columns={
            "ip": "next_ip",
            "h_per_9": "next_h_per_9",
        }
    )

    training = data[
        (data["season"] <= 2025) &
        (data["ip"] >= RATE_MIN_IP)
    ].merge(
        next_seasons,
        on=["player_id", "season"],
        how="inner",
        validate="one_to_one"
    )

    training = training[
        training["next_ip"] >= RATE_MIN_IP
    ].copy()

    X = training[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    y = training["next_h_per_9"]

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=15,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    return model, len(training)


def predict_h9(model, current):
    """Predict H/9 for qualifying 2026 pitchers."""
    features = build_rate_features(current)

    X = features[RATE_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    return np.maximum(model.predict(X), 0)


ERA_FEATURES = RATE_FEATURES + ["er_per_9"]


def build_era_features(df):
    """Prepare ERA features from observed MLB seasons."""
    data = build_rate_features(df)

    data["er_per_9"] = np.where(
        data["outs"] > 0,
        data["earnedRuns"] * 27 / data["outs"],
        0
    )

    return data


def train_era_model(df):
    """Train ERA on consecutive qualifying pitcher seasons."""
    data = build_era_features(df)

    next_seasons = data[
        ["player_id", "season", "ip", "er_per_9"]
    ].copy()

    next_seasons["season"] -= 1
    next_seasons = next_seasons.rename(
        columns={
            "ip": "next_ip",
            "er_per_9": "next_era",
        }
    )

    training = data[
        (data["season"] <= 2025) &
        (data["ip"] >= RATE_MIN_IP)
    ].merge(
        next_seasons,
        on=["player_id", "season"],
        how="inner",
        validate="one_to_one"
    )

    training = training[
        training["next_ip"] >= RATE_MIN_IP
    ].copy()

    X = training[ERA_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    y = training["next_era"]

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=15,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    return model, len(training)


def predict_era(model, current):
    """Predict ERA for qualifying 2026 pitchers."""
    features = build_era_features(current)

    X = features[ERA_FEATURES].replace(
        [np.inf, -np.inf], np.nan
    ).fillna(0)

    return np.maximum(model.predict(X), 0)


def historical_league_rates(df):
    """IP-weighted league baselines, excluding 2020."""
    history = df[
        (df["season"] < SOURCE_SEASON) &
        (df["season"] != 2020) &
        (df["ip"] >= RATE_MIN_IP)
    ]

    outs = history["outs"].sum()

    if outs <= 0:
        raise ValueError("No qualifying league innings.")

    return {
        "projected_k9": history["strikeOuts"].sum() * 27 / outs,
        "projected_bb9": history["baseOnBalls"].sum() * 27 / outs,
        "projected_hr9": history["homeRuns"].sum() * 27 / outs,
        "projected_h9": history["hits"].sum() * 27 / outs,
        "projected_era": history["earnedRuns"].sum() * 27 / outs,
    }


def project_experienced_fallback(df, current):
    """Project low-IP pitchers with previous qualifying seasons."""
    prior = df[
        (df["season"] < SOURCE_SEASON) &
        (df["ip"] >= RATE_MIN_IP)
    ].copy()

    latest = (
        prior.sort_values(["player_id", "season"])
        .drop_duplicates("player_id", keep="last")
    )

    historical = build_era_features(latest)

    columns = [
        "player_id",
        "season",
        "ip",
        "k_per_9",
        "bb_per_9",
        "h_per_9",
    ]

    previous = historical[columns].rename(
        columns={
            "season": "last_qualified_season",
            "ip": "last_qualified_ip",
            "k_per_9": "historical_k9",
            "bb_per_9": "historical_bb9",
            "h_per_9": "historical_h9",
        }
    )

    result = build_era_features(current).merge(
        previous,
        on="player_id",
        how="left",
        validate="one_to_one"
    )

    if result["last_qualified_season"].isna().any():
        raise ValueError("Missing historical qualifying season.")

    league = historical_league_rates(df)

    years_since = (
        SOURCE_SEASON - result["last_qualified_season"]
    )

    effective_ip = result["last_qualified_ip"].clip(
        upper=180
    )

    historical_weight = (
        effective_ip / (effective_ip + 100)
    ) * (0.75 ** (years_since - 1))

    current_weight = (
        result["ip"] / 100
    ).clip(upper=0.25)

    for stat, historical_column, current_column in [
        ("projected_k9", "historical_k9", "k_per_9"),
        ("projected_bb9", "historical_bb9", "bb_per_9"),
    ]:
        regressed = (
            historical_weight * result[historical_column] +
            (1 - historical_weight) * league[stat]
        )

        result[stat] = (
            (1 - current_weight) * regressed +
            current_weight * result[current_column]
        )

    result["projected_h9"] = (
        historical_weight * result["historical_h9"] +
        (1 - historical_weight) * league["projected_h9"]
    )

    result["projected_hr9"] = league["projected_hr9"]
    result["projected_era"] = league["projected_era"]

    return result[
        [
            "player_id",
            "projected_k9",
            "projected_bb9",
            "projected_hr9",
            "projected_h9",
            "projected_era",
        ]
    ]


def inexperienced_role(starts):
    """Assign a historical fallback baseline role."""
    if starts >= 2:
        return "starter"
    if starts == 0:
        return "reliever"
    return "mixed"


def inexperienced_league_rates(df):
    """Calculate role-specific historical MLB pitching baselines."""
    history = df[
        (df["season"] < SOURCE_SEASON) &
        (df["season"] != 2020) &
        (df["ip"] >= RATE_MIN_IP)
    ].copy()

    history["fallback_role"] = np.select(
        [
            history["gamesStarted"] >= 10,
            history["gamesStarted"] == 0,
        ],
        ["starter", "reliever"],
        default="mixed"
    )

    result = {}

    for role, group in history.groupby("fallback_role"):
        outs = group["outs"].sum()

        if outs <= 0:
            raise ValueError(f"No league innings for {role}")

        result[role] = {
            "projected_hr9":
                group["homeRuns"].sum() * 27 / outs,
            "projected_h9":
                group["hits"].sum() * 27 / outs,
            "projected_era":
                group["earnedRuns"].sum() * 27 / outs,
        }

    if set(result) != {"starter", "reliever", "mixed"}:
        raise ValueError("Missing league baseline role.")

    return result


def project_inexperienced_fallback(df, current):
    """Project pitchers without a qualifying MLB season."""
    league = historical_league_rates(df)
    role_league = inexperienced_league_rates(df)

    career = df[
        df["season"] <= SOURCE_SEASON
    ].groupby("player_id", as_index=False).agg(
        career_outs=("outs", "sum"),
        career_starts=("gamesStarted", "sum"),
        career_so=("strikeOuts", "sum"),
        career_bb=("baseOnBalls", "sum"),
    )

    result = current[
        ["player_id"]
    ].merge(
        career,
        on="player_id",
        how="left",
        validate="one_to_one"
    )

    if result[
        ["career_outs", "career_starts", "career_so", "career_bb"]
    ].isna().any().any():
        raise ValueError("Missing inexperienced career data.")

    career_ip = result["career_outs"] / 3

    weight = career_ip / (career_ip + 50)

    career_k9 = np.where(
        result["career_outs"] > 0,
        result["career_so"] * 27 /
        result["career_outs"].clip(lower=1),
        0
    )

    career_bb9 = np.where(
        result["career_outs"] > 0,
        result["career_bb"] * 27 /
        result["career_outs"].clip(lower=1),
        0
    )

    result["projected_k9"] = (
        weight * career_k9 +
        (1 - weight) * league["projected_k9"]
    )

    result["projected_bb9"] = (
        weight * career_bb9 +
        (1 - weight) * league["projected_bb9"]
    )

    result["fallback_role"] = result[
        "career_starts"
    ].apply(inexperienced_role)

    for column in [
        "projected_hr9",
        "projected_h9",
        "projected_era",
    ]:
        result[column] = result["fallback_role"].map(
            {
                role: rates[column]
                for role, rates in role_league.items()
            }
        )

    return result[
        [
            "player_id",
            "projected_k9",
            "projected_bb9",
            "projected_hr9",
            "projected_h9",
            "projected_era",
        ]
    ]


def calculate_pitching_counting_stats(current):
    """Calculate expected counting statistics and WHIP."""
    result = current.copy()

    rate_mapping = {
        "projected_so": "projected_k9",
        "projected_bb": "projected_bb9",
        "projected_hr": "projected_hr9",
        "projected_hits": "projected_h9",
        "projected_er": "projected_era",
    }

    for output, rate in rate_mapping.items():
        result[output] = (
            result["projected_ip"] * result[rate] / 9
        )

    result["projected_whip"] = (
        result["projected_h9"] +
        result["projected_bb9"]
    ) / 9

    return result

def main():
    df = load_pitching_history()
    current = classify_projection_methods(df)

    print("DiamondIQ — 2027 MLB Pitching Projections")
    print("=" * 60)

    print("\nHistorical eligible seasons:", len(df))
    print("Eligible 2026 pitchers:", len(current))

    print("\nProjection methods:")
    print(
        current["projection_method"]
        .value_counts()
        .to_string()
    )

    print("\nCoverage:", f"{len(current)}/{len(current)}")

    model, training_count = train_return_model(df)

    current["return_probability"] = (
        predict_return_probabilities(model, current)
    )

    print("\nReturn model training observations:", training_count)
    print(
        "Average projected return probability:",
        round(current["return_probability"].mean(), 4)
    )
    print(
        "Projected returning pitchers:",
        round(current["return_probability"].sum(), 1)
    )

    innings_model, innings_training_count = train_innings_model(df)

    current["projected_ip"] = predict_innings(
        innings_model,
        current
    )

    # Expected IP already incorporates the risk of not returning.
    # Conditional IP estimates workload assuming an MLB appearance.
    probabilities = current["return_probability"]

    if (
        probabilities.isna().any()
        or not np.isfinite(probabilities).all()
        or (probabilities <= 0).any()
        or (probabilities > 1).any()
    ):
        raise ValueError("Invalid return probabilities.")

    current["conditional_ip"] = (
        current["projected_ip"] / probabilities
    )

    if (
        current["conditional_ip"].isna().any()
        or not np.isfinite(current["conditional_ip"]).all()
        or (current["conditional_ip"] < 0).any()
    ):
        raise ValueError("Invalid conditional innings.")

    if not np.allclose(
        current["conditional_ip"] * probabilities,
        current["projected_ip"],
        rtol=1e-10,
        atol=1e-10
    ):
        raise ValueError("Conditional innings consistency failed.")

    print("\nInnings model training observations:",
          innings_training_count)

    print(
        "Average projected IP:",
        round(current["projected_ip"].mean(), 2)
    )

    print(
        "Total projected IP:",
        round(current["projected_ip"].sum(), 1)
    )

    print(
        "Average conditional IP:",
        round(current["conditional_ip"].mean(), 2)
    )

    print(
        "Maximum conditional IP:",
        round(current["conditional_ip"].max(), 2)
    )

    print(
        "Projected IP range:",
        round(current["projected_ip"].min(), 1),
        "to",
        round(current["projected_ip"].max(), 1)
    )

    if (
        not np.isfinite(current["projected_ip"]).all()
        or (current["projected_ip"] < 0).any()
    ):
        raise ValueError("Invalid innings projections.")

    k9_model, k9_training_count = train_k9_model(df)

    current["projected_k9"] = np.nan

    qualifying = (
        current["projection_method"] == "full_rate_model"
    )

    current.loc[qualifying, "projected_k9"] = predict_k9(
        k9_model,
        current.loc[qualifying]
    )

    print("\nK/9 model training observations:",
          k9_training_count)

    print(
        "Pitchers with K/9 predictions:",
        current["projected_k9"].notna().sum()
    )

    print(
        "Average projected K/9:",
        round(current["projected_k9"].mean(), 3)
    )

    print(
        "Projected K/9 range:",
        round(current["projected_k9"].min(), 3),
        "to",
        round(current["projected_k9"].max(), 3)
    )

    if current.loc[qualifying, "projected_k9"].isna().any():
        raise ValueError("Missing full-model K/9 predictions.")

    bb9_model, bb9_training_count = train_bb9_model(df)

    current["projected_bb9"] = np.nan

    current.loc[qualifying, "projected_bb9"] = predict_bb9(
        bb9_model,
        current.loc[qualifying]
    )

    print("\nBB/9 model training observations:",
          bb9_training_count)

    print(
        "Pitchers with BB/9 predictions:",
        current["projected_bb9"].notna().sum()
    )

    print(
        "Average projected BB/9:",
        round(current["projected_bb9"].mean(), 3)
    )

    print(
        "Projected BB/9 range:",
        round(current["projected_bb9"].min(), 3),
        "to",
        round(current["projected_bb9"].max(), 3)
    )

    if current.loc[qualifying, "projected_bb9"].isna().any():
        raise ValueError("Missing full-model BB/9 predictions.")

    hr9_model, hr9_training_count = train_hr9_model(df)

    current["projected_hr9"] = np.nan

    current.loc[qualifying, "projected_hr9"] = predict_hr9(
        hr9_model,
        current.loc[qualifying]
    )

    print("\nHR/9 model training observations:",
          hr9_training_count)

    print(
        "Pitchers with HR/9 predictions:",
        current["projected_hr9"].notna().sum()
    )

    print(
        "Average projected HR/9:",
        round(current["projected_hr9"].mean(), 3)
    )

    print(
        "Projected HR/9 range:",
        round(current["projected_hr9"].min(), 3),
        "to",
        round(current["projected_hr9"].max(), 3)
    )

    if current.loc[qualifying, "projected_hr9"].isna().any():
        raise ValueError("Missing full-model HR/9 predictions.")

    h9_model, h9_training_count = train_h9_model(df)

    current["projected_h9"] = np.nan

    current.loc[qualifying, "projected_h9"] = predict_h9(
        h9_model,
        current.loc[qualifying]
    )

    print("\nH/9 model training observations:",
          h9_training_count)

    print(
        "Pitchers with H/9 predictions:",
        current["projected_h9"].notna().sum()
    )

    print(
        "Average projected H/9:",
        round(current["projected_h9"].mean(), 3)
    )

    print(
        "Projected H/9 range:",
        round(current["projected_h9"].min(), 3),
        "to",
        round(current["projected_h9"].max(), 3)
    )

    if current.loc[qualifying, "projected_h9"].isna().any():
        raise ValueError("Missing full-model H/9 predictions.")

    era_model, era_training_count = train_era_model(df)

    current["projected_era"] = np.nan

    current.loc[qualifying, "projected_era"] = predict_era(
        era_model,
        current.loc[qualifying]
    )

    print("\nERA model training observations:",
          era_training_count)

    print(
        "Pitchers with ERA predictions:",
        current["projected_era"].notna().sum()
    )

    print(
        "Average projected ERA:",
        round(current["projected_era"].mean(), 3)
    )

    print(
        "Projected ERA range:",
        round(current["projected_era"].min(), 3),
        "to",
        round(current["projected_era"].max(), 3)
    )

    if current.loc[qualifying, "projected_era"].isna().any():
        raise ValueError("Missing full-model ERA predictions.")

    experienced_mask = (
        current["projection_method"] == "experienced_fallback"
    )

    experienced_predictions = project_experienced_fallback(
        df,
        current.loc[experienced_mask].copy()
    ).set_index("player_id")

    rate_columns = [
        "projected_k9",
        "projected_bb9",
        "projected_hr9",
        "projected_h9",
        "projected_era",
    ]

    for column in rate_columns:
        current.loc[experienced_mask, column] = (
            current.loc[experienced_mask, "player_id"]
            .map(experienced_predictions[column])
            .to_numpy()
        )

    print("\nExperienced fallback pitchers:",
          experienced_mask.sum())

    for column in rate_columns:
        values = current.loc[experienced_mask, column]

        print(
            column,
            "coverage:",
            values.notna().sum(),
            "average:",
            round(values.mean(), 3)
        )

        if (
            values.isna().any()
            or not np.isfinite(values).all()
            or (values < 0).any()
        ):
            raise ValueError(
                f"Invalid experienced fallback: {column}"
            )

    inexperienced_mask = (
        current["projection_method"] == "inexperienced_fallback"
    )

    inexperienced_predictions = (
        project_inexperienced_fallback(
            df,
            current.loc[inexperienced_mask].copy()
        ).set_index("player_id")
    )

    for column in rate_columns:
        current.loc[inexperienced_mask, column] = (
            current.loc[inexperienced_mask, "player_id"]
            .map(inexperienced_predictions[column])
            .to_numpy()
        )

    print("\nInexperienced fallback pitchers:",
          inexperienced_mask.sum())

    for column in rate_columns:
        values = current.loc[inexperienced_mask, column]

        print(
            column,
            "coverage:",
            values.notna().sum(),
            "average:",
            round(values.mean(), 3)
        )

        if (
            values.isna().any()
            or not np.isfinite(values).all()
            or (values < 0).any()
        ):
            raise ValueError(
                f"Invalid inexperienced fallback: {column}"
            )

    print("\nFINAL RATE COVERAGE")

    for column in rate_columns:
        print(
            column,
            current[column].notna().sum(),
            "/",
            len(current)
        )

        if (
            current[column].isna().any()
            or not np.isfinite(current[column]).all()
            or (current[column] < 0).any()
        ):
            raise ValueError(
                f"Incomplete final rate coverage: {column}"
            )

    current = calculate_pitching_counting_stats(current)

    counting_columns = [
        "projected_so",
        "projected_bb",
        "projected_hr",
        "projected_hits",
        "projected_er",
        "projected_whip",
    ]

    print("\n2027 PROJECTED COUNTING STATISTICS")

    for column in counting_columns:
        values = current[column]

        print(
            column,
            "coverage:",
            values.notna().sum(),
            "average:",
            round(values.mean(), 3),
            "range:",
            round(values.min(), 3),
            "to",
            round(values.max(), 3)
        )

        if (
            values.isna().any()
            or not np.isfinite(values).all()
            or (values < 0).any()
        ):
            raise ValueError(
                f"Invalid counting projection: {column}"
            )

    expected_whip = (
        current["projected_h9"] +
        current["projected_bb9"]
    ) / 9

    if not np.allclose(
        current["projected_whip"],
        expected_whip,
        rtol=1e-10,
        atol=1e-10
    ):
        raise ValueError("WHIP consistency check failed.")

    print("\nAll 812 pitcher counting projections PASSED.")


if __name__ == "__main__":
    main()
