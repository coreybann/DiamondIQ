import freeAgentData from "../../public/data/free-agents-2027.json";
import { projectContract } from "./contractProjections";
import contractData from "../../public/data/mlb-contracts-2026.json";
import arbitrationData from "../../public/data/arbitration-salary-projections-2027.json";
import preArbitrationData from "../../public/data/pre-arbitration-salary-projections-2027.json";
type ContractRecord = {
  player: string;
  team_code: string;
  salary_by_year: Record<
    string,
    {
      salary_millions: number | null;
      status: string;
    }
  >;
};

const records = contractData.records as ContractRecord[];

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
export function normalizeTeamCode(code: string): string {
  const teamCodeMap: Record<string, string> = {
    ATH: "OAK",
    SD: "SDP",
    SF: "SFG",
    TB: "TBR",
    CWS: "CHW",
    AZ: "ARI",
    KC: "KCR",
    WSH: "WSN",
  };

  return teamCodeMap[code] ?? code;
}
export function getPlayer2027Salary(
  playerName: string,
  teamCode: string
): number | null {
  const matches = records.filter(
    (record) =>
      record.team_code === teamCode &&
      normalizeName(record.player) === normalizeName(playerName)
  );

  if (matches.length !== 1) return null;

  const salary = matches[0].salary_by_year["2027"];

  if (
    !salary ||
    salary.status !== "salary_listed" ||
    salary.salary_millions === null ||
    !Number.isFinite(salary.salary_millions)
  ) {
    return null;
  }

  return salary.salary_millions;
}
type ArbitrationProjection = {
  player: string;
  team_code: string;
  estimated_salary_2027_millions: number;
  projection_method: string;
};

const arbitrationRecords =
  arbitrationData.records as ArbitrationProjection[];

export function getPlayer2027ArbitrationEstimate(
  playerName: string,
  teamCode: string
): number | null {
  const matches = arbitrationRecords.filter(
    (record) =>
      normalizeTeamCode(record.team_code) ===
        normalizeTeamCode(teamCode) &&
      normalizeName(record.player) === normalizeName(playerName)
  );

  if (matches.length !== 1) return null;

  const estimate = matches[0].estimated_salary_2027_millions;

  if (!Number.isFinite(estimate) || estimate < 0) {
    return null;
  }

  return estimate;
}
type PreArbitrationProjection = {
  player: string;
  team_code: string;
  estimated_salary_2027_millions: number;
  projection_method: string;
};

const preArbitrationRecords =
  preArbitrationData.records as PreArbitrationProjection[];

export function getPlayer2027PreArbitrationEstimate(
  playerName: string,
  teamCode: string
): number | null {
  const matches = preArbitrationRecords.filter(
    (record) =>
      normalizeTeamCode(record.team_code) ===
        normalizeTeamCode(teamCode) &&
      normalizeName(record.player) === normalizeName(playerName)
  );

  if (matches.length !== 1) return null;

  // Arbitration projections take priority.
  if (
    getPlayer2027ArbitrationEstimate(playerName, teamCode) !== null
  ) {
    return null;
  }

  // Listed contract salaries also take priority.
  if (getPlayer2027Salary(playerName, teamCode) !== null) {
    return null;
  }

  const estimate = matches[0].estimated_salary_2027_millions;

  if (!Number.isFinite(estimate) || estimate < 0) {
    return null;
  }

  return estimate;
}
type FreeAgentContractInput = {
  name: string;
  age: number;
  position: string;
  war2025_2026: number;
};

const freeAgentContractRecords =
  freeAgentData.players as FreeAgentContractInput[];

export function getPlayer2027FreeAgentProjection(
  playerName: string
): ReturnType<typeof projectContract> | null {
  const matches = freeAgentContractRecords.filter(
    (player) =>
      normalizeName(player.name) === normalizeName(playerName)
  );

  // Do not guess when a name is missing or ambiguous.
  if (matches.length !== 1) return null;

  const player = matches[0];

  if (
    !Number.isFinite(player.age) ||
    !Number.isFinite(player.war2025_2026) ||
    !player.position
  ) {
    return null;
  }

  const projection = projectContract(player);

  if (
    !Number.isFinite(projection.aavMillions) ||
    projection.aavMillions < 0 ||
    !Number.isFinite(projection.totalMillions) ||
    projection.years < 1
  ) {
    return null;
  }

  return projection;
}