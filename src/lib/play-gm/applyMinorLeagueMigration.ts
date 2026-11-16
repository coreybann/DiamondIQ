import type { GMPlayer } from "./universeTypes";
import type { FranchiseSave } from "./franchiseStorage";
import { updateFranchiseUniverse } from "./updateFranchiseUniverse";
import { buildMinorLeagueMigration } from "./buildMinorLeagueMigration";

export async function applyMinorLeagueMigration(
  franchiseId: string,
  minorLeaguePlayers: GMPlayer[],
  expectedRevision: number
): Promise<FranchiseSave> {
  if (!franchiseId.trim()) {
    throw new Error("Franchise ID is required.");
  }

  if (minorLeaguePlayers.length === 0) {
    throw new Error("No minor-league players were provided.");
  }

  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error("Invalid franchise preview revision.");
  }

  // Validate the preview revision against the same franchise
  // version used to build the migration.
  // IndexedDB also rejects concurrent revision conflicts.
  return updateFranchiseUniverse(
    franchiseId,
    (universe) =>
      buildMinorLeagueMigration(universe, minorLeaguePlayers),
    expectedRevision
  );
}
