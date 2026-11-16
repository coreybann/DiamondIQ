import type { GMUniverse, GMPlayer } from "./universeTypes";

export type MinorLeagueMigrationPreview = {
  eligiblePlayers: GMPlayer[];
  existingPlayersSkipped: number;
  transactionPlayersSkipped: number;
  missingOrganizationsSkipped: number;
};

export function previewMinorLeagueMigration(
  universe: GMUniverse,
  minorLeaguePlayers: GMPlayer[]
): MinorLeagueMigrationPreview {
  // Historical minor-league snapshots are only suitable
  // for franchises still at the original starting point.
  if (
    universe.currentDate !== "2026-11-14" ||
    universe.season !== 2027
  ) {
    throw new Error(
      "Minor-league roster migration is only supported at the original franchise starting date."
    );
  }

  // Do not migrate franchises that have recorded transactions.
  // Historical roster snapshots may conflict with simulated moves.
  if (universe.transactions.length > 0) {
    throw new Error(
      "Minor-league roster migration requires a franchise with no recorded transactions."
    );
  }

  const existingById = new Map(
    universe.players.map((player) => [player.id, player])
  );

  const rosteredIds = new Set(
    universe.teams.flatMap((team) => team.playerIds)
  );

  const transactionIds = new Set(
    universe.transactions.flatMap((transaction) => transaction.playerIds)
  );

  const organizationIds = new Set(
    universe.teams.map((team) => team.id)
  );

  const seenIds = new Set<number>();
  const eligiblePlayers: GMPlayer[] = [];

  let existingPlayersSkipped = 0;
  let transactionPlayersSkipped = 0;
  let missingOrganizationsSkipped = 0;

  for (const player of minorLeaguePlayers) {
    if (seenIds.has(player.id)) {
      throw new Error(`Duplicate migration player ID: ${player.id}.`);
    }

    seenIds.add(player.id);

    const existing = existingById.get(player.id);

    if (existing) {
      // MLB 40-man assignments take priority over historical
      // minor-league affiliate roster snapshots.
      if (
        !existing.onFortyMan &&
        existing.organizationId !== null &&
        existing.organizationId !== player.organizationId
      ) {
        throw new Error(
          `Conflicting organization for player ${player.id}: ` +
          `${existing.organizationId} vs ${player.organizationId}.`
        );
      }

      existingPlayersSkipped++;
      continue;
    }

    if (rosteredIds.has(player.id)) {
      throw new Error(
        `Player ${player.id} appears on a team roster but has no player record.`
      );
    }

    if (transactionIds.has(player.id)) {
      transactionPlayersSkipped++;
      continue;
    }

    if (
      player.organizationId === null ||
      !organizationIds.has(player.organizationId)
    ) {
      missingOrganizationsSkipped++;
      continue;
    }

    if (
      player.onFortyMan ||
      player.onActiveRoster ||
      player.rosterStatus !== "minor-league"
    ) {
      throw new Error(
        `Invalid minor-league migration player: ${player.id}.`
      );
    }

    eligiblePlayers.push(structuredClone(player));
  }

  return {
    eligiblePlayers,
    existingPlayersSkipped,
    transactionPlayersSkipped,
    missingOrganizationsSkipped,
  };
}
