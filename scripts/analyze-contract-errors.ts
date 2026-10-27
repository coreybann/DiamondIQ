import { historicalContracts } from "../src/lib/historicalContracts";
import { projectContract } from "../src/lib/contractProjections";

const results = historicalContracts.map((c) => {
  const projection = projectContract({
    age: c.ageAtSigning,
    position: c.position,
    war2025_2026: c.priorTwoYearWar,
  });

  return {
    player: c.player,
    position: c.position,
    age: c.ageAtSigning,
    war: c.priorTwoYearWar,
    actualAAV: c.aavMillions,
    projectedAAV: projection.aavMillions,
    error: projection.aavMillions - c.aavMillions,
    absoluteError: Math.abs(projection.aavMillions - c.aavMillions),
    actualYears: c.years,
    projectedYears: projection.years,
  };
});

const groups = new Map<string, typeof results>();

for (const r of results) {
  const group = groups.get(r.position) ?? [];
  group.push(r);
  groups.set(r.position, group);
}

console.log("\n=== ERROR BY POSITION ===");
console.log("Negative bias means the model underestimates AAV.\n");

for (const [position, group] of [...groups.entries()].sort()) {
  const mae =
    group.reduce((sum, r) => sum + r.absoluteError, 0) / group.length;
  const bias =
    group.reduce((sum, r) => sum + r.error, 0) / group.length;
  const yearMatches = group.filter(
    (r) => r.actualYears === r.projectedYears
  ).length;

  console.log(
    `${position}: n=${group.length}, ` +
    `MAE=$${mae.toFixed(2)}M, ` +
    `bias=${bias >= 0 ? "+" : "-"}$${Math.abs(bias).toFixed(2)}M, ` +
    `years match=${yearMatches}/${group.length}`
  );
}

console.log("\n=== ALL CONTRACTS: ACTUAL VS PROJECTED ===");

for (const r of [...results].sort((a, b) => b.absoluteError - a.absoluteError)) {
  console.log(
    `${r.player} (${r.position}, age ${r.age}, WAR ${r.war}): ` +
    `AAV $${r.actualAAV.toFixed(2)}M vs $${r.projectedAAV.toFixed(2)}M; ` +
    `years ${r.actualYears} vs ${r.projectedYears}`
  );
}
