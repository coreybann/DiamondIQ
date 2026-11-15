import mlbpaData from "../../../public/data/mlbpa-confirmed-free-agents-2027.json";
import idData from "../../../public/data/free-agent-mlb-ids-2027.json";
import signingData from "../../../public/data/free-agent-signing-reports-2027.json";
import optionData from "../../../public/data/free-agent-status-2027.json";
import freeAgentData from "../../../public/data/free-agents-2027.json";
import freeAgentTeams from "../../../public/data/free-agent-teams-2026.json";

import type {
  GMFreeAgentCandidate,
  GMFreeAgentEvidence,
} from "./freeAgentTypes";

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function loadFreeAgentCandidates(): {
  candidates: GMFreeAgentCandidate[];
  unmatched: string[];
} {
  const candidates: GMFreeAgentCandidate[] = [];
  const unmatched: string[] = [];

  const exactIds = new Map<string, number>();
  const normalizedIds = new Map<string, Set<number>>();

  for (const [name, id] of Object.entries(idData.matched)) {
    exactIds.set(name, id);

    const key = normalizeName(name);
    const matches = normalizedIds.get(key) ?? new Set<number>();

    matches.add(id);
    normalizedIds.set(key, matches);
  }

  const playerAliases: Record<string, string> = {
    "Enrique Hernandez": "Kiké Hernández",
  };

  function resolvePlayerId(name: string): number | undefined {
    const canonicalName = playerAliases[name] ?? name;

    const exact = exactIds.get(canonicalName);

    if (exact !== undefined) {
      return exact;
    }

    const matches = normalizedIds.get(normalizeName(canonicalName));

    if (!matches || matches.size !== 1) {
      return undefined;
    }

    return [...matches][0];
  }

  const signingsById = new Map(
    signingData.signings.map((signing) => [
      signing.playerId,
      signing,
    ])
  );

  const seenIds = new Set<number>();

  for (const player of mlbpaData.players) {
    const playerId = resolvePlayerId(player.name);

    if (playerId === undefined) {
      unmatched.push(player.name);
      continue;
    }

    if (seenIds.has(playerId)) {
      throw new Error(`Duplicate MLBPA player ID: ${playerId}`);
    }

    seenIds.add(playerId);

    const evidence: GMFreeAgentEvidence[] = [
      {
        type: "mlbpa-free-agent",
        date: mlbpaData.sourceDate,
        source: mlbpaData.source,
        description:
          "Listed in the MLBPA free-agent announcement.",
      },
    ];

    const signing = signingsById.get(playerId);

    if (signing) {
      evidence.push({
        type: "signing-report",
        date: signing.date,
        source: signing.sources[0]?.url ?? null,
        description:
          `Reported signing with ${signing.team}.`,
      });
    }

    candidates.push({
      playerId,
      name: player.name,
      formerTeam: player.team,
      reportedSigningTeam: signing?.team ?? null,
      availability: signing
        ? "reported-signed"
        : "unresolved",
      evidence,
    });
  }

  // Add players who became potential free agents through
  // offseason option decisions but were absent from the
  // original MLBPA announcement.
  for (const [name, record] of Object.entries(optionData.players)) {
    if (record.status !== "Available") {
      continue;
    }

    const playerId = resolvePlayerId(name);

    if (playerId === undefined) {
      unmatched.push(name);
      continue;
    }

    if (seenIds.has(playerId)) {
      continue;
    }

    seenIds.add(playerId);

    const signing = signingsById.get(playerId);

    const evidence: GMFreeAgentEvidence[] = [
      {
        type: "projected-free-agent",
        date: "optionDecisionDate" in record
          ? record.optionDecisionDate
          : null,
        source: record.source ?? null,
        description:
          "Listed as available in the offseason option-status dataset; independent eligibility review required.",
      },
    ];

    if (signing) {
      evidence.push({
        type: "signing-report",
        date: signing.date,
        source: signing.sources[0]?.url ?? null,
        description: `Reported signing with ${signing.team}.`,
      });
    }

    candidates.push({
      playerId,
      name,
      formerTeam: null,
      reportedSigningTeam: signing?.team ?? null,
      availability: signing ? "reported-signed" : "unresolved",
      evidence,
    });
  }

  // Include remaining players from DiamondIQ's shared
  // Free Agency database without assuming they are unsigned.
  for (const player of freeAgentData.players) {
    const playerId = resolvePlayerId(player.name);

    if (playerId === undefined) {
      unmatched.push(player.name);
      continue;
    }

    if (seenIds.has(playerId)) {
      continue;
    }

    seenIds.add(playerId);

    const signing = signingsById.get(playerId);

    const evidence: GMFreeAgentEvidence[] = [
      {
        type: "projected-free-agent",
        date: null,
        source: null,
        description:
          "Included in DiamondIQ's Free Agency database; availability not independently established.",
      },
    ];

    if (signing) {
      evidence.push({
        type: "signing-report",
        date: signing.date,
        source: signing.sources[0]?.url ?? null,
        description: `Reported signing with ${signing.team}.`,
      });
    }

    candidates.push({
      playerId,
      name: player.name,
      formerTeam:
        (freeAgentTeams.teams as Record<string, string>)[player.name] ??
        null,
      reportedSigningTeam: signing?.team ?? null,
      availability: signing ? "reported-signed" : "unresolved",
      evidence,
    });
  }

  return {
    candidates,
    unmatched,
  };
}
