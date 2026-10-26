export type FreeAgentStatus = "Available" | "Signed";

export type FreeAgent = {
  id: number;
  name: string;
  position: string;
  age: number | null;
  previousTeam: string;
  status: FreeAgentStatus;
  offseason: string;
  signedTeam?: string;
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

export const freeAgents: FreeAgent[] = [];