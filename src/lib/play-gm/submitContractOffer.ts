import { validateContractOffer } from "./validateContractOffer";
import type { GMContractOffer } from "./contractOfferTypes";
import type { GMUniverse } from "./universeTypes";

export type GMSubmitContractOfferResult = {
  universe: GMUniverse;
  offer: GMContractOffer;
};

export function submitContractOffer(
  universe: GMUniverse,
  playerId: number,
  teamId: number,
  years: number,
  annualSalaryMillions: number
): GMSubmitContractOfferResult {
  const validation = validateContractOffer(
    universe,
    playerId,
    teamId,
    years,
    annualSalaryMillions
  );

  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const existingOffers = universe.contractOffers ?? [];

  const duplicate = existingOffers.some(
    (offer) =>
      offer.playerId === playerId &&
      offer.teamId === teamId &&
      offer.status === "pending"
  );

  if (duplicate) {
    throw new Error(
      "This team already has a pending offer for this player."
    );
  }

  const offer: GMContractOffer = {
    id: crypto.randomUUID(),
    playerId,
    teamId,
    years,
    annualSalaryMillions,
    totalValueMillions: Number(
      (years * annualSalaryMillions).toFixed(3)
    ),
    status: "pending",
    createdDate: universe.currentDate,
    resolvedDate: null,
  };

  return {
    universe: {
      ...universe,
      contractOffers: [
        ...existingOffers,
        offer,
      ],
    },
    offer,
  };
}
