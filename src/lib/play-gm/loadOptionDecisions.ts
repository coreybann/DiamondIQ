import statusData from "../../../public/data/free-agent-status-2027.json";

import type { GMUniverse } from "./universeTypes";
import type {
  GMOptionDecisionEvidence,
  GMOptionDecisionClassification,
} from "./optionDecisionTypes";

type DecisionLoadResult = {
  decisions: GMOptionDecisionEvidence[];
  unmatched: string[];
  ambiguous: string[];
  invalid: string[];
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function loadOptionDecisions(
  universe: GMUniverse
): DecisionLoadResult {
  const decisions: GMOptionDecisionEvidence[] = [];
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  const invalid: string[] = [];

  const playersByName = new Map<
    string,
    typeof universe.players
  >();

  for (const player of universe.players) {
    const key = normalizeName(player.name);
    const matches = playersByName.get(key) ?? [];

    matches.push(player);
    playersByName.set(key, matches);
  }

  for (const [name, record] of Object.entries(
    statusData.players
  )) {
    let classification:
      | GMOptionDecisionClassification
      | null = null;

    if (record.status === "Under Contract") {
      classification = "under-contract";
    } else if (record.status === "Available") {
      classification = "available";
    }

    if (!classification) {
      invalid.push(name);
      continue;
    }

    const matches =
      playersByName.get(normalizeName(name)) ?? [];

    if (matches.length === 0) {
      unmatched.push(name);
      continue;
    }

    if (matches.length !== 1) {
      ambiguous.push(name);
      continue;
    }

    const player = matches[0];

    decisions.push({
      playerId: player.id,
      playerName: player.name,
      optionYear: 2027,
      classification,
      decisionDate: "optionDecisionDate" in record ? record.optionDecisionDate : null,
      recordedAt: record.verifiedAt ?? null,
      source: record.source ?? null,
      verificationStatus: "source-recorded-unreviewed",
      exactDecision: null,
    });
  }

  return {
    decisions,
    unmatched,
    ambiguous,
    invalid,
  };
}
