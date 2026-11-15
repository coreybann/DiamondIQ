export type GMContractOptionType =
  | "club"
  | "player"
  | "mutual"
  | "opt-out";

export type GMContractOptionStatus =
  | "pending"
  | "exercised"
  | "declined"
  | "opted-out";

export type GMContractOption = {
  playerId: number;
  teamId: number;

  optionYear: number;
  optionType: GMContractOptionType;
  status: GMContractOptionStatus;

  optionSalaryMillions: number | null;
  buyoutMillions: number | null;

  decisionDate: string | null;

  source: string | null;
  verified: boolean;
};
