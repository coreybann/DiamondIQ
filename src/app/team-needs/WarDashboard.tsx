"use client";

import { useState } from "react";
import type { FreeAgent } from "@/lib/freeAgency";
import type {
  TeamBwarSummary,
} from "@/lib/teamNeeds";

type WarDashboardProps = {
  bwarTeams: TeamBwarSummary[];
  positionRankings: ReturnType<typeof import("@/lib/teamNeeds").getTeamPositionRankings>;
  freeAgentRecommendations: Record<string, FreeAgent[]>;
  teamNames: Record<number, string>;
};

export default function WarDashboard({
  bwarTeams,
  positionRankings,
  freeAgentRecommendations,
  teamNames,
}: WarDashboardProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>("NYY");

  const rankedBwarTeams = [...bwarTeams].sort(
  (a, b) => b.totalWar - a.totalWar
);

const hittingBwarTeams = [...bwarTeams].sort(
  (a, b) => b.hittingWar - a.hittingWar
);

const pitchingBwarTeams = [...bwarTeams].sort(
  (a, b) => b.pitchingWar - a.pitchingWar
);

const bwarRankings = rankedBwarTeams.map((team, index) => ({
  team: team.team,
  overallRank: index + 1,
  hittingWar: team.hittingWar,
  hittingRank:
    hittingBwarTeams.findIndex((t) => t.team === team.team) + 1,
  pitchingWar: team.pitchingWar,
  pitchingRank:
    pitchingBwarTeams.findIndex((t) => t.team === team.team) + 1,
  totalWar: team.totalWar,
}));
const bwarTeamNames: Record<string, string> = {
  ARI: "Arizona Diamondbacks",
  ATL: "Atlanta Braves",
  BAL: "Baltimore Orioles",
  BOS: "Boston Red Sox",
  CHC: "Chicago Cubs",
  CHW: "Chicago White Sox",
  CIN: "Cincinnati Reds",
  CLE: "Cleveland Guardians",
  COL: "Colorado Rockies",
  DET: "Detroit Tigers",
  HOU: "Houston Astros",
  KCR: "Kansas City Royals",
  LAA: "Los Angeles Angels",
  LAD: "Los Angeles Dodgers",
  MIA: "Miami Marlins",
  MIL: "Milwaukee Brewers",
  MIN: "Minnesota Twins",
  NYM: "New York Mets",
  NYY: "New York Yankees",
  PHI: "Philadelphia Phillies",
  PIT: "Pittsburgh Pirates",
  SDP: "San Diego Padres",
  SEA: "Seattle Mariners",
  SFG: "San Francisco Giants",
  STL: "St. Louis Cardinals",
  TBR: "Tampa Bay Rays",
  TEX: "Texas Rangers",
  TOR: "Toronto Blue Jays",
  WSN: "Washington Nationals",
  ATH: "Athletics",
};
const teamOptions = [...bwarTeams].sort((a, b) =>
  (bwarTeamNames[a.team] ?? a.team).localeCompare(
    bwarTeamNames[b.team] ?? b.team
  )
);
const selectedTeamPositions = positionRankings.map((position) => ({
  position: position.position,
  leagueAverage: position.leagueAverage,
  teamData: position.rankings.find(
    (team) => team.team === selectedTeam
  ),
}));
const biggestRosterWeakness = [...selectedTeamPositions]
  .filter((item) => item.teamData !== undefined)
  .sort(
    (a, b) =>
      a.teamData!.vsLeagueAverage -
      b.teamData!.vsLeagueAverage
  )[0];

const topRosterNeeds = [...selectedTeamPositions]
  .filter(
    (item) =>
      item.teamData !== undefined &&
      item.teamData.vsLeagueAverage < 0
  )
  .sort(
    (a, b) =>
      a.teamData!.vsLeagueAverage -
      b.teamData!.vsLeagueAverage
  )
  .slice(0, 3);
  const biggestRosterStrength = [...selectedTeamPositions]
  .filter((item) => item.teamData !== undefined)
  .sort(
    (a, b) =>
      b.teamData!.vsLeagueAverage -
      a.teamData!.vsLeagueAverage
  )[0];
const displayedRankings = bwarRankings.map((team) => ({
  key: team.team,
  teamName: bwarTeamNames[team.team] ?? team.team,
  overallRank: team.overallRank,
  hittingWar: team.hittingWar,
  hittingRank: team.hittingRank,
  pitchingWar: team.pitchingWar,
  pitchingRank: team.pitchingRank,
  totalWar: team.totalWar,
}));
const bwarAverageHitting =
  bwarTeams.length > 0
    ? bwarTeams.reduce((sum, team) => sum + team.hittingWar, 0) /
      bwarTeams.length
    : 0;

const bwarAveragePitching =
  bwarTeams.length > 0
    ? bwarTeams.reduce((sum, team) => sum + team.pitchingWar, 0) /
      bwarTeams.length
    : 0;

const displayedHittingAverage = bwarAverageHitting;
const displayedPitchingAverage = bwarAveragePitching;
  return (
    <div className="mt-6">
        <div className="mb-6">
  <label
    htmlFor="team-select"
    className="mb-2 block text-sm font-medium text-slate-300"
  >
    Select MLB Team
  </label>

  <select
    id="team-select"
    value={selectedTeam}
    onChange={(event) => setSelectedTeam(event.target.value)}
    className="w-full max-w-sm rounded-lg border border-slate-700 bg-[#12243a] px-4 py-3 text-white"
  >
    {teamOptions.map((team) => (
      <option key={team.team} value={team.team}>
        {bwarTeamNames[team.team] ?? team.team}
      </option>
    ))}
  </select>
</div>
<div className="mt-8 mb-6">
  <h2 className="text-xl font-bold text-white">
    Roster Gap Analysis (2026 bWAR Only)
  </h2>
  <p className="mt-2 text-sm text-slate-400">
    Analyze positional strengths and weaknesses using 2026
    Baseball-Reference WAR.
  </p>
</div>
<div className="grid gap-4 md:grid-cols-2">
{biggestRosterWeakness?.teamData && (
  <div className="mb-6 rounded-xl border border-red-500/30 bg-[#0d1d30] p-5">
    <p className="text-sm font-medium text-slate-400">
      Biggest Positional Weakness
    </p>
    <h3 className="mt-2 text-2xl font-bold text-white">
      {biggestRosterWeakness.position}
    </h3>
    <p className="mt-2 text-sm text-red-400">
      {biggestRosterWeakness.teamData.vsLeagueAverage.toFixed(1)} bWAR
      compared to MLB average
    </p>
    <p className="mt-1 text-sm text-slate-400">
      MLB Rank: #{biggestRosterWeakness.teamData.rank} of 30
    </p>
  </div>
)}
{biggestRosterStrength?.teamData && (
  <div className="mb-6 rounded-xl border border-green-500/30 bg-[#0d1d30] p-5">
    <p className="text-sm font-medium text-slate-400">
      Biggest Positional Strength
    </p>
    <h3 className="mt-2 text-2xl font-bold text-white">
      {biggestRosterStrength.position}
    </h3>
    <p className="mt-2 text-sm text-green-400">
      {biggestRosterStrength.teamData.vsLeagueAverage.toFixed(1)} bWAR
      compared to MLB average
    </p>
    <p className="mt-1 text-sm text-slate-400">
      MLB Rank: #{biggestRosterStrength.teamData.rank} of 30
    </p>
  </div>
)}
</div>
<div className="mb-6 rounded-xl border border-slate-700 bg-[#0d1d30] p-5">
  <h3 className="text-lg font-bold text-white">
    Top 3 Roster Needs
  </h3>

  {topRosterNeeds.length > 0 ? (
    <div className="mt-4 space-y-3">
      {topRosterNeeds.map((item, index) => (
        <div
          key={item.position}
          className="flex items-center justify-between gap-4 border-b border-slate-700 pb-3 last:border-0 last:pb-0"
        >
          <span className="font-medium text-white">
            {index + 1}. {item.position}
          </span>
          <span className="text-sm text-red-400">
            {item.teamData!.vsLeagueAverage.toFixed(1)} bWAR
          </span>
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-3 text-sm text-green-400">
      No positions below the MLB average.
    </p>
  )}
</div>
<div className="mb-6 rounded-xl border border-slate-700 bg-[#0d1d30] p-5">
  <h3 className="text-lg font-bold text-white">
    Recommended Free Agent Targets
  </h3>

  <p className="mt-2 text-sm text-slate-400">
    Available 2026–27 free agents matched to the team's
    biggest 2026 positional weaknesses, ranked by combined
    2025–2026 WAR.
  </p>

  {topRosterNeeds.length > 0 ? (
    <div className="mt-5 space-y-5">
      {topRosterNeeds.map((need) => (
        <div key={need.position}>
          <h4 className="mb-3 font-semibold text-blue-400">
            {need.position} Targets
          </h4>

          {(freeAgentRecommendations[need.position] ?? []).length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {freeAgentRecommendations[need.position].map((player) => (
                <div
                  key={player.id}
                  className="rounded-lg border border-slate-700 bg-[#12243a] p-4"
                >
                  <p className="font-semibold text-white">
                    {player.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {player.position} · Age {player.age ?? "N/A"}
                  </p>
                  <p className="mt-2 text-sm text-blue-400">
                    2025–26 WAR:{" "}
                    {player.war2025_2026?.toFixed(1) ?? "N/A"}
                  </p>
                  <p className="mt-1 text-xs text-green-400">
                    {player.status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No confirmed available free-agent targets at this position.
            </p>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-4 text-sm text-slate-400">
      No below-average positions identified for this team.
    </p>
  )}
</div>
<div className="mb-8 overflow-x-auto rounded-xl border border-slate-700 bg-[#0d1d30]">
  <table className="w-full text-left text-sm">
    <thead className="border-b border-slate-700 bg-[#12243a] text-slate-300">
      <tr>
        <th className="px-4 py-3">Position</th>
        <th className="px-4 py-3">Team bWAR</th>
        <th className="px-4 py-3">MLB Rank</th>
        <th className="px-4 py-3">League Average</th>
        <th className="px-4 py-3">Above/Below Average</th>
      </tr>
    </thead>
    <tbody>
      {selectedTeamPositions.map((item) => (
        <tr key={item.position} className="border-b border-slate-800">
          <td className="px-4 py-3 font-medium">{item.position}</td>
          <td className="px-4 py-3">{item.teamData?.war.toFixed(1) ?? "—"}</td>
          <td className="px-4 py-3">{item.teamData?.rank ?? "—"}</td>
          <td className="px-4 py-3">{item.leagueAverage.toFixed(1)}</td>
          <td
  className={`px-4 py-3 font-medium ${
    !item.teamData
      ? "text-slate-400"
      : item.teamData.vsLeagueAverage > 0
      ? "text-green-400"
      : item.teamData.vsLeagueAverage < 0
      ? "text-red-400"
      : "text-slate-300"
  }`}
>
            {item.teamData
              ? item.teamData.vsLeagueAverage.toFixed(1)
              : "—"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div className="mt-10 mb-6">
  <h2 className="text-xl font-bold text-white">
    MLB Team WAR Rankings
  </h2>
  <p className="mt-2 text-sm text-slate-400">
    Compare all 30 MLB teams using 2026 Baseball-Reference bWAR.
  </p>
</div>

      <p className="mt-3 text-sm text-slate-400">
  Viewing 2026 Baseball-Reference WAR rankings.
</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
  <div className="rounded-xl border border-slate-700 bg-[#0d1d30] p-5">
    <p className="text-sm text-slate-400">
      MLB Average{" "}
      Position-Player bWAR
    </p>
    <p className="mt-2 text-3xl font-bold">
      {displayedHittingAverage.toFixed(1)}
    </p>
  </div>

  <div className="rounded-xl border border-slate-700 bg-[#0d1d30] p-5">
    <p className="text-sm text-slate-400">
      MLB Average{" "}
      Pitching bWAR
    </p>
    <p className="mt-2 text-3xl font-bold">
      {displayedPitchingAverage.toFixed(1)}
    </p>
  </div>
</div>
<div className="mt-8 overflow-x-auto rounded-xl border border-slate-700 bg-[#0d1d30]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 bg-[#12243a] text-slate-300">
              <tr>
                <th className="px-4 py-3">MLB Team</th>
                <th className="px-4 py-3">Overall Rank</th>
                <th className="px-4 py-3">
  Position-Player bWAR
</th>
                <th className="px-4 py-3">Hitting Rank</th>
                <th className="px-4 py-3">
  Pitching bWAR
</th>
                <th className="px-4 py-3">Pitching Rank</th>
                <th className="px-4 py-3">
 Total bWAR
</th>
              </tr>
            </thead>

            <tbody>
              {displayedRankings.map((team) => (
                <tr
                  key={team.key}
                  className="border-b border-slate-700/60 hover:bg-[#12243a]"
                >
                  <td className="px-4 py-3 font-medium">
  {team.teamName}
</td>
                  <td className="px-4 py-3">{team.overallRank}</td>
                  <td className="px-4 py-3">{team.hittingWar.toFixed(1)}</td>
                  <td className="px-4 py-3">{team.hittingRank}</td>
                  <td className="px-4 py-3">{team.pitchingWar.toFixed(1)}</td>
                  <td className="px-4 py-3">{team.pitchingRank}</td>
                  <td className="px-4 py-3 font-semibold">
                    {team.totalWar.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}