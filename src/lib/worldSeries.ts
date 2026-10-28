type WorldSeriesGame = {
  officialDate: string;
  status?: {
    abstractGameState?: string;
  };
  teams: {
    away: {
      team: { id: number };
      isWinner?: boolean;
    };
    home: {
      team: { id: number };
      isWinner?: boolean;
    };
  };
};

export async function getWorldSeriesEndDate(
  year: number
): Promise<string | null> {
  const url = new URL(
    "https://statsapi.mlb.com/api/v1/schedule"
  );

  url.searchParams.set("sportId", "1");
  url.searchParams.set("gameTypes", "W");
  url.searchParams.set("startDate", `${year}-10-01`);
  url.searchParams.set("endDate", `${year}-11-15`);

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Unable to load World Series schedule");
  }

  const data = await response.json();

  const games: WorldSeriesGame[] = (
    data.dates ?? []
  ).flatMap(
    (day: { games?: WorldSeriesGame[] }) => day.games ?? []
  );

  games.sort((a, b) =>
    a.officialDate.localeCompare(b.officialDate)
  );

  const wins = new Map<number, number>();

  for (const game of games) {
    if (game.status?.abstractGameState !== "Final") {
      continue;
    }

    const winner = game.teams.away.isWinner
      ? game.teams.away.team.id
      : game.teams.home.isWinner
        ? game.teams.home.team.id
        : null;

    if (winner === null) continue;

    const totalWins = (wins.get(winner) ?? 0) + 1;
    wins.set(winner, totalWins);

    if (totalWins === 4) {
      return game.officialDate;
    }
  }

  return null;
}
