import type { GMPlayer } from "./universeTypes";
import type { GMFreeAgentCandidate } from "./freeAgentTypes";

export function loadFreeAgentPlayers(
  candidates: GMFreeAgentCandidate[],
  existingPlayers: GMPlayer[]
): GMPlayer[] {
  const existingIds = new Set(
    existingPlayers.map((player) => player.id)
  );

  const addedIds = new Set<number>();
  const freeAgents: GMPlayer[] = [];

  for (const candidate of candidates) {
    if (existingIds.has(candidate.playerId)) {
      continue;
    }

    if (addedIds.has(candidate.playerId)) {
      throw new Error(
        `Duplicate free-agent player ID: ${candidate.playerId}`
      );
    }

    addedIds.add(candidate.playerId);

    freeAgents.push({
      id: candidate.playerId,
      name: candidate.name,
      age: null,
      position: "N/A",
      bats: "—",
      throws: "—",

      organizationId: null,
      rosterStatus: "free-agent",
      onFortyMan: false,
      onActiveRoster: false,

      salaryMillions: null,
      salaryType: "unknown",
      contractStatus: "Availability unresolved",

      prospectProjectionScore: null,
      prospectDevelopmentScore: null,
    });
  }

  return freeAgents;
}
