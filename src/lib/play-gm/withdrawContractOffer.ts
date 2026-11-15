import type { GMUniverse } from "./universeTypes";

export function withdrawContractOffer(
  universe: GMUniverse,
  offerId: string,
  teamId: number
): GMUniverse {
  const offers = universe.contractOffers ?? [];

  const offer = offers.find(
    (entry) => entry.id === offerId
  );

  if (!offer) {
    throw new Error("Contract offer does not exist.");
  }

  if (offer.teamId !== teamId) {
    throw new Error(
      "Only the team that submitted this offer can withdraw it."
    );
  }

  if (offer.status !== "pending") {
    throw new Error(
      "Only pending contract offers can be withdrawn."
    );
  }

  return {
    ...universe,
    contractOffers: offers.map((entry) =>
      entry.id === offerId
        ? {
            ...entry,
            status: "withdrawn" as const,
            resolvedDate: universe.currentDate,
          }
        : entry
    ),
  };
}
