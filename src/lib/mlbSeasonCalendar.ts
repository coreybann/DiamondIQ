type MLBSeasonCalendar = {
  season: number;
  firstDate: string;
  lastDate: string;
};

type ScheduleDate = {
  date: string;
  games?: unknown[];
};

export async function getMLBSeasonCalendar(
  season: number
): Promise<MLBSeasonCalendar> {
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=${season}&gameTypes=R`,
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load MLB season calendar");
  }

  const data: { dates?: ScheduleDate[] } = await response.json();

  const dates = (data.dates ?? [])
    .filter((entry) => (entry.games?.length ?? 0) > 0)
    .map((entry) => entry.date)
    .sort();

  if (dates.length === 0) {
    throw new Error("No regular-season dates found");
  }

  return {
    season,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
  };
}
