import { applySalaries } from "./applySalaries";
import { updateFranchiseUniverse } from "./updateFranchiseUniverse";
import type { GMUniverse } from "./universeTypes";

export async function refreshFranchiseSalaries(
  franchiseId: string
) {
  return updateFranchiseUniverse(franchiseId, (universe: GMUniverse) => {
    // Calculate salaries using DiamondIQ's existing salary database.
    const refreshed = applySalaries(universe);

    // Preserve negotiated contracts and any existing known salaries.
    const originalPlayers = new Map(
      universe.players.map((player) => [player.id, player])
    );

    const players = refreshed.players.map((player) => {
      const original = originalPlayers.get(player.id);

      if (
        original &&
        (original.salaryType === "simulated" ||
          (original.salaryMillions !== null &&
            original.salaryType !== "unknown"))
      ) {
        return original;
      }

      return player;
    });

    // Recalculate payroll from the final, protected salaries.
    const salariesById = new Map(
      players.map((player) => [player.id, player.salaryMillions])
    );

    const teams = refreshed.teams.map((team) => {
      let payrollMillions = 0;
      let payrollKnown = true;

      for (const playerId of team.playerIds) {
        const salary = salariesById.get(playerId);

        if (salary === undefined || salary === null) {
          payrollKnown = false;
        } else {
          payrollMillions += salary;
        }
      }

      return {
        ...team,
        payrollMillions: Math.round(payrollMillions * 1000) / 1000,
        payrollKnown,
      };
    });

    return {
      ...refreshed,
      players,
      teams,
    };
  });
}
