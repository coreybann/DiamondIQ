export type RelieverStats = {
  saves?: number;
  holds?: number;
  saveOpportunities?: number;
  gamesFinished?: number;
  gamesPlayed?: number;
  gamesStarted?: number;
};

export type RelieverRole =
  | "Closer"
  | "Setup"
  | "Middle Relief"
  | "Insufficient Data";

function valid(value: number | undefined): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : 0;
}

export function rankReliever(stats: RelieverStats): {
  role: RelieverRole;
  score: number;
} {
  const saves = valid(stats.saves);
  const holds = valid(stats.holds);
  const opportunities = valid(stats.saveOpportunities);
  const finished = valid(stats.gamesFinished);
  const games = valid(stats.gamesPlayed);
  const starts = valid(stats.gamesStarted);

  const reliefAppearances = Math.max(0, games - starts);

  // Do not assign bullpen roles to primarily starting pitchers.
  if (
    games > 0 &&
    starts / games >= 0.3
  ) {
    return {
      role: "Insufficient Data",
      score: 0,
    };
  }

  if (reliefAppearances < 5) {
    return {
      role: "Insufficient Data",
      score: 0,
    };
  }

  const closerScore =
    saves * 4 +
    opportunities * 1.5 +
    finished * 0.5;

  const setupScore =
    holds * 3 +
    reliefAppearances * 0.25;

  let role: RelieverRole = "Middle Relief";

  if (
    saves >= 5 &&
    saves > holds
  ) {
    role = "Closer";
  } else if (holds >= 5) {
    role = "Setup";
  }

  const score =
    role === "Closer"
      ? 300 + closerScore
      : role === "Setup"
        ? 200 + setupScore
        : 100 + reliefAppearances * 0.25 + finished * 0.1;

  return { role, score };
}
