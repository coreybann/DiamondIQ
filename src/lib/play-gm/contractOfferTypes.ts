export type GMContractOfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type GMContractOffer = {
  id: string;

  playerId: number;
  teamId: number;

  years: number;
  annualSalaryMillions: number;
  totalValueMillions: number;

  status: GMContractOfferStatus;

  createdDate: string;
  resolvedDate: string | null;
};
