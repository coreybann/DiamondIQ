import type { BullpenWorkload } from "./bullpenWorkload";

export type FatigueLevel =
  | "Low"
  | "Moderate"
  | "High"
  | "Very High"
  | "Unknown";

export type BullpenFatigue = {
  score: number | null;
  level: FatigueLevel;
};

export function calculateBullpenFatigue(
  workload: BullpenWorkload
): BullpenFatigue {
  if (workload.daysRest === null) {
    return { score: null, level: "Unknown" };
  }

  const score = Math.round(
    Math.min(35, workload.pitchesLast3Days * 0.5) +
    Math.min(25, workload.pitchesLast7Days * 0.2) +
    Math.min(15, workload.appearancesLast3Days * 5) +
    Math.min(10, workload.appearancesLast7Days * 2.5) +
    (workload.pitchedConsecutiveDays ? 10 : 0) +
    (workload.daysRest === 0 ? 5 : 0)
  );

  let level: FatigueLevel = "Low";

  if (score >= 75) {
    level = "Very High";
  } else if (score >= 50) {
    level = "High";
  } else if (score >= 25) {
    level = "Moderate";
  }

  return { score, level };
}
