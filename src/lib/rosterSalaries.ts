
import contractData from "../../public/data/mlb-contracts-2026.json";

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
