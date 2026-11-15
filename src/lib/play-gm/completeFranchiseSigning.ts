import {
  updateFranchiseUniverse,
} from "./updateFranchiseUniverse";

import { signFreeAgent } from "./signFreeAgent";

import type { FranchiseSave } from "./franchiseStorage";

export async function completeFranchiseSigning(
  franchiseId: string,
  offerId: string
): Promise<FranchiseSave> {
  if (!offerId.trim()) {
    throw new Error("Contract offer ID is required.");
  }

  return updateFranchiseUniverse(
    franchiseId,
    (universe) => signFreeAgent(universe, offerId)
  );
}
