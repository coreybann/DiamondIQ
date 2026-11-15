import contracts from "../../../public/data/mlb-contracts-2026.json";
import type { GMPlayer, GMTeam } from "./universeTypes";

type RecoveredEstimate = {
  playerId: number;
  salaryMillions: number;
};

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeTeam(code: string): string {
  const aliases: Record<string, string> = {
    AZ: "ARI",
    ATH: "OAK",
    CWS: "CHW",
    KC: "KCR",
    SD: "SDP",
    SF: "SFG",
    TB: "TBR",
    WSH: "WSN",
  };

  return aliases[code.toUpperCase()] ?? code.toUpperCase();
}

export function recoverArbitrationEstimates(
  players: GMPlayer[],
  teams: GMTeam[]
): RecoveredEstimate[] {
  const teamById = new Map(
    teams.map((team) => [team.id, team])
  );

  const recovered: RecoveredEstimate[] = [];

  for (const player of players) {
    if (
      player.salaryType !== "unknown" ||
      player.organizationId === null
    ) {
      continue;
    }

    const team = teamById.get(player.organizationId);

    if (!team) continue;

    const matches = contracts.records.filter((record) => {
      const salary = record.salary_by_year?.["2027"];

      return (
        normalizeName(record.player) ===
          normalizeName(player.name) &&
        normalizeTeam(record.team_code) ===
          normalizeTeam(team.abbreviation) &&
        record.mlb_player_id == null &&
        salary?.status === "salary_listed" &&
        typeof salary.salary_millions === "number" &&
        Number.isFinite(salary.salary_millions) &&
        salary.salary_millions >= 0 &&
        /^Arb-\d+\s*\(~/.test(salary.raw ?? "")
      );
    });

    if (matches.length !== 1) continue;

    const salary = matches[0].salary_by_year?.["2027"];

    if (typeof salary?.salary_millions !== "number") {
      continue;
    }

    recovered.push({
      playerId: player.id,
      salaryMillions: salary.salary_millions,
    });
  }

  return recovered;
}
