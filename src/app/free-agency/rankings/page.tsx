"use client";
import Link from "next/link";
import { useState } from "react";

import freeAgentData from "../../../../public/data/free-agents-2027.json";


const players = [...freeAgentData.players]
  .map((player) => ({
    ...player,
    war: player.war2025_2026,
    diamondIQScore: calculateFreeAgentScore(
      player.war2025_2026,
      player.age,
      player.position
    ),
  }))
  .sort((a, b) =>
    b.diamondIQScore - a.diamondIQScore ||
    b.war - a.war
  );


function calculateFreeAgentScore(
  war: number,
  age: number,
  position: string
): number {
  // Recent performance: 60%
  const warScore = Math.max(
    0,
    Math.min(100, (war / 12) * 100)
  );

  // Age and future value: 30%
  const ageScore = Math.max(
    0,
    Math.min(100, 100 - Math.max(0, age - 27) * 7)
  );

  // Positional value: 10%
  const positionalValues: Record<string, number> = {
    C: 95,
    SS: 95,
    CF: 90,
    SP: 90,
    "2B": 80,
    "3B": 80,
    RF: 75,
    LF: 70,
    "1B": 65,
    RP: 65,
    DH: 55,
  };

  const positionScore = positionalValues[position] ?? 70;

  // DiamondIQ Free Agent Score
  return Math.round(
    warScore * 0.6 +
    ageScore * 0.3 +
    positionScore * 0.1
  );
}

export default function FreeAgentRankingsPage() {
  const [position, setPosition] = useState("All");
const [search, setSearch] = useState("");
  const positions = [
  "All", "C", "1B", "2B", "3B", "SS",
  "LF", "CF", "RF", "DH", "SP", "RP"
];

  const filteredPlayers = players.filter((player) => {
  const matchesPosition =
    position === "All" || player.position === position;

  const matchesSearch = player.name
    .toLowerCase()
    .includes(search.toLowerCase().trim());

  return matchesPosition && matchesSearch;
});
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-white">
      <Link
        href="/free-agency"
        className="text-sm text-blue-400 hover:underline"
      >
        ← Back to Free Agency Hub
      </Link>

      <div className="mt-8 mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ | 2026–2027 Offseason
        </p>
        <h1 className="text-4xl font-bold">Free Agent Rankings</h1>
        <p className="mt-4 max-w-3xl text-gray-400">
          Explore 256 potential MLB free agents for the 2026–2027
offseason, ranked using the DiamondIQ Free Agent Score.
Our evaluation combines recent performance, age, and
positional value to identify the strongest available
and prospective free agent talent.
        </p>
      </div>
      <div className="mb-5">
  <input
    type="text"
    placeholder="Search free agents..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500"
  />
</div>
<div className="mb-6 flex items-center gap-4">
  <label className="text-sm font-medium text-gray-300">
    Filter by Position
  </label>

  <select
    value={position}
    onChange={(e) => setPosition(e.target.value)}
    className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white"
  >
    {positions.map((pos) => (
      <option key={pos} value={pos}>
        {pos === "All" ? "All Positions" : pos}
      </option>
    ))}
  </select>
</div>

<div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
  <h2 className="text-lg font-bold text-white">
    How DiamondIQ Rankings Work
  </h2>

  <p className="mt-2 text-sm text-gray-400">
    DiamondIQ evaluates potential free agents using a custom
    100-point scoring model designed to balance recent production,
    age, and positional value.
  </p>

  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div>
      <p className="text-2xl font-bold text-blue-400">60%</p>
      <p className="text-sm text-gray-300">2025–2026 WAR</p>
    </div>

    <div>
      <p className="text-2xl font-bold text-blue-400">30%</p>
      <p className="text-sm text-gray-300">Age</p>
    </div>

    <div>
      <p className="text-2xl font-bold text-blue-400">10%</p>
      <p className="text-sm text-gray-300">Positional Value</p>
    </div>
  </div>

  <p className="mt-4 text-xs text-gray-500">
    Scores are experimental DiamondIQ evaluations, not official MLB
    statistics or validated projections. Rankings do not account for
    expected contract cost, injuries, or future performance projections.
    Player availability remains subject to contract and option decisions.
  </p>
</div>

      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
        <table className="w-full text-left">
          <thead className="border-b border-gray-800 bg-gray-900 text-sm text-gray-400">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Player</th>
              <th className="p-4">Position</th>
              <th className="p-4">2027 Age</th>
              <th className="p-4">DiamondIQ Score</th>
              <th className="p-4">2025–26 WAR</th>
              <th className="p-4">Contract Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, index) => (
              <tr
                key={player.name}
                className="border-b border-gray-800/70 hover:bg-gray-900"
              >
                <td className="p-4 font-bold text-blue-400">
                  #{players.findIndex((p) => p.name === player.name) + 1}
                </td>
                <td className="p-4 font-semibold">{player.name}</td>
                <td className="p-4 text-gray-300">{player.position}</td>
                <td className="p-4 text-gray-300">{player.age}</td>
                <td className="p-4">
  <span className="font-bold text-blue-400">
    {player.diamondIQScore}/100
  </span>
</td>
                <td className="p-4 font-semibold">
  {player.war.toFixed(1)}
</td>

<td className="p-4 text-sm text-gray-300">
  {player.contractOption
    ? `Pending: ${player.contractOption}`
    : "Projected FA"}
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-xs text-gray-500">
        Source: MLB.com, October 8, 2026. Ages reflect the 2027 season.
        This preliminary list includes players with contract options
and does not confirm official free agency availability.
      </p>
      <a
        href="https://www.mlb.com/news/mlb-free-agents-2026-2027"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm text-blue-400 hover:underline"
      >
        View original MLB.com free agent list
      </a>
    </main>
  );
}
