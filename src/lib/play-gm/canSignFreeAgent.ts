import type { GMUniverse } from "./universeTypes";

export type GMFreeAgentSigningEligibility = {
  eligible: boolean;
  reason: string;
};

export function canSignFreeAgent(
  universe: GMUniverse,
  playerId: number
): GMFreeAgentSigningEligibility {
  const player = universe.players.find(
    (entry) => entry.id === playerId
  );

  if (!player) {
    return {
      eligible: false,
      reason: "Player does not exist in this franchise.",
    };
  }

  if (
    player.organizationId !== null ||
    player.rosterStatus !== "free-agent" ||
    player.onFortyMan ||
    player.onActiveRoster ||
    universe.teams.some((team) =>
      team.playerIds.includes(playerId)
    )
  ) {
    return {
      eligible: false,
      reason: "Player is already assigned to an MLB organization.",
    };
  }

  const candidate = universe.freeAgentCandidates?.find(
    (entry) => entry.playerId === playerId
  );

  if (!candidate) {
    return {
      eligible: false,
      reason: "Player availability has not been established.",
    };
  }

  if (candidate.availability !== "available") {
    return {
      eligible: false,
      reason: `Player availability is ${candidate.availability}.`,
    };
  }

  return {
    eligible: true,
    reason: "Player is eligible to negotiate a contract.",
  };
}
