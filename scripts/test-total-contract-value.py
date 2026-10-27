import json
import numpy as np

contracts = json.load(open("public/data/mlb-contract-comparables.json"))["contracts"]
evaluation = json.load(open("public/data/contract-model-evaluation.json"))
baseline = {r["player"].casefold(): r for r in evaluation}

rows = []
for c in contracts:
    old = baseline.get(c["player"].casefold())
    if old is None:
        continue

    war = float(c["priorTwoYearWar"]) / 2
    age = float(c["ageAtSigning"]) - 32
    sp = int(c["position"] == "SP")
    rp = int(c["position"] == "RP")

    rows.append({
        "player": c["player"],
        "actual_total": float(c["totalMillions"]),
        "old_aav": float(old["projectedAAV"]),
        "old_years": int(old["projectedYears"]),
        "salary_features": [1, war, age, sp, rp, war * sp, war * rp],
        "length_features": [1, war, age, sp, rp],
        "actual_aav": float(c["aavMillions"]),
        "actual_years": int(c["years"]),
    })

salary_x = np.array([r["salary_features"] for r in rows])
length_x = np.array([r["length_features"] for r in rows])
actual_aav = np.array([r["actual_aav"] for r in rows])
actual_years = np.array([r["actual_years"] for r in rows])

results = {"Current": [], "New salary": [], "Hybrid": []}
actual_totals = []

for i, row in enumerate(rows):
    mask = np.arange(len(rows)) != i

    salary_coef = np.linalg.lstsq(
        salary_x[mask], actual_aav[mask], rcond=None
    )[0]
    length_coef = np.linalg.lstsq(
        length_x[mask], actual_years[mask], rcond=None
    )[0]

    predicted_aav = max(1, float(salary_x[i] @ salary_coef))
    regression_years = max(
        1, min(15, int(np.floor(float(length_x[i] @ length_coef) + 0.5)))
    )
    hybrid_years = int(np.floor((row["old_years"] + regression_years) / 2 + 0.5))

    results["Current"].append(row["old_aav"] * row["old_years"])
    results["New salary"].append(predicted_aav * row["old_years"])
    results["Hybrid"].append(predicted_aav * hybrid_years)
    actual_totals.append(row["actual_total"])

actual_totals = np.array(actual_totals)

print(f"Contracts tested: {len(rows)}")
for name, predictions in results.items():
    errors = np.array(predictions) - actual_totals
    print(f"\n{name}")
    print(f"Average total value error: ${np.mean(np.abs(errors)):.2f}M")
    print(f"Median total value error: ${np.median(np.abs(errors)):.2f}M")
    print(f"Average signed error: ${np.mean(errors):+.2f}M")

print("\nLargest hybrid errors:")
hybrid_errors = np.array(results["Hybrid"]) - actual_totals
for i in np.argsort(np.abs(hybrid_errors))[::-1][:8]:
    print(
        f"{rows[i]['player']}: actual ${actual_totals[i]:.1f}M, "
        f"predicted ${results['Hybrid'][i]:.1f}M"
    )
