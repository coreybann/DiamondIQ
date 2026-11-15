import {
  getTeamSalaryRecords,
  getTeamSalaryProjections,
} from "../teamPayroll";

import type {
  GMUniverse,
  GMPlayer,
} from "./universeTypes";

import { recoverArbitrationEstimates } from "./recoverArbitrationEstimates";

export function applySalaries(
  universe: GMUniverse
): GMUniverse {
  const playersById = new Map<number, GMPlayer>(
    universe.players.map((player) => [
      player.id,
      { ...player },
    ])
  );

  const recoveredEstimates = recoverArbitrationEstimates(
    universe.players,
    universe.teams
  );

  const recoveredById = new Map(
    recoveredEstimates.map((estimate) => [
      estimate.playerId,
      estimate.salaryMillions,
    ])
  );

  const teams = universe.teams.map((team) => {
    const rosterIds = team.playerIds;

    const salaries = getTeamSalaryRecords(
      team.abbreviation,
      2027,
      rosterIds
    );

    const projections = getTeamSalaryProjections(
      team.abbreviation,
      rosterIds
    );

    const listedById = new Map(
      salaries
        .filter(
          (record) =>
            record.mlbPlayerId !== null &&
            record.salaryMillions !== null &&
            Number.isFinite(record.salaryMillions) &&
            record.salaryMillions >= 0 &&
            record.salaryStatus === "salary_listed"
        )
        .map((record) => [
          record.mlbPlayerId as number,
          record,
        ])
    );

    const projectedById = new Map(
      projections.map((record) => [
        record.mlbPlayerId,
        record,
      ])
    );

    let payrollMillions = 0;
    let payrollKnown = true;

    for (const playerId of rosterIds) {
      const player = playersById.get(playerId);

      if (!player) {
        throw new Error(
          `Missing player ${playerId} for ${team.name}.`
        );
      }

      const listed = listedById.get(playerId);
      const projected = projectedById.get(playerId);
      const recovered = recoveredById.get(playerId);

      if (listed) {
        player.salaryMillions = listed.salaryMillions;
        player.salaryType = "listed";
        player.contractStatus = listed.contractStatus;
      } else if (projected) {
        player.salaryMillions =
          projected.estimatedSalaryMillions;
        player.salaryType = "projected";
        player.contractStatus =
          projected.category === "arbitration"
            ? "Arbitration projection"
            : "Pre-arbitration projection";
      } else if (recovered !== undefined) {
        player.salaryMillions = recovered;
        player.salaryType = "projected";
        player.contractStatus = "Recovered arbitration estimate";
      } else {
        player.salaryMillions = null;
        player.salaryType = "unknown";
        player.contractStatus = "Unknown";
        payrollKnown = false;
      }

      if (player.salaryMillions !== null) {
        payrollMillions += player.salaryMillions;
      }
    }

    return {
      ...team,
      payrollMillions:
        Math.round(payrollMillions * 1000) / 1000,
      payrollKnown,
    };
  });

  return {
    ...universe,
    teams,
    players: universe.players.map(
      (player) => playersById.get(player.id)!
    ),
  };
}
