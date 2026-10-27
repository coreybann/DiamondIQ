import contractData from "../../public/data/mlb-contract-comparables.json";

export type HistoricalContract = {
  player: string;
  position: string;
  ageAtSigning: number;
  priorTwoYearWar: number;
  team: string;
  contractStartYear: number;
  years: number;
  totalMillions: number;
  aavMillions: number;
  source?: string;
    guaranteedYears?: number;
  guaranteedTotalMillions?: number;
  maximumYears?: number;
  maximumTotalMillions?: number;
  optionType?: string;
  notes?: string;
};

export const historicalContracts: HistoricalContract[] =
  contractData.contracts;
