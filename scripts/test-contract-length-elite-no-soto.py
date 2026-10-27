import json
import numpy as np

contracts = [c for c in json.load(open("public/data/mlb-contract-comparables.json"))["contracts"] if c["player"] != "Juan Soto"]

evaluation = json.load(
    open("public/data/contract-model-evaluation.json")
)

baseline = {
    row["player"].casefold(): row
    for row in evaluation
}

rows = []

for c in contracts:
    old = baseline.get(c["player"].casefold())
    if old is None:
        continue

    war = c["priorTwoYearWar"] / 2
    age = c["ageAtSigning"]
    sp = int(c["position"] == "SP")
    rp = int(c["position"] == "RP")

    rows.append({
        "player": c["player"],
        "actual": c["years"],
        "current": old["projectedYears"],
        "features": [
            1, war, age - 32, sp, rp, int(age <= 30 and war >= 4), int(age <= 27 and war >= 6)
        ],
    })

X = np.array([r["features"] for r in rows], dtype=float)
y = np.array([r["actual"] for r in rows], dtype=float)

predictions = []

for i in range(len(rows)):
    mask = np.arange(len(rows)) != i
    coefficients = np.linalg.lstsq(
        X[mask], y[mask], rcond=None
    )[0]

    predicted = X[i] @ coefficients
    predictions.append(
        max(1, min(15, int(np.floor(predicted + 0.5))))
    )

old = np.array([r["current"] for r in rows])
new = np.array(predictions)

print(f"Contracts tested: {len(rows)}")

for name, predicted in [
    ("Current model", old),
    ("Experimental regression", new),
]:
    print(f"\n{name}")
    print(f"Average error: {np.mean(np.abs(predicted-y)):.2f} years")
    print(f"Exact matches: {np.sum(predicted==y)}/{len(y)}")
    print(f"Within one year: {np.sum(np.abs(predicted-y)<=1)}/{len(y)}")

print("\nLargest experimental errors:")
for i in np.argsort(np.abs(new-y))[::-1][:8]:
    print(
        f"{rows[i]['player']}: "
        f"actual {int(y[i])}, predicted {int(new[i])}"
    )
