
import { projectContract } from "../src/lib/contractProjections";
import contractData from "../public/data/mlb-contract-comparables.json";

console.log("\nDiamondIQ Contract Model Validation\n");

for (const contract of contractData.contracts) {
  if (
    contract.ageAtSigning === null ||
    contract.priorTwoYearWar === null
  ) {
    console.log(`Skipping ${contract.player}: missing data`);
    continue;
  }

  const projection = projectContract({
    age: contract.ageAtSigning,
    position: contract.position,
    war2025_2026: contract.priorTwoYearWar,
  });

  const difference =
    projection.totalMillions - contract.totalMillions;

  console.log(`Player: ${contract.player}`);
  console.log(
    `Projected: ${projection.years} years, $${projection.totalMillions.toFixed(1)}M`
  );
  console.log(
    `Actual: ${contract.years} years, $${contract.totalMillions.toFixed(1)}M`
  );
  console.log(`Difference: $${difference.toFixed(1)}M`);

  console.log(
    `Years difference: ${projection.years - contract.years}`
  );

  console.log(
    `Projected AAV: $${projection.aavMillions.toFixed(1)}M`
  );

  console.log(
    `Actual AAV: $${contract.aavMillions.toFixed(1)}M`
  );

  console.log(
    `AAV difference: $${(
      projection.aavMillions - contract.aavMillions
    ).toFixed(1)}M`
  );

  console.log("------------------------------");
}
