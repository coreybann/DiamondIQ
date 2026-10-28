"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
export default function PlayerTrendsPage() {
  const [search, setSearch] = useState("");
const [players, setPlayers] = useState<
  { id: number; fullName: string }[]
>([]);
const [selectedPlayer, setSelectedPlayer] = useState<{
  id: number;
  fullName: string;
} | null>(null);
type SeasonStats = {
  season: string;
  gamesPlayed: number;
  avg: string;
  
  hits: number;
atBats: number;
  homeRuns: number;
  rbi: number;
  obp: string;
  slg: string;
  ops: string;
};
type PitchingSeasonStats = {
  season: string;
  gamesPlayed: number;
  inningsPitched: string;
  era: string;
  whip: string;
  strikeOuts: number;
  baseOnBalls: number;
    earnedRuns: number;
    hits: number;
  battersFaced: number;
  gamesStarted: number;
wins: number;
losses: number;
homeRuns: number;
};
const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);

const [pitchingSeasonStats, setPitchingSeasonStats] = useState<PitchingSeasonStats[]>([]);
const [careerOPS, setCareerOPS] = useState<string>("N/A");

const [loadingStats, setLoadingStats] = useState(false);
const [selectedStat, setSelectedStat] = useState("ops");
const [selectedPitchingStat, setSelectedPitchingStat] = useState("era");
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
  async function fetchSeasonStats(playerId: number) {
  setLoadingStats(true);
  setSeasonStats([]);

setCareerOPS("N/A");

try {
  const careerResponse = await fetch(
    `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=career&group=hitting`
  );

  if (careerResponse.ok) {
    const careerData = await careerResponse.json();
    const ops = careerData.stats?.[0]?.splits?.[0]?.stat?.ops;

    if (ops != null) {
      setCareerOPS(String(ops));
    }
  }
} catch (error) {
  console.error("Failed to fetch career OPS:", error);
}

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=hitting&leagueListId=mlb_hist`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch season statistics");
    }

    const data = await response.json();
    const seasons = data.stats?.[0]?.splits ?? [];

    const formattedStats: SeasonStats[] = seasons.map(
  (item: { season: string; stat: SeasonStats }) => ({
        season: item.season,
        gamesPlayed: item.stat.gamesPlayed ?? 0,
        avg: item.stat.avg ?? ".000",
        hits: item.stat.hits ?? 0,
atBats: item.stat.atBats ?? 0,
        homeRuns: item.stat.homeRuns ?? 0,
        rbi: item.stat.rbi ?? 0,
        obp: item.stat.obp ?? ".000",
        slg: item.stat.slg ?? ".000",
        ops: item.stat.ops ?? ".000",
      })
    );

    setSeasonStats(formattedStats);
    const pitchingResponse = await fetch(
  `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=pitching&leagueListId=mlb_hist`
);

console.log("Pitching API status:", pitchingResponse.status);

if (pitchingResponse.ok) {
  const pitchingData = await pitchingResponse.json();
  const rawPitchingSeasons = pitchingData.stats?.[0]?.splits ?? [];

const pitchingSeasons = rawPitchingSeasons.reduce(
  (unique: any[], current: any) => {
    const existingIndex = unique.findIndex(
      (item) => item.season === current.season
    );

    if (existingIndex === -1) {
      unique.push(current);
    } else {
      const toOuts = (ip: string) => {
        const [innings, outs = "0"] = String(ip ?? "0.0").split(".");
        return Number(innings) * 3 + Number(outs);
      };

      if (
        toOuts(current.stat?.inningsPitched) >
        toOuts(unique[existingIndex].stat?.inningsPitched)
      ) {
        unique[existingIndex] = current;
      }
    }

    return unique;
  },
  []
);

  const formattedPitchingStats: PitchingSeasonStats[] = pitchingSeasons.map(
    (item: { season: string; stat: Partial<PitchingSeasonStats> }) => ({
      season: item.season,
      gamesPlayed: item.stat.gamesPlayed ?? 0,
      gamesStarted: item.stat.gamesStarted ?? 0,
wins: item.stat.wins ?? 0,
losses: item.stat.losses ?? 0,
      inningsPitched: item.stat.inningsPitched ?? "0.0",
      era: item.stat.era ?? "0.00",
      whip: item.stat.whip ?? "0.00",
      strikeOuts: item.stat.strikeOuts ?? 0,
      baseOnBalls: item.stat.baseOnBalls ?? 0,
      battersFaced: item.stat.battersFaced ?? 0,
      earnedRuns: item.stat.earnedRuns ?? 0,
      hits: item.stat.hits ?? 0,
      homeRuns: item.stat.homeRuns ?? 0,
    })
  );
console.log("Pitching data:", formattedPitchingStats);
console.log(
  "Pitching hits by season:",
  formattedPitchingStats.map((stats) => ({
    season: stats.season,
    hits: stats.hits,
    walks: stats.baseOnBalls,
  }))
);
console.log("Pitching state update:", {
  playerId,
  seasons: formattedPitchingStats.length,
  firstSeason: formattedPitchingStats[0]?.season,
});
  setPitchingSeasonStats(formattedPitchingStats);
}
  } catch (error) {
    console.error("Season statistics fetch failed:", error);
  } finally {
    setLoadingStats(false);
  }
}
return (
    <main className="min-h-screen bg-[#081321] p-8 text-white">
  <div className="mx-auto max-w-7xl">
      <h1 className="text-4xl font-bold">
        Player Performance Trends
      </h1>

      <p className="mt-4 text-slate-400">
        Explore MLB player performance across multiple seasons.
      </p>

      <div className="mt-8 max-w-xl">
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Search MLB Players
        </label>

        <input
          type="text"
          value={search}
          onChange={(e) => searchPlayers(e.target.value)}
          placeholder="Enter a player name (e.g. Aaron Judge)"
          className="w-full rounded-lg border border-white/10 bg-[#0d1d30] px-4 py-3 text-white outline-none focus:border-blue-500"
        />
        {players.length > 0 && (
  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-[#0d1d30]">
    {players.map((player) => (
      <button
        key={player.id}
        type="button"
        onClick={() => {
  setSelectedPlayer(player);
  fetchSeasonStats(player.id);
  setSearch(player.fullName);
  setPlayers([]);
}}
        className="block w-full border-b border-white/10 px-4 py-3 text-left text-white hover:bg-blue-500/20"
      >
        {player.fullName}
      </button>
    ))}
  </div>
)}
      </div>
      {selectedPlayer && (
  <div className="mt-8 w-full rounded-xl border border-white/10 bg-[#0d1d30] p-6">
    <h2 className="text-2xl font-bold text-white">
      {selectedPlayer.fullName}
    </h2>

    <p className="mt-2 text-sm text-slate-400">
      MLB Player ID: {selectedPlayer.id}
    </p>

    <p className="mt-4 text-slate-300">
      Season-by-season performance analysis
    </p>
   
      </div>
    )}
    {!loadingStats && seasonStats.length > 0 && pitchingSeasonStats.length === 0 && (
  <div className="mt-8 rounded-xl border border-white/10 bg-[#081321] p-6">
    <h3 className="mb-2 text-xl font-bold text-white">
      {selectedStat === "homeRuns"
  ? "Home Runs"
  : selectedStat === "avg"
  ? "Batting Average"
  : selectedStat.toUpperCase()} Performance by Season
    </h3>
<select
  value={selectedStat}
  onChange={(e) => setSelectedStat(e.target.value)}
  className="mb-4 rounded-lg border border-white/10 bg-[#0d1d30] px-4 py-2 text-white"
>
  <option value="ops">OPS</option>
  <option value="avg">Batting Average (AVG)</option>
  <option value="homeRuns">Home Runs (HR)</option>
  <option value="rbi">Runs Batted In (RBI)</option>
  <option value="obp">On-Base Percentage (OBP)</option>
  <option value="slg">Slugging Percentage (SLG)</option>
</select>
    <p className="mb-6 text-sm text-slate-400">
      Track offensive production throughout the player's MLB career.
    </p>

    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={seasonStats.map((stats) => ({
  season: stats.season,
  value: Number(stats[selectedStat as keyof SeasonStats]),
}))}
        >
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis dataKey="season" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0d1d30",
              border: "1px solid #334155",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#60a5fa"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
{loadingStats ? (
  <p className="mt-6 text-slate-400">Loading season statistics...</p>
) : seasonStats.length > 0 && pitchingSeasonStats.length === 0 ? (
  <div className="mt-6 overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-white/10 text-slate-400">
        <tr>
          <th className="p-3">Season</th>
          <th className="p-3">G</th>
          <th className="p-3">AVG</th>
          <th className="p-3">HR</th>
          <th className="p-3">RBI</th>
          <th className="p-3">OBP</th>
          <th className="p-3">SLG</th>
          <th className="p-3">OPS</th>
        </tr>
      </thead>
      <tbody>
        {seasonStats.map((stats) => (
          <tr key={stats.season} className="border-b border-white/10">
            <td className="p-3 font-semibold">{stats.season}</td>
            <td className="p-3">{stats.gamesPlayed}</td>
            <td className="p-3">{stats.avg}</td>
            <td className="p-3">{stats.homeRuns}</td>
            <td className="p-3">{stats.rbi}</td>
            <td className="p-3">{stats.obp}</td>
            <td className="p-3">{stats.slg}</td>
            <td className="p-3">{stats.ops}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : (
  pitchingSeasonStats.length === 0 ? (
    <p className="mt-6 text-slate-400">
      Search for a player to explore their performance trends.
    </p>
  ) : null
)}
{!loadingStats && seasonStats.length > 0 && pitchingSeasonStats.length === 0 && (
  <div className="mt-8 rounded-xl border border-white/10 bg-[#081321] p-6">
    <h3 className="mb-2 text-xl font-bold text-white">
      Career Summary
    </h3>
    <p className="text-sm text-slate-400">
      A look at the player's career performance.
    </p>
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
    <div className="h-28 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Games Played</p>
  <p className="mt-2 text-3xl font-bold text-blue-400">
    {seasonStats.reduce((total, stats) => total + stats.gamesPlayed, 0)}
  </p>
</div>
<div className="h-28 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Batting Average</p>
  <p className="mt-2 text-3xl font-bold text-blue-400">
    {(() => {
      const hits = seasonStats.reduce((total, stats) => total + stats.hits, 0);
      const atBats = seasonStats.reduce((total, stats) => total + stats.atBats, 0);

      return atBats > 0 ? (hits / atBats).toFixed(3).replace(/^0/, "") : ".000";
    })()}
  </p>
</div>
<div className="h-28 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Home Runs</p>
  <p className="mt-2 text-3xl font-bold text-blue-400">
    {seasonStats.reduce((total, stats) => total + stats.homeRuns, 0)}
  </p>
</div>
<div className="h-28 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career RBI</p>
  <p className="mt-2 text-3xl font-bold text-blue-400">
    {seasonStats.reduce((total, stats) => total + stats.rbi, 0)}
  </p>
</div>

<div className="h-28 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Hits</p>
  <p className="mt-2 text-3xl font-bold text-blue-400">
    {seasonStats.reduce((total, stats) => total + stats.hits, 0)}
  </p>
</div>

<div className="h-28 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career OPS</p>
  <p className="mt-2 text-3xl font-bold text-blue-400">
   
{careerOPS}

  </p>
</div>

  </div>
  </div>
)}
{!loadingStats && seasonStats.length > 0 && pitchingSeasonStats.length === 0 && (
  <div className="mt-8 rounded-xl border border-white/10 bg-[#081321] p-6">
    <h3 className="mb-2 text-xl font-bold text-white">
      Career Highs
    </h3>
    <p className="text-sm text-slate-400">
      A look at the player's best single-season performances.
    </p>

<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
<div className="h-40 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Most Home Runs</p>
  {(() => {
    const best = seasonStats.reduce((highest, current) =>
      current.homeRuns > highest.homeRuns ? current : highest
    );

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.homeRuns}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
        
      </>
    );
  })()}
</div>
<div className="h-40 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Highest OPS</p>
  {(() => {
    const best = seasonStats.reduce((highest, current) =>
      Number(current.ops) > Number(highest.ops) ? current : highest
    );

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.ops}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
      </>
    );
  })()}
</div>
<div className="h-40 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Highest Batting Average</p>

  {(() => {
    const best = seasonStats.reduce((highest, current) =>
      Number(current.avg) > Number(highest.avg) ? current : highest
    );

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.avg}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
      </>
    );
  })()}
</div>
<div className="rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Most RBI</p>

  {(() => {
    const best = seasonStats.reduce((highest, current) =>
      current.rbi > highest.rbi ? current : highest
    );

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.rbi}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
      </>
    );
  })()}
</div>
</div>
</div>
)}


{pitchingSeasonStats.length > 0 && (
   <>
  <div className="mt-8 rounded-xl border border-white/10 bg-[#081321] p-6">
    <h3 className="mb-2 text-xl font-bold text-white">
      Pitching Performance Trends
    </h3>
    <select
  className="mt-4 rounded-lg border border-white/10 bg-[#0d1d30] px-4 py-2 text-white"
  value={selectedPitchingStat}
  onChange={(e) => setSelectedPitchingStat(e.target.value)}
>
  <option value="era">ERA</option>
  <option value="whip">WHIP</option>
  <option value="strikeOuts">Strikeouts</option>
  <option value="baseOnBalls">Walks</option>
  <option value="inningsPitched">Innings Pitched</option>
</select>

<div className="mt-6 h-80 w-full">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart
      data={pitchingSeasonStats.map((stats) => ({
        season: stats.season,
        value: Number(
          stats[selectedPitchingStat as keyof PitchingSeasonStats]
        ),
      }))}
    >
      <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
      <XAxis dataKey="season" stroke="#94a3b8" />
      <YAxis stroke="#94a3b8" domain={["auto", "auto"]} />
      <Tooltip
        contentStyle={{
          backgroundColor: "#0d1d30",
          border: "1px solid #334155",
          borderRadius: "8px",
        }}
      />
      <Line
        type="monotone"
        dataKey="value"
        stroke="#60a5fa"
        strokeWidth={3}
        dot={{ r: 4 }}
        activeDot={{ r: 7 }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

    <p className="text-sm text-slate-400">
      Explore season-by-season pitching performance, including ERA,
      WHIP, strikeouts, and innings pitched.
    </p>
    <div className="mt-6 overflow-x-auto">
  <table className="w-full text-left text-sm">
    <thead className="border-b border-white/10 text-slate-400">
      <tr>
        {[
  "Season", "G", "GS", "W-L", "IP", "H", "ER",
  "HR", "ERA", "WHIP", "SO", "BB", "K/9", "BB/9"
].map((label) => (
          <th key={label} className="p-3">
            {label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {pitchingSeasonStats.map((stats, index) => (
        <tr key={`${stats.season}-${index}`} className="border-b border-white/10">
          <td className="p-3">{stats.season}</td>
<td className="p-3">{stats.gamesPlayed}</td>
<td className="p-3">{stats.gamesStarted}</td>
<td className="p-3">{stats.wins}-{stats.losses}</td>
<td className="p-3">{stats.inningsPitched}</td>
<td className="p-3">{stats.hits}</td>
<td className="p-3">{stats.earnedRuns}</td>
<td className="p-3">{stats.homeRuns}</td>
          <td className="p-3">{stats.era}</td>
          <td className="p-3">{stats.whip}</td>
          <td className="p-3">{stats.strikeOuts}</td>
          <td className="p-3">{stats.baseOnBalls}</td>
          <td className="p-3">
  {(() => {
    const [innings, outs = "0"] = stats.inningsPitched.split(".");
    const totalOuts = Number(innings) * 3 + Number(outs);
    return totalOuts > 0
      ? (stats.strikeOuts * 27 / totalOuts).toFixed(2)
      : "N/A";
  })()}
</td>
<td className="p-3">
  {(() => {
    const [innings, outs = "0"] = stats.inningsPitched.split(".");
    const totalOuts = Number(innings) * 3 + Number(outs);
    return totalOuts > 0
      ? (stats.baseOnBalls * 27 / totalOuts).toFixed(2)
      : "N/A";
  })()}
</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
  </div>
  <div className="mt-8 rounded-xl border border-white/10 bg-[#081321] p-6">
  <h3 className="text-xl font-bold text-white">
    Pitching Career Summary
  </h3>
  <p className="mt-2 text-sm text-slate-400">
    A look at the player's career pitching performance.
  </p>
  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
  <div className="h-32 rounded-lg bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Games Played</p>
  <p className="mt-2 text-2xl font-bold text-white">
    {pitchingSeasonStats.reduce(
      (total, stats) => total + Number(stats.gamesPlayed || 0),
      0
    )}
  </p>
</div>
<div className="h-32 rounded-lg bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Strikeouts</p>
  <p className="mt-2 text-2xl font-bold text-white">
    {pitchingSeasonStats.reduce(
      (total, stats) => total + Number(stats.strikeOuts || 0),
      0
    )}
  </p>
</div>
<div className="h-32 rounded-lg bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Walks</p>
  <p className="mt-2 text-2xl font-bold text-white">
    {pitchingSeasonStats.reduce(
      (total, stats) => total + Number(stats.baseOnBalls || 0),
      0
    )}
  </p>
</div>
<div className="h-32 rounded-lg bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career Innings Pitched</p>
  <p className="mt-2 text-2xl font-bold text-white">
    {(() => {
      const totalOuts = pitchingSeasonStats.reduce((total, stats) => {
        const [innings, outs = "0"] = stats.inningsPitched.split(".");
        return total + Number(innings) * 3 + Number(outs);
      }, 0);

      return `${Math.floor(totalOuts / 3)}.${totalOuts % 3}`;
    })()}
  </p>
</div>
<div className="h-32 rounded-lg bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career ERA</p>
  <p className="mt-2 text-2xl font-bold text-white">
    {(() => {
      const totalEarnedRuns = pitchingSeasonStats.reduce(
  (total, stats) => total + (Number(stats.earnedRuns) || 0),
  0
      );

      const totalOuts = pitchingSeasonStats.reduce((total, stats) => {
        const [innings, outs = "0"] = stats.inningsPitched.split(".");
        return total + Number(innings) * 3 + Number(outs);
      }, 0);

      return totalOuts > 0
        ? ((totalEarnedRuns * 27) / totalOuts).toFixed(2)
        : "0.00";
    })()}
  </p>
</div>
<div className="h-32 rounded-lg bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">Career WHIP</p>
  <p className="mt-2 text-2xl font-bold text-white">
    {(() => {
      const totalWalks = pitchingSeasonStats.reduce(
        (total, stats) => total + Number(stats.baseOnBalls || 0),
        0
      );

      const totalHits = pitchingSeasonStats.reduce(
        (total, stats) => total + Number(stats.hits || 0),
        0
      );

      const totalOuts = pitchingSeasonStats.reduce((total, stats) => {
        const [innings, outs = "0"] = stats.inningsPitched.split(".");
        return total + Number(innings) * 3 + Number(outs);
      }, 0);

      return totalOuts > 0
        ? ((totalWalks + totalHits) / (totalOuts / 3)).toFixed(2)
        : "N/A";
    })()}
  </p>
</div>  {/* Closes Career WHIP card */}
</div>  {/* Closes the grid */}
</div>  {/* Closes Pitching Career Summary */}
<div className="mt-8 rounded-xl border border-white/10 bg-[#081321] p-6">
  <h3 className="text-xl font-bold text-white">
    Pitching Career Highs
  </h3>
  <p className="mt-2 text-sm text-slate-400">
    A look at the player's best single-season pitching performances.
  </p>
  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
  <div className="h-40 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">
    Most Strikeouts in a Season
  </p>

  {(() => {
    const best = pitchingSeasonStats.reduce((highest, current) =>
      current.strikeOuts > highest.strikeOuts ? current : highest
    );

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.strikeOuts}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
      </>
    );
  })()}
</div>
<div className="h-40 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">
    Most Innings Pitched in a Season
  </p>

  {(() => {
    const best = pitchingSeasonStats.reduce((highest, current) => {
      const toOuts = (ip: string) => {
        const [innings, outs = "0"] = ip.split(".");
        return Number(innings) * 3 + Number(outs);
      };

      return toOuts(current.inningsPitched) >
        toOuts(highest.inningsPitched)
        ? current
        : highest;
    });

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.inningsPitched}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
      </>
    );
  })()}
</div>
<div className="h-40 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">
    Lowest ERA in a Season (Min. 50 IP)
  </p>

  {(() => {
    const eligible = pitchingSeasonStats.filter((stats) => {
      const [innings] = stats.inningsPitched.split(".");
      return Number(innings) >= 50 &&
        Number.isFinite(Number(stats.era));
    });

    if (eligible.length === 0) {
      return <p className="mt-2 text-slate-400">No qualifying seasons</p>;
    }

    const best = eligible.reduce((lowest, current) =>
      Number(current.era) < Number(lowest.era) ? current : lowest
    );

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.era}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
      </>
    );
  })()}
</div>
<div className="h-40 rounded-lg border border-white/10 bg-[#0d1d30] p-4">
  <p className="text-sm text-slate-400">
    Lowest WHIP in a Season (Min. 50 IP)
  </p>

  {(() => {
    const eligible = pitchingSeasonStats.filter((stats) => {
      const [innings] = stats.inningsPitched.split(".");
      return Number(innings) >= 50 &&
        Number.isFinite(Number(stats.whip));
    });

    if (eligible.length === 0) {
      return (
        <p className="mt-2 text-slate-400">
          No qualifying seasons
        </p>
      );
    }

    const best = eligible.reduce((lowest, current) =>
      Number(current.whip) < Number(lowest.whip)
        ? current
        : lowest
    );

    return (
      <>
        <p className="mt-2 text-3xl font-bold text-blue-400">
          {best.whip}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {best.season} Season
        </p>
      </>
    );
    })()}
</div> {/* Closes Lowest WHIP card */}
</div> {/* Closes Career Highs grid */}
</div> {/* Closes Pitching Career Highs section */}
</>
)}
    
  </div>
</main>
);
}