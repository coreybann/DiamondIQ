import { getDefaultMLBSeason } from "@/lib/mlbSeason";
type Pitcher = {
  id: number;
  name: string;
  games: number;
  wins: number;
  losses: number;
  era: string;
  whip: string;
  innings: string;
  strikeouts: number;
  walks: number;
};

type MLBStat = {
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  era?: string;
  whip?: string;
  inningsPitched?: string;
  strikeOuts?: number;
  baseOnBalls?: number;
};

type MLBPlayer = {
  person: {
    id: number;
    fullName: string;
    stats?: {
      group?: { displayName: string };
      splits?: { stat: MLBStat }[];
    }[];
  };
};

async function getPitchingStats(teamId: string): Promise<Pitcher[]> {
  const season = getDefaultMLBSeason();
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=fullSeason&season=${season}&hydrate=person(stats(type=season,group=pitching,season=2026))`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load pitching statistics");
  }

  const data = await response.json();

  return ((data.roster ?? []) as MLBPlayer[])
    .map((entry) => {
      const statGroup = entry.person?.stats?.find(
        (group) => group.group?.displayName === "pitching"
      );

      const stat = statGroup?.splits?.[0]?.stat;

      if (!stat) return null;

      return {
        id: entry.person.id,
        name: entry.person.fullName,
        games: stat.gamesPlayed ?? 0,
        wins: stat.wins ?? 0,
        losses: stat.losses ?? 0,
        era: stat.era ?? "-",
        whip: stat.whip ?? "-",
        innings: stat.inningsPitched ?? "0.0",
        strikeouts: stat.strikeOuts ?? 0,
        walks: stat.baseOnBalls ?? 0,
      };
    })
    .filter((player): player is Pitcher => player !== null)
    .sort((a, b) => b.strikeouts - a.strikeouts);
}

export default async function PitchingStats({
  teamId,
}: {
  teamId: string;
}) {
  let pitchers: Pitcher[] = [];
  let error = false;

  try {
    pitchers = await getPitchingStats(teamId);
  } catch {
    error = true;
  }

  return (
    <section className="mt-14">
      <h2 className="mb-2 text-3xl font-bold">
        {getDefaultMLBSeason()} Pitching Statistics
      </h2>

      <p className="mb-6 text-sm text-slate-400">
        MLB regular-season pitching statistics.
      </p>

      {error ? (
        <p className="text-red-300">
          Pitching statistics could not be loaded.
        </p>
      ) : pitchers.length === 0 ? (
        <p className="text-slate-400">
          No 2026 pitching statistics are currently available.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#162a43] text-slate-300">
              <tr>
                {[
                  "Player", "G", "W", "L", "ERA",
                  "WHIP", "IP", "SO", "BB"
                ].map((heading) => (
                  <th
  key={heading}
  className={`px-4 py-4 whitespace-nowrap ${
    heading === "Player"
      ? "sticky left-0 z-20 min-w-[150px] bg-[#162a43] md:static"
      : ""
  }`}
>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pitchers.map((player) => (
                <tr
                  key={player.id}
                  className="border-t border-slate-700 hover:bg-white/5"
                >
                  <td className="sticky left-0 z-10 min-w-[150px] bg-[#081321] px-4 py-4 font-semibold whitespace-nowrap md:static md:bg-transparent">
                    {player.name}
                  </td>
                  <td className="px-4 py-4">{player.games}</td>
                  <td className="px-4 py-4">{player.wins}</td>
                  <td className="px-4 py-4">{player.losses}</td>
                  <td className="px-4 py-4">{player.era}</td>
                  <td className="px-4 py-4">{player.whip}</td>
                  <td className="px-4 py-4">{player.innings}</td>
                  <td className="px-4 py-4">{player.strikeouts}</td>
                  <td className="px-4 py-4">{player.walks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
