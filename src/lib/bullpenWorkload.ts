export type PitchingAppearance = {
  date: string;
  pitches: number;
};

export type BullpenWorkload = {
  pitchesLast3Days: number;
  pitchesLast7Days: number;
  appearancesLast3Days: number;
  appearancesLast7Days: number;
  daysRest: number | null;
  pitchedConsecutiveDays: boolean;
};

export function calculateBullpenWorkload(
  appearances: PitchingAppearance[],
  asOfDate: string
): BullpenWorkload {
  const today = Date.parse(`${asOfDate}T00:00:00Z`);

  const games = appearances
    .map((game) => ({
      ...game,
      timestamp: Date.parse(`${game.date}T00:00:00Z`),
    }))
    .filter(
      (game) =>
        Number.isFinite(game.timestamp) &&
        game.timestamp <= today
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  const daysAgo = (timestamp: number) =>
    Math.round((today - timestamp) / 86400000);

  const last3 = games.filter(
    (game) => daysAgo(game.timestamp) < 3
  );

  const last7 = games.filter(
    (game) => daysAgo(game.timestamp) < 7
  );

  const latest = games[0];

  const daysRest = latest
    ? Math.max(0, daysAgo(latest.timestamp) - 1)
    : null;

  return {
    pitchesLast3Days: last3.reduce(
      (sum, game) => sum + game.pitches,
      0
    ),
    pitchesLast7Days: last7.reduce(
      (sum, game) => sum + game.pitches,
      0
    ),
    appearancesLast3Days: last3.length,
    appearancesLast7Days: last7.length,
    daysRest,
    pitchedConsecutiveDays:
      games.some((game) => daysAgo(game.timestamp) === 0) &&
      games.some((game) => daysAgo(game.timestamp) === 1),
  };
}
