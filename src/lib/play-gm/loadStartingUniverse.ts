import { createUniverse } from "./createUniverse";
import { loadMLBTeams } from "./loadMLBTeams";
import { loadMLBRoster } from "./loadMLBRoster";
import { loadFreeAgentCandidates } from "./loadFreeAgentCandidates";
import { loadFreeAgentPlayers } from "./loadFreeAgentPlayers";
import { enrichFreeAgentPlayers } from "./enrichFreeAgentPlayers";
import type { GMUniverse } from "./universeTypes";
import verifiedOptionData from "../../../public/data/play-gm-verified-option-decisions-2027.json";

const START_DATE = "2026-11-14";
const START_SEASON = 2027;

export async function loadStartingUniverse(): Promise<GMUniverse> {
  const teams = await loadMLBTeams();

  const rosters = await Promise.all(
    teams.map(async (team) => ({
      teamId: team.id,
      players: await loadMLBRoster(team.id),
    }))
  );

  const players = rosters.flatMap((roster) => roster.players);

  const playerIds = new Set(players.map((player) => player.id));

  if (playerIds.size !== players.length) {
    throw new Error(
      "Duplicate players detected across MLB organizations."
    );
  }

  const teamsWithRosters = teams.map((team) => {
    const roster = rosters.find(
      (entry) => entry.teamId === team.id
    );

    if (!roster || roster.players.length === 0) {
      throw new Error(
        `Missing starting roster for ${team.name}.`
      );
    }

    if (roster.players.length > 40) {
      throw new Error(
        `Invalid 40-man roster size for ${team.name}.`
      );
    }

    return {
      ...team,
      playerIds: roster.players.map((player) => player.id),
    };
  });

  const { candidates, unmatched } = loadFreeAgentCandidates();

  if (unmatched.length > 0) {
    throw new Error(
      `Unmatched MLBPA free agents: ${unmatched.join(", ")}`
    );
  }

  const freeAgentPlayers = loadFreeAgentPlayers(
    candidates,
    players
  );

  const enrichedFreeAgents = await enrichFreeAgentPlayers(
    freeAgentPlayers,
    START_DATE
  );

  const universe = createUniverse({
    teams: teamsWithRosters,
    players: [...players, ...enrichedFreeAgents],
    currentDate: START_DATE,
    season: START_SEASON,
  });

  // Establish starting free-agent eligibility using
  // documented MLBPA status and the initialized roster.
  // Option-decision candidates remain unresolved until
  // their individual eligibility is verified.
  universe.freeAgentCandidates = candidates.map((candidate) => {
    const rostered = universe.teams.some((team) =>
      team.playerIds.includes(candidate.playerId)
    );

    const hasMLBPAEvidence = candidate.evidence.some(
      (evidence) => evidence.type === "mlbpa-free-agent"
    );

    if (
      candidate.availability === "reported-signed" ||
      rostered
    ) {
      return {
        ...candidate,
        availability: candidate.availability,
      };
    }

    const verifiedDecision = verifiedOptionData.decisions.find(
      (decision) =>
        decision.playerId === candidate.playerId &&
        decision.decisionDate <= START_DATE
    );

    if (verifiedDecision) {
      return {
        ...candidate,
        availability: "available" as const,
        evidence: [
          ...candidate.evidence,
          {
            type: "verified-option-decision" as const,
            date: verifiedDecision.decisionDate,
            source: verifiedDecision.source,
            description:
              `${verifiedDecision.name}: ${verifiedDecision.decision}`,
          },
        ],
      };
    }

    if (hasMLBPAEvidence) {
      return {
        ...candidate,
        availability: "available" as const,
      };
    }

    return {
      ...candidate,
      availability: "unresolved" as const,
    };
  });

  return universe;
}
