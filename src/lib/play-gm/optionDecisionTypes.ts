export type GMOptionDecisionClassification =
  | "under-contract"
  | "available";

export type GMOptionDecisionEvidence = {
  playerId: number;
  playerName: string;
  optionYear: number;

  classification: GMOptionDecisionClassification;

  decisionDate: string | null;
  recordedAt: string | null;
  source: string | null;

  verificationStatus: "source-recorded-unreviewed";

  // A headline classification does not establish
  // the exact legal outcome of a contract option.
  exactDecision:
    | "exercised"
    | "declined"
    | "opted-out"
    | null;
};
