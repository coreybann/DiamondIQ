import {
  getFranchise,
  saveFranchise,
  type FranchiseSave,
} from "./franchiseStorage";

import type { GMUniverse } from "./universeTypes";

export async function updateFranchiseUniverse(
  franchiseId: string,
  updater: (universe: GMUniverse) => GMUniverse
): Promise<FranchiseSave> {
  if (!franchiseId.trim()) {
    throw new Error("Franchise ID is required.");
  }

  const franchise = await getFranchise(franchiseId);

  if (!franchise) {
    throw new Error("Franchise save does not exist.");
  }

  if (!franchise.universe) {
    throw new Error(
      "This franchise does not have an initialized universe."
    );
  }

  // Protect the loaded universe from accidental mutation.
  const originalUniverse = structuredClone(franchise.universe);

  const updatedUniverse = updater(originalUniverse);

  if (!updatedUniverse) {
    throw new Error("Franchise updater returned no universe.");
  }

  if (updatedUniverse.schemaVersion !== 1) {
    throw new Error("Unsupported franchise universe version.");
  }

  const updatedFranchise: FranchiseSave = {
    ...franchise,
    universe: structuredClone(updatedUniverse),
    currentDate: updatedUniverse.currentDate,
    currentSeason: updatedUniverse.season,
    updatedAt: new Date().toISOString(),
  };

  await saveFranchise(updatedFranchise);

  // Reload the committed revision from IndexedDB.
  const savedFranchise = await getFranchise(franchiseId);

  if (!savedFranchise) {
    throw new Error(
      "Franchise was saved but could not be reloaded."
    );
  }

  return savedFranchise;
}
