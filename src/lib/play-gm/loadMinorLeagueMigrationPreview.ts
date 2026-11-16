import { getFranchise } from "./franchiseStorage";
import { loadMinorLeagueAffiliates } from "./loadMinorLeagueAffiliates";
import { loadMinorLeaguePlayers } from "./loadMinorLeaguePlayers";
import {
  previewMinorLeagueMigration,
  type MinorLeagueMigrationPreview,
} from "./previewMinorLeagueMigration";
import { validateUniverseRosters } from "./validateUniverseRosters";

export type FranchiseMinorLeagueMigrationPreview =
  MinorLeagueMigrationPreview & {
    franchiseRevision: number;
  };

export async function loadMinorLeagueMigrationPreview(
  franchiseId: string
): Promise<FranchiseMinorLeagueMigrationPreview> {
  const franchise = await getFranchise(franchiseId);

  if (!franchise?.universe) {
    throw new Error("Franchise universe not found.");
  }

  const universe = franchise.universe;

  // Validate the existing franchise before fetching new data.
  validateUniverseRosters(universe.teams, universe.players);

  // Reject ineligible franchises before making API requests.
  previewMinorLeagueMigration(universe, []);

  const affiliates = await loadMinorLeagueAffiliates(
    universe.teams.map((team) => team.id)
  );

  // For previews, preserve every existing franchise player.
  // The migration preview will skip matching IDs without
  // changing their organization or free-agent status.
  const minorLeaguePlayers = await loadMinorLeaguePlayers(
    affiliates,
    []
  );

  const preview = previewMinorLeagueMigration(
    universe,
    minorLeaguePlayers
  );

  return {
    ...preview,
    franchiseRevision: franchise.revision ?? 0,
  };
}
