import { canSignFreeAgent } from "./canSignFreeAgent";
import type { GMUniverse } from "./universeTypes";

export type GMContractOfferValidation = {
  valid: boolean;
  reason: string;
};

export function validateContractOffer(
  universe: GMUniverse,
  playerId: number,
  teamId: number,
  years: number,
  annualSalaryMillions: number
): GMContractOfferValidation {
  const team = universe.teams.find(
    (entry) => entry.id === teamId
  );

  if (!team) {
    return {
      valid: false,
      reason: "The receiving MLB team does not exist.",
    };
  }

  const eligibility = canSignFreeAgent(universe, playerId);

  if (!eligibility.eligible) {
    return {
      valid: false,
      reason: eligibility.reason,
    };
  }

  if (
    !Number.isInteger(years) ||
    years < 1 ||
    years > 15
  ) {
    return {
      valid: false,
      reason: "Contract length must be between 1 and 15 years.",
    };
  }

  if (
    !Number.isFinite(annualSalaryMillions) ||
    annualSalaryMillions < 0.8 ||
    annualSalaryMillions > 100
  ) {
    return {
      valid: false,
      reason: "Annual salary must be between $0.8M and $100M.",
    };
  }

  const totalValueMillions = years * annualSalaryMillions;

  if (!Number.isFinite(totalValueMillions)) {
    return {
      valid: false,
      reason: "Invalid contract total value.",
    };
  }

  return {
    valid: true,
    reason: "Contract offer is valid.",
  };
}
