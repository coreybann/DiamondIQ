import type { GMPlayer, GMTeam } from "./universeTypes";

export function validateUniverseRosters(
  teams: GMTeam[],
  players: GMPlayer[]
): void {
  if (teams.length !== 30) {
    throw new Error(
      `Play GM requires 30 MLB teams. Received ${teams.length}.`
    );
  }

  const teamIds = new Set(teams.map((team) => team.id));
  const playerIds = new Set(players.map((player) => player.id));

  if (teamIds.size !== teams.length) {
    throw new Error("Duplicate MLB team IDs detected.");
  }

  if (playerIds.size !== players.length) {
    throw new Error("Duplicate MLB player IDs detected.");
  }

  for (const player of players) {
    if (
      player.organizationId !== null &&
      !teamIds.has(player.organizationId)
    ) {
      throw new Error(
        `Player ${player.id} belongs to an unknown organization.`
      );
    }
  }

  const playersById = new Map(
    players.map((player) => [player.id, player])
  );

  const rosteredPlayerIds = new Set<number>();

  for (const team of teams) {
    for (const playerId of team.playerIds) {
      if (rosteredPlayerIds.has(playerId)) {
        throw new Error(
          `Player ${playerId} appears on multiple roster entries.`
        );
      }

      rosteredPlayerIds.add(playerId);

      const player = playersById.get(playerId);

      if (!player || player.organizationId !== team.id) {
        throw new Error(
          `Invalid player ${playerId} on team ${team.id}.`
        );
      }
    }
  }

  for (const player of players) {
    if (
      player.organizationId !== null &&
      !rosteredPlayerIds.has(player.id)
    ) {
      throw new Error(
        `Player ${player.id} is missing from their organization's roster.`
      );
    }

    if (
      player.organizationId === null &&
      rosteredPlayerIds.has(player.id)
    ) {
      throw new Error(
        `Unassigned player ${player.id} appears on a team roster.`
      );
    }
  }

}
