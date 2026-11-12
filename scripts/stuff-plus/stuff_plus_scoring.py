"""DiamondIQ provisional Stuff+ scoring utilities."""

import numpy as np

# Fixed 2023 training-season reference.
# Provisional until out-of-fold calibration is evaluated.
REFERENCE_MEAN = -0.000186
REFERENCE_STD = 0.004643

SCALE_FACTOR = 10.0


def calculate_stuff_plus(predicted_run_value):
    """Convert predicted run value into 100-centered Stuff+.

    Higher ratings indicate better predicted pitch quality.
    """
    values = np.asarray(predicted_run_value, dtype=float)

    ratings = 100.0 - SCALE_FACTOR * (
        (values - REFERENCE_MEAN) / REFERENCE_STD
    )

    if np.ndim(ratings) == 0:
        return float(ratings)

    return ratings
