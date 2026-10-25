
"use client";

import { useState, useRef } from "react";

export default function ScoutingPage() {

const latestPlayerId = useRef<number | null>(null);

  const [search, setSearch] = useState("");

const [selectedPlayer, setSelectedPlayer] = useState<{
  id: number;
  fullName: string;
} | null>(null);

const [playerStats, setPlayerStats] = useState<any>(null);

const [pitcherStats, setPitcherStats] = useState<any>(null);

const [leaguePitchingStats, setLeaguePitchingStats] = useState<any>(null);


const [playerType, setPlayerType] = useState<
  "hitter" | "pitcher"
>("hitter");


const [leagueStats, setLeagueStats] = useState<any>(null);
const [leagueLoading, setLeagueLoading] = useState(false);

const allPitchers = leaguePitchingStats?.stats?.[0]?.splits ?? [];

const pitchingTotals = allPitchers.reduce(
  (totals: any, pitcher: any) => {
    const stats = pitcher.stat ?? {};

    const innings = String(stats.inningsPitched ?? "0");
    const [whole, partial = "0"] = innings.split(".");
    const outs = Number(whole) * 3 + Number(partial);

    totals.outs += outs;
    totals.earnedRuns += Number(stats.earnedRuns ?? 0);
    totals.hits += Number(stats.hits ?? 0);
    totals.walks += Number(stats.baseOnBalls ?? 0);
    totals.strikeouts += Number(stats.strikeOuts ?? 0);

totals.battersFaced += Number(stats.battersFaced ?? 0);

    return totals;
  },
  {
    outs: 0,
    earnedRuns: 0,
    hits: 0,
    walks: 0,
    strikeouts: 0,

battersFaced: 0,

  }
);

const leagueInnings = pitchingTotals.outs / 3;

const leagueERA =
  leagueInnings > 0
    ? (pitchingTotals.earnedRuns * 9) / leagueInnings
    : null;

const leagueWHIP =
  leagueInnings > 0
    ? (pitchingTotals.walks + pitchingTotals.hits) / leagueInnings
    : null;

const leagueK9 =
  leagueInnings > 0
    ? (pitchingTotals.strikeouts * 9) / leagueInnings
    : null;

const leagueBB9 =
  leagueInnings > 0
    ? (pitchingTotals.walks * 9) / leagueInnings
    : null;

const leagueKPercent =
  pitchingTotals.battersFaced > 0
    ? (pitchingTotals.strikeouts / pitchingTotals.battersFaced) * 100
    : null;

const leagueBBPercent =
  pitchingTotals.battersFaced > 0
    ? (pitchingTotals.walks / pitchingTotals.battersFaced) * 100
    : null;

const qualifiedHitters = leagueStats?.stats?.[0]?.splits ?? [];

const leagueTotals = qualifiedHitters.reduce(
  (totals: {
    hits: number;
    atBats: number;
    walks: number;
    strikeouts: number;
    plateAppearances: number;
    totalBases: number;
  }, player: any) => {
    const stat = player.stat;

    totals.hits += Number(stat.hits ?? 0);
    totals.atBats += Number(stat.atBats ?? 0);
    totals.walks += Number(stat.baseOnBalls ?? 0);
    totals.strikeouts += Number(stat.strikeOuts ?? 0);
    totals.plateAppearances += Number(stat.plateAppearances ?? 0);
    totals.totalBases += Number(stat.totalBases ?? 0);

    return totals;
  },
  {
    hits: 0,
    atBats: 0,
    walks: 0,
    strikeouts: 0,
    plateAppearances: 0,
    totalBases: 0,
  }
);

const mlbAverage =
  leagueTotals.atBats > 0
    ? (leagueTotals.hits / leagueTotals.atBats).toFixed(3)
    : null;

const mlbSlugging =
  leagueTotals.atBats > 0
    ? (leagueTotals.totalBases / leagueTotals.atBats).toFixed(3)
    : null;

const mlbISO =
  leagueTotals.atBats > 0
    ? (
        (leagueTotals.totalBases - leagueTotals.hits) /
        leagueTotals.atBats
      ).toFixed(3)
    : null;

const mlbStrikeoutRate =
  leagueTotals.plateAppearances > 0
    ? (
        (leagueTotals.strikeouts / leagueTotals.plateAppearances) *
        100
      ).toFixed(1)
    : null;

const mlbWalkRate =
  leagueTotals.plateAppearances > 0
    ? (
        (leagueTotals.walks / leagueTotals.plateAppearances) *
        100
      ).toFixed(1)
    : null;

async function loadLeagueStats() {
  setLeagueLoading(true);

  try {
    const response = await fetch(
      

"https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&leagueIds=103,104&season=2026&sportIds=1&playerPool=ALL&limit=2000"


    );

    if (!response.ok) {
      throw new Error("Failed to load league statistics");
    }

    const data = await response.json();
    console.log("MLB league statistics response:", data);

    setLeagueStats(data);
  } catch (error) {
    console.error("Error loading league statistics:", error);
    setLeagueStats(null);
  } finally {
    setLeagueLoading(false);
  }
}

const [statsLoading, setStatsLoading] = useState(false);

const plateAppearances = Number(playerStats?.plateAppearances ?? 0);
const strikeouts = Number(playerStats?.strikeOuts ?? 0);
const walks = Number(playerStats?.baseOnBalls ?? 0);

const strikeoutRate =
  plateAppearances > 0
    ? ((strikeouts / plateAppearances) * 100).toFixed(1)
    : null;

const walkRate =
  plateAppearances > 0
    ? ((walks / plateAppearances) * 100).toFixed(1)
    : null;

const isolatedPower =
  playerStats?.slg != null && playerStats?.avg != null
    ? (Number(playerStats.slg) - Number(playerStats.avg)).toFixed(3)
    : null;

const hits = Number(playerStats?.hits ?? 0);
const homeRuns = Number(playerStats?.homeRuns ?? 0);
const atBats = Number(playerStats?.atBats ?? 0);
const sacrificeFlies = Number(playerStats?.sacFlies ?? 0);

const babipDenominator =
  atBats - strikeouts - homeRuns + sacrificeFlies;

const babip =
  playerStats &&
  babipDenominator > 0
    ? ((hits - homeRuns) / babipDenominator).toFixed(3)
    : null;

async function loadPlayerStats(playerId: number) {
  setStatsLoading(true);
  
if (latestPlayerId.current !== playerId) {
  return;
}

  setPlayerStats(null);

  
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=hitting&season=2026`
    );

    if (!response.ok) {
      throw new Error("Failed to load player statistics");
    }

    const data = await response.json();
    const stats = data.stats?.[0]?.splits?.[0]?.stat ?? null;

if (latestPlayerId.current !== playerId) {
  return;
}

    setPlayerStats(stats);
  

} catch (error) {
  if (latestPlayerId.current === playerId) {
    console.error("Error loading player stats:", error);
    setPlayerStats(null);
  }
} finally {
  if (latestPlayerId.current === playerId) {
    setStatsLoading(false);
  }
}
}


async function loadPitcherStats(playerId: number) {
  
if (latestPlayerId.current !== playerId) {
  return;
}

    setPitcherStats(null);

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=pitching&season=2026`
    );

    if (!response.ok) {
      throw new Error("Failed to load pitching statistics");
    }



    const data = await response.json();
    const stats = data.stats?.[0]?.splits?.[0]?.stat ?? null;

if (latestPlayerId.current !== playerId) {
  return;
}

    setPitcherStats(stats);

if (stats && Number(stats.gamesPitched ?? 0) > 0) {
  setPlayerType("pitcher");
}

 
} catch (error) {
  if (latestPlayerId.current === playerId) {
    console.error("Error loading pitcher stats:", error);
    setPitcherStats(null);
  }
}

}
async function loadLeaguePitchingStats() {
  try {
const response = await fetch(
      "https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&leagueIds=103,104&season=2026&sportIds=1&playerPool=ALL&limit=2000"
    );

    if (!response.ok) {
      throw new Error("Failed to load MLB pitching averages");
    }

const data = await response.json();
    setLeaguePitchingStats(data);
  } catch (error) {
    console.error("Error loading league pitching stats:", error);
    setLeaguePitchingStats(null);
  }
}

const [players, setPlayers] = useState<
  { id: number; fullName: string }[]
>([]);

async function searchPlayers(name: string) {
  setSearch(name);

  if (name.trim().length < 2) {
    setPlayers([]);
    return;
  }

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}`
    );

    if (!response.ok) {
      setPlayers([]);
      return;
    }

    const data = await response.json();
    setPlayers(data.people ?? []);
  } catch (error) {
    console.error("Player search failed:", error);
    setPlayers([]);
  }
}

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-400">
          MLB Player Evaluation
        </p>

        <h1 className="text-4xl font-black md:text-5xl">
          Player Scouting
        </h1>

        <p className="mt-5 max-w-2xl text-slate-400">
          Explore player performance, evaluate strengths and weaknesses,
          and discover insights through baseball analytics.
        </p>

        <div className="mt-10 rounded-xl border border-white/10 bg-[#0d1d30] p-8">
          <h2 className="text-2xl font-bold">
            Scouting Dashboard
          </h2>

<div className="mt-6">
  <label className="mb-2 block text-sm font-medium text-slate-300">
    Search MLB Players
  </label>

  <input
    type="text"
    value={search}
    onChange={(e) => searchPlayers(e.target.value)}
    placeholder="Enter a player name (e.g. Aaron Judge)"
    className="w-full max-w-xl rounded-lg border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-blue-400"
  />

{players.length > 0 && (
  <div className="mt-2 max-h-64 max-w-xl overflow-y-auto rounded-lg border border-white/10 bg-[#081321]">
    {players.map((player) => (
      <button
        key={player.id}
        type="button"
        

onClick={() => {
  latestPlayerId.current = player.id;
    setSelectedPlayer(player);

setPlayerStats(null);
setPitcherStats(null);

setPlayerType("hitter");

  setSearch(player.fullName);
  setPlayers([]);
  loadPlayerStats(player.id);

loadPitcherStats(player.id);

loadLeaguePitchingStats();

  loadLeagueStats();
}}


        className="block w-full border-b border-white/10 px-4 py-3 text-left text-white hover:bg-blue-500/20"
      >
        {player.fullName}
      </button>
    ))}
  </div>
)}

</div>

          <p className="mt-3 text-slate-400">
            Search for MLB players and build detailed scouting reports.
          </p>

{selectedPlayer && (
  <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-5">
    <p className="text-sm text-blue-400">
      Selected Player
    </p>
    <h3 className="mt-2 text-2xl font-bold text-white">
      {selectedPlayer.fullName}
    </h3>
    <p className="mt-1 text-sm text-slate-400">
      MLB Player ID: {selectedPlayer.id}
    </p>
  </div>
)}

{statsLoading && (
  <p className="mt-6 text-blue-400">
    Loading 2026 MLB statistics...
  </p>
)}

{selectedPlayer && (playerStats || pitcherStats) && (
  <div className="mt-8 flex gap-3">
    {playerStats && (
      <button
        type="button"
        onClick={() => setPlayerType("hitter")}
        className={`rounded-lg px-6 py-3 font-semibold transition ${
          playerType === "hitter"
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        Hitting Report
      </button>
    )}

    {pitcherStats && (
      <button
        type="button"
        onClick={() => setPlayerType("pitcher")}
        className={`rounded-lg px-6 py-3 font-semibold transition ${
          playerType === "pitcher"
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        Pitching Report
      </button>
    )}
  </div>
)}


{selectedPlayer && pitcherStats && playerType === "pitcher" && (

  <section className="mt-8">
    <h3 className="mb-5 text-2xl font-bold text-white">
      2026 Pitching Performance
    </h3>

    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[
        { label: "ERA", value: pitcherStats.era },
        { label: "WHIP", value: pitcherStats.whip },
        { label: "Strikeouts", value: pitcherStats.strikeOuts },
        { label: "Innings Pitched", value: pitcherStats.inningsPitched },

{ label: "K/9", value: pitcherStats.strikeoutsPer9Inn ?? "N/A" },
{ label: "BB/9", value: pitcherStats.walksPer9Inn ?? "N/A" },
{ label: "Opponent AVG", value: pitcherStats.avg ?? "N/A" },

{
  label: "K/BB Ratio",
  value:
    Number(pitcherStats.baseOnBalls) > 0
      ? (
          Number(pitcherStats.strikeOuts) /
          Number(pitcherStats.baseOnBalls)
        ).toFixed(2)
      : "N/A",
},

{
  label: "Strikeout Rate (K%)",
  value:
    Number(pitcherStats.battersFaced) > 0
      ? (
          (Number(pitcherStats.strikeOuts) /
            Number(pitcherStats.battersFaced)) *
          100
        ).toFixed(1) + "%"
      : "N/A",
},

{
  label: "Walk Rate (BB%)",
  value:
    Number(pitcherStats.battersFaced) > 0
      ? (
          (Number(pitcherStats.baseOnBalls) /
            Number(pitcherStats.battersFaced)) *
          100
        ).toFixed(1) + "%"
      : "N/A",
},

      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-white/10 bg-slate-900 p-5"
        >
          <p className="text-sm text-slate-400">{stat.label}</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {stat.value ?? "N/A"}
          </p>
        </div>
      ))}
    </div>
  </section>
)}


{selectedPlayer && pitcherStats && playerType === "pitcher" && (

  <section className="mt-10 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
    <h3 className="mb-5 text-2xl font-bold text-white">
      Pitcher vs. MLB League Average
    </h3>

    <div className="overflow-x-auto">
      <table className="w-full max-w-4xl table-fixed text-left">
        <thead>
          <tr className="border-b border-white/10 text-slate-400">
            <th className="py-3">Statistic</th>
            <th className="py-3">Player</th>
            <th className="py-3">MLB League Average</th>

<th className="py-3">Difference</th>

          </tr>
        </thead>

        <tbody>
          {[
            {
              label: "ERA",
              player: pitcherStats.era,
              league: leagueERA,
              lowerIsBetter: true,
            },
            {
              label: "WHIP",
              player: pitcherStats.whip,
              league: leagueWHIP,
              lowerIsBetter: true,
            },
            {
              label: "K/9",
              player: pitcherStats.strikeoutsPer9Inn,
              league: leagueK9,
              lowerIsBetter: false,
            },
            {
              label: "BB/9",
              player: pitcherStats.walksPer9Inn,
              league: leagueBB9,
              lowerIsBetter: true,
            },

{
  label: "K%",
  player:
    Number(pitcherStats.battersFaced) > 0
      ? (
          (Number(pitcherStats.strikeOuts) /
            Number(pitcherStats.battersFaced)) *
          100
        ).toFixed(2)
      : null,
  league: leagueKPercent,
  lowerIsBetter: false,
},

{
  label: "BB%",
  player:
    Number(pitcherStats.battersFaced) > 0
      ? (
          (Number(pitcherStats.baseOnBalls) /
            Number(pitcherStats.battersFaced)) *
          100
        ).toFixed(2)
      : null,
  league: leagueBBPercent,
  lowerIsBetter: true,
},

          ].map((row) => {
            const playerValue =
              row.player == null ? null : Number(row.player);

            const valid =
              playerValue !== null &&
              Number.isFinite(playerValue) &&
              row.league !== null &&
              Number.isFinite(row.league);

            const better =
              valid &&
              (row.lowerIsBetter
                ? playerValue! < row.league!
                : playerValue! > row.league!);

            return (
              <tr
                key={row.label}
                className="border-b border-white/10"
              >
                <td className="py-4 font-medium">
                  {row.label}
                </td>

                <td
                  className={`py-4 font-semibold ${
                    !valid
                      ? "text-slate-400"
                      : better
                        ? "text-green-400"
                        : "text-amber-400"
                  }`}
                >
                  
{row.player == null
  ? "N/A"
  : row.label === "K%" || row.label === "BB%"
    ? `${Number(row.player).toFixed(2)}%`
    : row.player}

                </td>

                
<td className="py-4">
  {row.league !== null
    ? `${row.league.toFixed(2)}${
        row.label === "K%" || row.label === "BB%" ? "%" : ""
      }`
    : "N/A"}
</td>


<td className="py-4 font-semibold">
  {valid && playerValue !== null && row.league !== null
    ? (() => {
        const difference = playerValue - row.league;
        
const formatted = `${difference > 0 ? "+" : ""}${difference.toFixed(2)}${
  row.label === "K%" || row.label === "BB%" ? " %" : ""
}`;


        const isBetter = row.lowerIsBetter
          ? difference < 0
          : difference > 0;

        return (
          <span
            className={
              difference === 0
                ? "text-slate-400"
                : isBetter
                  ? "text-green-400"
                  : "text-amber-400"
            }
          >
            {formatted}
          </span>
        );
      })()
    : "N/A"}
</td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <p className="mt-4 text-sm text-slate-400">
      MLB benchmarks are calculated from available 2026
      pitching records returned by the MLB Stats API.
    </p>
  </section>
)}


{selectedPlayer && pitcherStats && playerType === "pitcher" && (

  <section className="mt-10 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
    <h3 className="mb-6 text-2xl font-bold text-white">
      Automated Pitching Scouting Evaluation
    </h3>

    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="mb-4 text-lg font-semibold text-green-400">
          Statistical Strengths
        </h4>
        <ul className="space-y-3 text-slate-300">
          {[
            { label: "ERA", value: pitcherStats.era, average: leagueERA, lower: true },
            { label: "WHIP", value: pitcherStats.whip, average: leagueWHIP, lower: true },
            { label: "K/9", value: pitcherStats.strikeoutsPer9Inn, average: leagueK9, lower: false },
            { label: "BB/9", value: pitcherStats.walksPer9Inn, average: leagueBB9, lower: true },
          ]
            .filter((stat) =>
              stat.value != null &&
              stat.average != null &&
              Number.isFinite(Number(stat.value)) &&
              (stat.lower
                ? Number(stat.value) < stat.average
                : Number(stat.value) > stat.average)
            )
            .map((stat) => (
              <li key={stat.label}>
                • {stat.label} is better than the MLB league benchmark.
              </li>
            ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-4 text-lg font-semibold text-amber-400">
          Areas to Evaluate
        </h4>
        <ul className="space-y-3 text-slate-300">
          {[
            { label: "ERA", value: pitcherStats.era, average: leagueERA, lower: true },
            { label: "WHIP", value: pitcherStats.whip, average: leagueWHIP, lower: true },
            { label: "K/9", value: pitcherStats.strikeoutsPer9Inn, average: leagueK9, lower: false },
            { label: "BB/9", value: pitcherStats.walksPer9Inn, average: leagueBB9, lower: true },
          ]
            .filter((stat) =>
              stat.value != null &&
              stat.average != null &&
              Number.isFinite(Number(stat.value)) &&
              (stat.lower
                ? Number(stat.value) > stat.average
                : Number(stat.value) < stat.average)
            )
            .map((stat) => (
              <li key={stat.label}>
                • {stat.label} is below the MLB league benchmark.
              </li>
            ))}
        </ul>
      </div>
    </div>

    <p className="mt-6 text-sm text-slate-400">
      This evaluation highlights statistical differences from
      calculated 2026 MLB benchmarks. It is not a professional
      scouting grade.
    </p>
  </section>
)}


{selectedPlayer && pitcherStats && playerType === "pitcher" && (

  <section className="mt-8 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
    <h3 className="mb-4 text-2xl font-bold text-white">
      Overall Pitching Scouting Summary
    </h3>

    <p className="leading-8 text-slate-300">
      {selectedPlayer.fullName} recorded a {pitcherStats.era ?? "N/A"} ERA
      and a {pitcherStats.whip ?? "N/A"} WHIP during the 2026 season.{" "}

      {leagueERA !== null && pitcherStats.era != null
        ? Number(pitcherStats.era) < leagueERA
          ? "Their ERA was better than the calculated MLB league benchmark. "
          : "Their ERA was not better than the calculated MLB league benchmark. "
        : ""}

      {leagueK9 !== null && pitcherStats.strikeoutsPer9Inn != null
        ? Number(pitcherStats.strikeoutsPer9Inn) > leagueK9
          ? "Their strikeout rate per nine innings was above the league benchmark. "
          : "Their strikeout rate per nine innings was at or below the league benchmark. "
        : ""}

      {leagueBB9 !== null && pitcherStats.walksPer9Inn != null
        ? Number(pitcherStats.walksPer9Inn) < leagueBB9
          ? "Their walk rate per nine innings was better than the league benchmark. "
          : "Their walk rate per nine innings was at or above the league benchmark. "
        : ""}

      These results provide an initial statistical evaluation of pitching
      performance. Additional information, including pitch movement,
      velocity, and quality of contact, would provide a more complete
      scouting assessment.
    </p>
  </section>
)}

{selectedPlayer && !statsLoading && playerStats && playerType === "hitter" && (
  <div className="mt-8">
    <h3 className="mb-5 text-2xl font-bold text-white">
      2026 Hitting Performance
    </h3>

    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {[
        { label: "Batting Average", value: playerStats.avg },
        { label: "Home Runs", value: playerStats.homeRuns },
        { label: "RBI", value: playerStats.rbi },
        { label: "OPS", value: playerStats.ops },

{ label: "Isolated Power (ISO)", value: isolatedPower ?? "N/A" },

{ label: "BABIP", value: babip ?? "N/A" },

        { label: "On-Base %", value: playerStats.obp },
        { label: "Slugging %", value: playerStats.slg },
        { label: "Hits", value: playerStats.hits },
        { label: "Walks", value: playerStats.baseOnBalls },


{ label: "Strikeout Rate (K%)", value: strikeoutRate !== null ? `${strikeoutRate}%` : "N/A" },
{ label: "Walk Rate (BB%)", value: walkRate !== null ? `${walkRate}%` : "N/A" },


      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-white/10 bg-[#081321] p-5"
        >
          <p className="text-sm text-slate-400">
            {stat.label}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {stat.value ?? "N/A"}
          </p>
        </div>
      ))}
    </div>
  </div>
)}


{selectedPlayer && !statsLoading && playerStats && playerType === "hitter" && (

  <div className="mt-8 rounded-xl border border-white/10 bg-[#081321] p-6">
    <h3 className="text-2xl font-bold text-white">
      Offensive Scouting Evaluation
    </h3>

    <p className="mt-2 text-sm text-slate-400">
      Preliminary evaluation based on 2026 MLB hitting statistics.
    </p>

    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="mb-3 text-lg font-semibold text-green-400">
          Statistical Strengths
        </h4>

        <div className="space-y-3 text-slate-300">
          {Number(playerStats.ops) >= 0.8 && (
            <p>• Strong overall offensive production based on OPS.</p>
          )}

          {Number(playerStats.obp) >= 0.35 && (
            <p>• Strong ability to reach base.</p>
          )}

          {Number(playerStats.avg) >= 0.28 && (
            <p>• High batting average.</p>
          )}
        
{walkRate !== null && Number(walkRate) >= 12 && (
  <p>
    • Excellent walk rate, indicating a strong ability to draw walks.
  </p>
)}

{isolatedPower !== null && Number(isolatedPower) >= 0.200 && (
  <p>
    • Strong extra-base power, supported by an ISO of {isolatedPower}.
  </p>
)}

{strikeoutRate !== null && Number(strikeoutRate) <= 18 && (
  <p>
    • Low strikeout rate, suggesting strong contact ability.
  </p>
)}

        </div>
      </div>

      <div>
        <h4 className="mb-3 text-lg font-semibold text-amber-400">
          Areas to Evaluate
        </h4>

        <div className="space-y-3 text-slate-300">
          {Number(playerStats.avg) < 0.26 && (
            <p>• Batting average may warrant closer examination.</p>
          )}

          {Number(playerStats.obp) < 0.32 && (
            <p>• On-base production may warrant improvement.</p>
          )}

          {Number(playerStats.ops) < 0.7 && (
            <p>• Overall offensive production may warrant improvement.</p>
          )}

          <p>• Review strikeout rate, plate discipline, and quality of contact.</p>
        </div>

{strikeoutRate !== null && Number(strikeoutRate) >= 28 && (
  <p>
    • Elevated strikeout rate may indicate swing-and-miss concerns.
  </p>
)}

{walkRate !== null && Number(walkRate) < 6 && (
  <p>
    • Low walk rate may indicate an opportunity to improve
    plate discipline.
  </p>
)}

      </div>
    </div>

    <p className="mt-6 text-xs text-slate-500">
      These are preliminary statistical observations using fixed thresholds,
      not professional scouting grades or league-adjusted rankings.
    </p>
  </div>
)}


{selectedPlayer && !statsLoading && playerStats && playerType === "hitter" && (

  <div className="mt-8 rounded-xl border border-blue-500/30 bg-[#0d1d30] p-6">
    <h3 className="text-2xl font-bold text-white">
      Overall Offensive Scouting Summary
    </h3>

    <p className="mt-4 leading-7 text-slate-300">
      {selectedPlayer.fullName} recorded a {playerStats.avg} batting
      average, {playerStats.obp} on-base percentage, and{" "}
      {playerStats.ops} OPS during the 2026 MLB season.
      {" "}
      {isolatedPower !== null && Number(isolatedPower) >= 0.200
        ? `An ISO of ${isolatedPower} indicates strong extra-base power. `
        : "Extra-base power should be evaluated alongside league averages. "}
      {walkRate !== null && Number(walkRate) >= 12
        ? `A ${walkRate}% walk rate highlights an ability to draw walks. `
        : "Walk rate provides additional insight into plate discipline. "}
      {strikeoutRate !== null && Number(strikeoutRate) >= 28
        ? `However, a ${strikeoutRate}% strikeout rate is an area worth examining further. `
        : "Strikeout rate provides additional context for contact ability. "}
      Further evaluation should include Statcast contact quality,
      swing decisions, and comparisons with MLB averages.
    </p>

    <p className="mt-4 text-xs text-slate-500">
      Automated statistical summary. Not a professional scouting grade.
    </p>
  </div>
)}


{selectedPlayer && playerStats && leagueStats && playerType === "hitter" && (

  <div className="mt-8 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
    <h3 className="text-2xl font-bold text-white">
      Player vs. MLB Hitting Benchmarks
    </h3>

    <p className="mt-2 text-sm text-slate-400">
      2026 season comparison using aggregate MLB hitting statistics.
    </p>

    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-slate-400">
            <th className="py-3">Statistic</th>
            <th className="py-3">Player</th>
            <th className="py-3">MLB League Average</th>
            <th className="py-3">Difference</th>
          </tr>
        </thead>

        <tbody className="text-white">
          {[
            {
              label: "Batting Average",
              player: playerStats.avg,
              league: mlbAverage,
            },
            {
              label: "Isolated Power (ISO)",
              player: isolatedPower,
              league: mlbISO,
            },
            {
              label: "Strikeout Rate (K%)",
              player: strikeoutRate !== null
                ? `${strikeoutRate}%`
                : "N/A",
              league: mlbStrikeoutRate !== null
                ? `${mlbStrikeoutRate}%`
                : "N/A",
            },
            {
              label: "Walk Rate (BB%)",
              player: walkRate !== null
                ? `${walkRate}%`
                : "N/A",
              league: mlbWalkRate !== null
                ? `${mlbWalkRate}%`
                : "N/A",
            },
          ].map((row) => (
            <tr key={row.label} className="border-b border-white/10">
              <td className="py-4">{row.label}</td>
              

<td className="py-4 font-semibold">
  {(() => {
    const playerValue = Number(
      String(row.player ?? "").replace("%", "")
    );
    const leagueValue = Number(
      String(row.league ?? "").replace("%", "")
    );

    const valid =
      row.player != null &&
      row.league != null &&
      Number.isFinite(playerValue) &&
      Number.isFinite(leagueValue);

    const lowerIsBetter = row.label === "Strikeout Rate (K%)";

    const better = lowerIsBetter
      ? playerValue < leagueValue
      : playerValue > leagueValue;

    return (
      <span
        className={
          !valid
            ? "text-slate-400"
            : better
              ? "text-green-400"
              : "text-amber-400"
        }
      >
        {row.player ?? "N/A"}
      </span>
    );
  })()}
</td>


              <td className="py-4">{row.league ?? "N/A"}</td>

<td className="py-4 font-semibold">
  {(() => {
    const playerValue = Number(
      String(row.player ?? "").replace("%", "")
    );
    const leagueValue = Number(
      String(row.league ?? "").replace("%", "")
    );

    if (
      row.player == null ||
      row.league == null ||
      !Number.isFinite(playerValue) ||
      !Number.isFinite(leagueValue)
    ) {
      return <span className="text-slate-400">N/A</span>;
    }

    const difference = playerValue - leagueValue;
    const formatted =
      row.label === "Strikeout Rate (K%)" ||
      row.label === "Walk Rate (BB%)"
        ? `${difference > 0 ? "+" : ""}${difference.toFixed(1)}%`
        : `${difference > 0 ? "+" : ""}${difference.toFixed(3)}`;

    return (
      <span
        className={
          difference === 0
            ? "text-slate-400"
            : row.label === "Strikeout Rate (K%)"
              ? difference < 0
                ? "text-green-400"
                : "text-amber-400"
              : difference > 0
                ? "text-green-400"
                : "text-amber-400"
        }
      >
        {formatted}
      </span>
    );
  })()}
</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="mt-4 text-xs text-slate-500">
      Benchmarks are calculated from the MLB Stats API player records
      returned for 2026. Values are weighted by their underlying
      opportunities rather than averaging player percentages.
    </p>
  </div>
)}

{selectedPlayer && !statsLoading && !playerStats && (
  <p className="mt-6 text-slate-400">
    No 2026 MLB hitting statistics available for this player.
  </p>
)}

        </div>
      </div>
    </main>
  );
}
