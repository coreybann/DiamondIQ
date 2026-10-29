import freeAgentTeams from "../../public/data/free-agent-teams-2026.json";
import verifiedStatusData from "../../public/data/free-agent-status-2027.json";
export type FreeAgentStatus =
  | "Potential Free Agent"
  | "Pending Option"
| "Under Contract"
  | "Available"
  | "Signing Reported"
  | "Signed";

export type FreeAgent = {
  id: number;
  name: string;
  position: string;
  age: number | null;
  previousTeam: string;
  status: FreeAgentStatus;
    contractOption?: string | null;
  offseason: string;
  signedTeam?: string;
  signingDate?: string;
  contractYears?: number;
  contractValue?: number;
};

export function getCurrentOffseason(): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  const startYear = month >= 9 ? year : year - 1;

  return `${startYear}-${startYear + 1}`;
}

import freeAgentData from "../../public/data/free-agents-2027.json";
import playerIdData from "../../public/data/free-agent-mlb-ids-2027.json";

const matchedIds: Record<string, number> = playerIdData.matched;
const verifiedStatuses = verifiedStatusData.players as Record<
  string,
  {
    status: FreeAgentStatus;
    verifiedAt: string;
    source: string;
  }
>;
export const freeAgents: FreeAgent[] = freeAgentData.players.map(
  (player, index) => ({
    id: matchedIds[player.name] ?? -(index + 1),
    name: player.name,
    position: player.position,
    age: player.age,
  previousTeam: (freeAgentTeams.teams as Record<string, string>)[player.name] ?? "N/A",
  contractOption: player.contractOption,
      status:
      verifiedStatuses[player.name]?.status ??
      (player.contractOption
        ? "Pending Option"
        : "Potential Free Agent"),
    offseason: "2026-2027",
  })
);