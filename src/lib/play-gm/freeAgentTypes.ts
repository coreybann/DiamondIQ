export type GMFreeAgentAvailability =
  | "available"
  | "reported-signed"
  | "under-contract"
  | "unresolved";

export type GMFreeAgentEvidenceType =
  | "mlbpa-free-agent"
  | "signing-report"
  | "roster-snapshot"
  | "projected-free-agent"
  | "verified-option-decision";

export type GMFreeAgentEvidence = {
  type: GMFreeAgentEvidenceType;
  date: string | null;
  source: string | null;
  description: string;
};

export type GMFreeAgentCandidate = {
  playerId: number;
  name: string;
  formerTeam: string | null;
  reportedSigningTeam: string | null;
  availability: GMFreeAgentAvailability;
  evidence: GMFreeAgentEvidence[];
};
