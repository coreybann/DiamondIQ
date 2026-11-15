import type { GMContractOffer } from "./contractOfferTypes";
import type { GMUniverse } from "./universeTypes";

export type GMEvaluatedContractOffer = {
  offer: GMContractOffer;
  score: number;
};

export function evaluateContractOffers(
  universe: GMUniverse,
  playerId: number
): GMEvaluatedContractOffer[] {
  const offers = (universe.contractOffers ?? []).filter(
    (offer) =>
      offer.playerId === playerId &&
      offer.status === "pending"
  );

  const evaluated = offers.map((offer) => {
    const totalValueScore =
      offer.totalValueMillions * 0.5;

    const annualSalaryScore =
      offer.annualSalaryMillions * 0.35;

    const contractLengthScore =
      offer.years * 0.15;

    const score =
      totalValueScore +
      annualSalaryScore +
      contractLengthScore;

    return {
      offer,
      score: Number(score.toFixed(3)),
    };
  });

  return evaluated.sort(
    (a, b) =>
      b.score - a.score ||
      b.offer.totalValueMillions -
        a.offer.totalValueMillions ||
      a.offer.id.localeCompare(b.offer.id)
  );
}
