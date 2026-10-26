
import Link from "next/link";
import PerformanceTrendChart from "../../PerformanceTrendChart";
export default async function FreeAgentPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
const response = await fetch(
  `https://statsapi.mlb.com/api/v1/people/${id}?hydrate=currentTeam`,
  { next: { revalidate: 3600 } }
);

const data = response.ok ? await response.json() : null;
const player = data?.people?.[0] ?? null;
const position = player?.primaryPosition?.name ?? "N/A";
const isPitcher = player?.primaryPosition?.abbreviation === "P";
const age = player?.currentAge ?? "N/A";
const team = player?.currentTeam?.name ?? "Not Listed";  
const statGroup = isPitcher ? "pitching" : "hitting";

const statsResponse = await fetch(
  `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&group=${statGroup}&season=2026`,
  { next: { revalidate: 3600 } }
);

const statsData = statsResponse.ok
  ? await statsResponse.json()
  : null;

const battingStats = statsData?.stats?.[0]?.splits?.[0]?.stat ?? null;
const historySeasons = [2024, 2025, 2026];

const seasonHistory = await Promise.all(
  historySeasons.map(async (season) => {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&group=${statGroup}&season=${season}`,
      { next: { revalidate: 3600 } }
    );

    const data = response.ok ? await response.json() : null;

    return {
      season,
      stats: data?.stats?.[0]?.splits?.[0]?.stat ?? null,
    };
  })
);
return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/free-agency"
        className="text-sm text-blue-400 hover:underline"
      >
        ← Back to Free Agency
      </Link>

      <h1 className="mt-8 text-3xl font-bold">
       {player?.fullName ?? "Player Not Found"}
      </h1>

      <p className="mt-4 text-gray-400">
        MLB Player ID: {id}
      </p>
      <div className="mt-6 flex flex-wrap gap-6 text-gray-300">
  <p>Position: {position}</p>
  <p>Age: {age}</p>
  <p>Team: {team}</p>
</div>
<section className="mt-10">
  <h2 className="mb-5 text-2xl font-bold">
    2026 {isPitcher ? "Pitching" : "Batting"} Statistics
  </h2>

  {battingStats ? (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
     {(isPitcher
  ? [
      ["ERA", battingStats.era],
      ["WHIP", battingStats.whip],
      ["SO", battingStats.strikeOuts],
      ["IP", battingStats.inningsPitched],
    ]
  : [
      ["AVG", battingStats.avg],
      ["HR", battingStats.homeRuns],
      ["RBI", battingStats.rbi],
      ["OPS", battingStats.ops],
    ]
).map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-gray-800 bg-gray-900 p-5"
        >
          <p className="text-sm text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold">
            {value ?? "N/A"}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-gray-400">
      No batting statistics available for 2026.
    </p>
  )}
</section>

<section className="mt-12">
  <h2 className="mb-5 text-2xl font-bold">
    3-Year Performance History
  </h2>

  <div className="overflow-x-auto rounded-xl border border-gray-800">
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-900 text-gray-400">
        <tr>
          <th className="px-4 py-3">Season</th>
          {(isPitcher
            ? ["ERA", "WHIP", "SO", "IP"]
            : ["AVG", "HR", "RBI", "OPS"]
          ).map((stat) => (
            <th key={stat} className="px-4 py-3">
              {stat}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {seasonHistory.map(({ season, stats }) => (
          <tr
            key={season}
            className="border-t border-gray-800"
          >
            <td className="px-4 py-4 font-semibold">
              {season}
            </td>

            {(isPitcher
              ? [
                  stats?.era,
                  stats?.whip,
                  stats?.strikeOuts,
                  stats?.inningsPitched,
                ]
              : [
                  stats?.avg,
                  stats?.homeRuns,
                  stats?.rbi,
                  stats?.ops,
                ]
            ).map((value, index) => (
              <td key={index} className="px-4 py-4">
                {value ?? "N/A"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>

<PerformanceTrendChart
  isPitcher={isPitcher}
  data={seasonHistory.map(({ season, stats }) => {
    const rawValue = isPitcher ? stats?.era : stats?.ops;

    return {
      season,
      value:
        rawValue !== undefined &&
        rawValue !== null &&
        rawValue !== ""
          ? Number(rawValue)
          : null,
    };
  })}
/>

    </main>
  );
}
