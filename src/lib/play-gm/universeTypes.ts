import type { GMContractOffer } from "./contractOfferTypes";
import type { GMFreeAgentCandidate } from "./freeAgentTypes";

export type GMPlayer = {
  id: number;
  name: string;
  age: number | null;
  position: string;
  bats: string;
  throws: string;

  organizationId: number | null;

  rosterStatus:
    | "active"
    | "40-man"
    | "minor-league"
    | "injured"
    | "free-agent";

  onFortyMan: boolean;
  onActiveRoster: boolean;

  salaryMillions: number | null;
  salaryType:
    | "listed"
    | "projected"
    | "simulated"
    | "unknown";

  contractStatus: string;

  prospectProjectionScore: number | null;
  prospectDevelopmentScore: number | null;
};

export type GMTeam = {
  id: number;
  name: string;
  abbreviation: string;

  playerIds: number[];

  payrollMillions: number;
  payrollKnown: boolean;
};

export type GMTransaction = {
  id: string;
  date: string;
  type:
    | "trade"
    | "signing"
    | "release"
    | "roster-move";

  teamIds: number[];
  playerIds: number[];

  description: string;
};

export type GMUniverse = {
  schemaVersion: 1;

  initializedAt: string;
  currentDate: string;
  season: number;

  teams: GMTeam[];
  players: GMPlayer[];
  transactions: GMTransaction[];

  // Optional for compatibility with existing franchise saves.
  freeAgentCandidates?: GMFreeAgentCandidate[];

  // Optional for compatibility with existing franchise saves.
  contractOffers?: GMContractOffer[];
};
