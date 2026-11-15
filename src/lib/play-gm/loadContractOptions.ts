import freeAgents from "../../../public/data/free-agents-2027.json";

import type { GMUniverse } from "./universeTypes";
import type {
  GMContractOption,
  GMContractOptionType,
} from "./contractOptionTypes";

type OptionLoadResult = {
  options: GMContractOption[];
  unmatched: string[];
  ambiguous: string[];
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseOptionType(
  value: string
): GMContractOptionType | null {
  switch (value.toLowerCase().trim()) {
    case "club option":
      return "club";
    case "player option":
      return "player";
    case "mutual option":
      return "mutual";
    case "opt-out":
      return "opt-out";
    default:
      return null;
  }
}

export function loadContractOptions(
  universe: GMUniverse
): OptionLoadResult {
  const options: GMContractOption[] = [];
  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  const playersByName = new Map<
    string,
    typeof universe.players
  >();

  for (const player of universe.players) {
    const key = normalizeName(player.name);
    const existing = playersByName.get(key) ?? [];
    existing.push(player);
    playersByName.set(key, existing);
  }

  for (const record of freeAgents.players) {
    if (!record.contractOption) continue;

    const optionType = parseOptionType(
      record.contractOption
    );

    if (!optionType) {
      unmatched.push(record.name);
      continue;
    }

    const matches =
      playersByName.get(normalizeName(record.name)) ?? [];

    if (matches.length === 0) {
      unmatched.push(record.name);
      continue;
    }

    if (matches.length !== 1) {
      ambiguous.push(record.name);
      continue;
    }

    const player = matches[0];

    if (player.organizationId === null) {
      unmatched.push(record.name);
      continue;
    }

    options.push({
      playerId: player.id,
      teamId: player.organizationId,
      optionYear: 2027,
      optionType,
      status: "pending",
      optionSalaryMillions: null,
      buyoutMillions: null,
      decisionDate: null,
      source: null,
      verified: false,
    });
  }

  return {
    options,
    unmatched,
    ambiguous,
  };
}
