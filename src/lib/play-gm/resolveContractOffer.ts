import type { GMUniverse } from "./universeTypes";

export type GMOfferResolution = "accepted" | "rejected";

export function resolveContractOffer(
  universe: GMUniverse,
  offerId: string,
  resolution: GMOfferResolution
): GMUniverse {
  if (
    resolution !== "accepted" &&
    resolution !== "rejected"
  ) {
    throw new Error("Invalid contract-offer resolution.");
  }

  const offers = universe.contractOffers ?? [];

  const target = offers.find(
    (offer) => offer.id === offerId
  );

  if (!target) {
    throw new Error("Contract offer does not exist.");
  }

  if (target.status !== "pending") {
    throw new Error(
      "Only pending contract offers can be resolved."
    );
  }

  const alreadyAccepted = offers.some(
    (offer) =>
      offer.playerId === target.playerId &&
      offer.status === "accepted"
  );

  if (alreadyAccepted) {
    throw new Error(
      "This player already has an accepted contract offer."
    );
  }

  return {
    ...universe,
    contractOffers: offers.map((offer) => {
      if (offer.id === offerId) {
        return {
          ...offer,
          status: resolution,
          resolvedDate: universe.currentDate,
        };
      }

      if (
        resolution === "accepted" &&
        offer.playerId === target.playerId &&
        offer.status === "pending"
      ) {
        return {
          ...offer,
          status: "rejected" as const,
          resolvedDate: universe.currentDate,
        };
      }

      return offer;
    }),
  };
}
