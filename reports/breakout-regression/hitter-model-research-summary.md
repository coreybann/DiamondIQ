# DiamondIQ Hitter Breakout & Regression Predictor

## Research Status
Initial model development and historical validation completed.

## Dataset
- 2023–2026 hitter seasons
- 806 consecutive-season pairs
- 528 out-of-sample predictions across 2025 and 2026
- Minimum 200 PA in both seasons

## Recommended Research Model
Advanced Ridge Regression
- StandardScaler
- Ridge alpha = 10.0

Features:
1. OPS
2. BB%
3. K%
4. Average exit velocity
5. Hard-hit percentage
6. Barrel percentage
7. Contact xBA
8. Contact xSLG

## Prediction Definitions
Actual breakout: OPS improvement >= .050
Actual regression: OPS decline <= -.050

Provisional prediction threshold: +/- .030

## Historical Results
Advanced Ridge:
- Combined OPS MAE: .0621
- 2025 OPS MAE: .0625
- 2026 OPS MAE: .0617
- 2025 balanced accuracy at .030: 53.3%
- 2026 balanced accuracy at .030: 58.4%

## Model Comparisons
HistGradientBoosting:
- Combined OPS MAE: .0630
- Combined classification accuracy at .050: 54.7%

Advanced Ridge at .050:
- Combined classification accuracy: 53.6%
- Combined balanced accuracy: 50.1%

## Playing Time Analysis
200–349 PA:
- 47.0% actual breakouts
- 21.7% actual regressions

350–499 PA:
- 22.8% actual breakouts
- 33.5% actual regressions

500+ PA:
- 18.8% actual breakouts
- 35.3% actual regressions

Adding PA as a ninth feature reduced performance in both evaluated seasons.

## Limitations
- Survivorship bias: hitters must reach 200 PA in consecutive seasons.
- Limited historical training data.
- Prediction thresholds were explored using previously examined holdout seasons.
- 2026 is not an untouched independent validation set.
- Contact xBA and contact xSLG are contact-based averages, not official full-season xBA/xSLG.
- Model predictions are estimates, not guarantees.

## Next Phase
1. Preserve model and evaluation methodology.
2. Generate reproducible predictions and research outputs.
3. Plan website integration with clear model limitations.
4. Obtain genuinely new out-of-time validation before making stronger accuracy claims.

## Website Status
Not yet integrated into the live DiamondIQ website.
