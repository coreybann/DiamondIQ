import { evaluateContractOffers } from "./evaluateContractOffers";
import type { GMUniverse } from "./universeTypes";

export type GMContractDecision =
  | "accept"
  | "reject"
  | "negotiate";

export type GMContractDecisionResult = {
  decision: GMContractDecision;
  offerId: string;
  reason: string;
};

export function decideContractOffer(
  universe: GMUniverse,
  playerId: number,
  minimumAnnualSalaryMillions: number
): GMContractDecisionResult | null {
  if (
    !Number.isFinite(minimumAnnualSalaryMillions) ||
    minimumAnnualSalaryMillions < 0
  ) {
    throw new Error("Invalid minimum annual salary.");
  }

  const player = universe.players.find(
    (entry) => entry.id === playerId
  );

  if (
    !player ||
    player.organizationId !== null ||
    player.rosterStatus !== "free-agent"
  ) {
    return null;
  }

  const offers = evaluateContractOffers(universe, playerId);

  if (offers.length === 0) {
    return null;
  }

  const best = offers[0].offer;

  if (
    best.annualSalaryMillions >=
    minimumAnnualSalaryMillions
  ) {
    return {
      decision: "accept",
      offerId: best.id,
      reason: "Best available offer meets the player's salary expectation.",
    };
  }

  if (
    best.annualSalaryMillions >=
    minimumAnnualSalaryMillions * 0.8
  ) {
    return {
      decision: "negotiate",
      offerId: best.id,
      reason: "Best offer is close to the player's salary expectation.",
    };
  }

  return {
    decision: "reject",
    offerId: best.id,
    reason: "Best offer is below the player's salary expectation.",
  };
}
