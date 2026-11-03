import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProspectEvaluation from "../../ProspectEvaluation";
import ProspectDevelopmentTracker from "../../ProspectDevelopmentTracker";

type StatRecord = {
  season?: string;
  team?: { name?: string };
  sport?: { id?: number };
  stat?: Record<string, string | number>;
};

const levelNames: Record<number, string> = {
  11: "Triple-A",
  12: "Double-A",
  13: "High-A",
  14: "Single-A",
  16: "Rookie",
  17: "Rookie",
};

const levelOrder: Record<number, number> = {
  16: 0,
  17: 0,
  14: 1,
  13: 2,
  12: 3,
  11: 4,
};

export default async function ProspectPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return <main className="p-10 text-white">Invalid player ID.</main>;
  }

  const playerResponse = await fetch(
    `https://statsapi.mlb.com/api/v1/people/${id}`,
    { next: { revalidate: 3600 } }
  );

  const playerData = playerResponse.ok
    ? await playerResponse.json()
    : null;

  const player = playerData?.people?.[0];

  if (!player) {
    return (
      <main className="min-h-screen bg-[#081321] p-10 text-white">
        Player not found.
      </main>
    );
  }

  const mlbDebutDate: string | null =
    player.mlbDebutDate ?? null;

  const highestOverallLevel = mlbDebutDate
    ? "MLB"
    : null;

  const isPitcher = player.primaryPosition?.abbreviation === "P";
  const group = isPitcher ? "pitching" : "hitting";

  const statsResponse = await fetch(
    `https://statsapi.mlb.com/api/v1/people/${id}/stats` +
      `?stats=yearByYear&group=${group}&leagueListId=milb_all`,
    { next: { revalidate: 3600 } }
  );

  const statsData = statsResponse.ok
    ? await statsResponse.json()
    : null;

  const records: StatRecord[] = (
    statsData?.stats?.[0]?.splits ?? []
  )
    .filter(
      (record: StatRecord) =>
        record.team?.name &&
        record.sport?.id !== 21
    )
    .sort(
      (a: StatRecord, b: StatRecord) =>
        Number(a.season) - Number(b.season) ||
        (levelOrder[a.sport?.id ?? 0] ?? 99) -
          (levelOrder[b.sport?.id ?? 0] ?? 99)
    );

  const levelsReached = Array.from(
    new Set(
      records
        .map((record) => record.sport?.id)
        .filter(
          (level): level is number =>
            typeof level === "number" && level in levelOrder
        )
    )
  ).sort((a, b) => levelOrder[a] - levelOrder[b]);

  const highestMinorLeagueLevel =
    levelsReached.length > 0
      ? levelNames[levelsReached[levelsReached.length - 1]]
      : "N/A";

  const highestLevel =
    highestOverallLevel ?? highestMinorLeagueLevel;

  const developmentPath = [
    ...levelsReached.map((level) => levelNames[level]),
    ...(mlbDebutDate ? ["MLB"] : []),
  ].join(" → ");

  const seasonsRecorded = new Set(
    records.map((record) => record.season).filter(Boolean)
  ).size;

  const latestRecord = records.length > 0
    ? records[records.length - 1]
    : null;

  const columns = isPitcher
    ? ["ERA", "WHIP", "SO", "IP", "BB"]
    : ["AVG", "OBP", "SLG", "OPS", "HR"];

  function getValues(stat: Record<string, string | number>) {
    return isPitcher
      ? [
          stat.era,
          stat.whip,
          stat.strikeOuts,
          stat.inningsPitched,
          stat.baseOnBalls,
        ]
      : [
          stat.avg,
          stat.obp,
          stat.slg,
          stat.ops,
          stat.homeRuns,
        ];
  }

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/prospects"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400"
        >
          <ArrowLeft size={16} />
          Back to Prospect Development Hub
        </Link>

        <p className="mt-10 text-sm font-bold uppercase tracking-widest text-blue-400">
          DiamondIQ · Prospect Development
        </p>

        <h1 className="mt-3 text-4xl font-black">
          {player.fullName}
        </h1>

        <div className="mt-5 flex flex-wrap gap-5 text-slate-400">
          <span>Age: {player.currentAge ?? "N/A"}</span>
          <span>
            Position: {player.primaryPosition?.name ?? "N/A"}
          </span>
          <span>Player ID: {id}</span>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Minor-League Performance History
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Statistics by season, affiliate, and minor-league level.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#12243a] text-slate-300">
                <tr>
                  {["Season", "Team", "Level", ...columns].map(
                    (column) => (
                      <th key={column} className="px-4 py-4">
                        {column}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {records.map((record, index) => {
                  const stat = record.stat ?? {};
                  const values = getValues(stat);

                  return (
                    <tr
                      key={`${record.season}-${record.team?.name}-${index}`}
                      className="border-t border-slate-700"
                    >
                      <td className="px-4 py-4 font-semibold">
                        {record.season}
                      </td>
                      <td className="px-4 py-4">
                        {record.team?.name}
                      </td>
                      <td className="px-4 py-4">
                        {levelNames[record.sport?.id ?? 0] ??
                          "Other"}
                      </td>
                      {values.map((value, valueIndex) => (
                        <td key={valueIndex} className="px-4 py-4">
                          {value ?? "N/A"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {records.length === 0 && (
            <p className="mt-6 text-slate-400">
              No minor-league statistics available for this player.
            </p>
          )}
        </section>

        <section className="mt-12 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
          <h2 className="text-2xl font-bold">
            Development Progression
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Overview of the player's recorded minor-league development.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-[#12243a] p-5">
              <p className="text-sm text-slate-400">
                Highest Level Reached
              </p>
              <p className="mt-2 text-xl font-bold text-blue-400">
                {highestLevel}
              </p>
            </div>

            <div className="rounded-lg bg-[#12243a] p-5">
              <p className="text-sm text-slate-400">
                Minor-League Seasons Recorded
              </p>
              <p className="mt-2 text-xl font-bold">
                {seasonsRecorded}
              </p>
            </div>

            <div className="rounded-lg bg-[#12243a] p-5">
              <p className="text-sm text-slate-400">
                Minor-League Levels Played
              </p>
              <p className="mt-2 text-xl font-bold">
                {levelsReached.length}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-[#12243a] p-5">
              <p className="text-sm text-slate-400">
                Highest Minor-League Level
              </p>
              <p className="mt-2 text-xl font-bold">
                {highestMinorLeagueLevel}
              </p>
            </div>

            <div className="rounded-lg bg-[#12243a] p-5">
              <p className="text-sm text-slate-400">
                MLB Debut
              </p>
              <p className="mt-2 text-xl font-bold">
                {mlbDebutDate ?? "Not recorded"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-700 p-5">
            <h3 className="font-semibold text-white">
              Recorded Development Path
            </h3>
            <p className="mt-3 text-slate-300">
              {developmentPath || "No development history available."}
            </p>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Based on available MLB Stats API records. Level progression
            does not establish prospect eligibility or MLB readiness.
          </p>
        </section>

        <ProspectDevelopmentTracker
          playerName={player.fullName}
          isPitcher={isPitcher}
          records={records}
        />

        {latestRecord?.stat && (
          <ProspectEvaluation
            playerName={player.fullName}
            isPitcher={isPitcher}
            season={latestRecord.season ?? "Unknown"}
            level={
              levelNames[latestRecord.sport?.id ?? 0] ??
              "Unknown"
            }
            stats={latestRecord.stat}
          />
        )}

        <p className="mt-8 text-sm text-slate-500">
          Source: MLB Stats API. Minor-league roster inclusion does
          not establish prospect eligibility.
        </p>
      </div>
    </main>
  );
}
