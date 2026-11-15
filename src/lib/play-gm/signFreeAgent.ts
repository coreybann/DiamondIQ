import type { GMUniverse } from "./universeTypes";

export function signFreeAgent(
  universe: GMUniverse,
  offerId: string
): GMUniverse {
  const offer = universe.contractOffers?.find(
    (entry) => entry.id === offerId
  );

  if (!offer) {
    throw new Error("Contract offer does not exist.");
  }

  if (offer.status !== "accepted") {
    throw new Error(
      "Only accepted contract offers can become signings."
    );
  }

  const acceptedOffers = (universe.contractOffers ?? []).filter(
    (entry) =>
      entry.playerId === offer.playerId &&
      entry.status === "accepted"
  );

  if (acceptedOffers.length !== 1) {
    throw new Error(
      "A player must have exactly one accepted contract offer."
    );
  }

  const player = universe.players.find(
    (entry) => entry.id === offer.playerId
  );

  if (!player) {
    throw new Error("Player does not exist.");
  }

  const team = universe.teams.find(
    (entry) => entry.id === offer.teamId
  );

  if (!team) {
    throw new Error("Signing team does not exist.");
  }

  if (
    player.organizationId !== null ||
    player.rosterStatus !== "free-agent" ||
    player.onFortyMan ||
    player.onActiveRoster ||
    universe.teams.some(
      (entry) => entry.playerIds.includes(player.id)
    )
  ) {
    throw new Error(
      "Player is already assigned to an organization."
    );
  }

  const candidate = universe.freeAgentCandidates?.find(
    (entry) => entry.playerId === player.id
  );

  if (!candidate || candidate.availability !== "available") {
    throw new Error(
      "Player availability has not been confirmed for signing."
    );
  }

  const fortyManCount = universe.players.filter(
    (entry) =>
      entry.organizationId === team.id &&
      entry.onFortyMan
  ).length;

  if (fortyManCount >= 40) {
    throw new Error(
      "The signing team has no available 40-man roster spot."
    );
  }

  if (
    !Number.isInteger(offer.years) ||
    offer.years < 1 ||
    offer.years > 15 ||
    !Number.isFinite(offer.annualSalaryMillions) ||
    offer.annualSalaryMillions < 0.8 ||
    offer.annualSalaryMillions > 100 ||
    !Number.isFinite(offer.totalValueMillions) ||
    Math.abs(
      offer.totalValueMillions -
      offer.years * offer.annualSalaryMillions
    ) > 0.001
  ) {
    throw new Error("Accepted contract terms are invalid.");
  }

  const updatedPlayers = universe.players.map(
    (entry) =>
      entry.id === player.id
        ? {
            ...entry,
            organizationId: team.id,
            rosterStatus: "40-man" as const,
            onFortyMan: true,
            onActiveRoster: false,
            salaryMillions: offer.annualSalaryMillions,
            salaryType: "simulated" as const,
            contractStatus:
              `${offer.years} years / $${offer.totalValueMillions}M`,
          }
        : entry
  );

  const updatedTeams = universe.teams.map(
    (entry) =>
      entry.id === team.id
        ? {
            ...entry,
            playerIds: [...entry.playerIds, player.id],
            payrollMillions:
              entry.payrollMillions +
              offer.annualSalaryMillions,
          }
        : entry
  );

  return {
    ...universe,
    players: updatedPlayers,
    teams: updatedTeams,
    freeAgentCandidates: universe.freeAgentCandidates?.map(
      (entry) =>
        entry.playerId === player.id
          ? {
              ...entry,
              availability: "under-contract" as const,
            }
          : entry
    ),
    transactions: [
      ...universe.transactions,
      {
        id: crypto.randomUUID(),
        date: universe.currentDate,
        type: "signing" as const,
        teamIds: [team.id],
        playerIds: [player.id],
        description:
          `${team.name} signed ${player.name} ` +
          `to a ${offer.years}-year, ` +
          `$${offer.totalValueMillions}M contract.`,
      },
    ],
  };
}
