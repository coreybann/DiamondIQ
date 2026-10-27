import fs from "node:fs";
import { historicalContracts } from "../src/lib/historicalContracts";
import { projectContract } from "../src/lib/contractProjections";

type HistoricalContract = (typeof historicalContracts)[number];

const results = historicalContracts.map((contract: HistoricalContract) => {
  const projection = projectContract({
    age: contract.ageAtSigning,
    position: contract.position,
    war2025_2026: contract.priorTwoYearWar,
  });

  const actualAAV = contract.aavMillions;
  const aavError = projection.aavMillions - actualAAV;

  return {
    player: contract.player,
    actualYears: contract.years,
    projectedYears: projection.years,
    actualAAV,
    projectedAAV: projection.aavMillions,
    aavError,
    absoluteAAVError: Math.abs(aavError),
    yearsMatch: projection.years === contract.years,
  };
});

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const sortedErrors = results
  .map((result) => result.absoluteAAVError)
  .sort((a, b) => a - b);

const middle = Math.floor(sortedErrors.length / 2);
const medianError =
  sortedErrors.length % 2 === 0
    ? (sortedErrors[middle - 1] + sortedErrors[middle]) / 2
    : sortedErrors[middle];

console.log("\n=== DIAMONDIQ CONTRACT MODEL EVALUATION ===");
console.log("Contracts evaluated:", results.length);
console.log(
  "Mean absolute AAV error: $" +
    mean(sortedErrors).toFixed(2) +
    "M"
);
console.log("Median absolute AAV error: $" + medianError.toFixed(2) + "M");
console.log(
  "Exact contract-length matches:",
  results.filter((result) => result.yearsMatch).length,
  "/",
  results.length
);
console.log(
  "Mean signed AAV error: $" +
    mean(results.map((result) => result.aavError)).toFixed(2) +
    "M (positive = overestimate)"
);

console.log("\n=== LARGEST AAV ERRORS ===");

[...results]
  .sort((a, b) => b.absoluteAAVError - a.absoluteAAVError)
  .slice(0, 10)
  .forEach((result) => {
    console.log(
      `${result.player}: actual $${result.actualAAV.toFixed(2)}M, ` +
        `projected $${result.projectedAAV.toFixed(2)}M, ` +
        `error ${result.aavError >= 0 ? "+" : "-"}$${Math.abs(result.aavError).toFixed(2)}M, ` +
        `years ${result.projectedYears}/${result.actualYears}`
    );
  });

const outputPath = "public/data/contract-model-evaluation.json";
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2) + "\n");
console.log(`\nDetailed results saved to ${outputPath}`);
