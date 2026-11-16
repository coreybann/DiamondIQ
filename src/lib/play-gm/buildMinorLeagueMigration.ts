import type { GMUniverse, GMPlayer } from "./universeTypes";
import { previewMinorLeagueMigration } from "./previewMinorLeagueMigration";
import { validateUniverseRosters } from "./validateUniverseRosters";

export function buildMinorLeagueMigration(
  universe: GMUniverse,
  minorLeaguePlayers: GMPlayer[]
): GMUniverse {
  // Validate the original franchise before modifying a copy.
  validateUniverseRosters(universe.teams, universe.players);

  const preview = previewMinorLeagueMigration(
    universe,
    minorLeaguePlayers
  );

  if (preview.eligiblePlayers.length === 0) {
    throw new Error(
      "No eligible minor-league players remain to migrate."
    );
  }

  const updated = structuredClone(universe);

  const teamsById = new Map(
    updated.teams.map((team) => [team.id, team])
  );

  for (const player of preview.eligiblePlayers) {
    const organizationId = player.organizationId;

    if (organizationId === null) {
      throw new Error(
        `Minor-league player ${player.id} has no organization.`
      );
    }

    const team = teamsById.get(organizationId);

    if (!team) {
      throw new Error(
        `Organization ${organizationId} was not found.`
      );
    }

    updated.players.push(structuredClone(player));
    team.playerIds.push(player.id);
  }

  // Verify every player belongs to exactly one correct roster.
  validateUniverseRosters(updated.teams, updated.players);

  // Transactions, salaries, contracts, dates, and franchise
  // progression are deliberately left unchanged.
  return updated;
}
