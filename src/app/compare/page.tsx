"use client";

import { useState } from "react";
import PlayerSearch from "./PlayerSearch";
import PlayerComparison from "./PlayerComparison";
type Player = {
  id: number;
  name: string;
  position: string;
  team: string;
};

export default function ComparePage() {
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [season, setSeason] = useState<number>(2026);
  const [statGroup, setStatGroup] = useState<"hitting" | "pitching">("hitting");
  
  return (
    <main className="min-h-screen bg-[#081321] text-white">
      

      <section className="mx-auto max-w-7xl px-6 py-16">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-400">
          MLB Player Analysis
        </p>

        <h1 className="text-4xl font-black md:text-5xl">
          Player Comparison
        </h1>

        <p className="mt-5 max-w-2xl text-slate-400">
          Compare MLB players side by side using performance
          statistics, advanced metrics, and scouting insights.
        </p>
<div className="mt-8">
  <label
    htmlFor="season"
    className="mb-2 block text-sm font-semibold text-blue-400"
  >
    SELECT SEASON
  </label>

  <select
    id="season"
    value={season}
    onChange={(e) => setSeason(Number(e.target.value))}
    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white"
  >
    {Array.from({ length: 11 }, (_, i) => 2026 - i).map((year) => (
      <option key={year} value={year}>
        {year}
      </option>
    ))}
  </select>
</div>
<div className="mt-6">
  <label className="mb-2 block text-sm font-semibold text-blue-400">
    STATISTICS TYPE
  </label>

  <select
    value={statGroup}
    onChange={(e) =>
      setStatGroup(e.target.value as "hitting" | "pitching")
    }
    className="rounded-lg border border-slate-700 bg-[#0d1d30] px-4 py-3 text-white"
  >
    <option value="hitting">Batting Statistics</option>
    <option value="pitching">Pitching Statistics</option>
  </select>
</div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
<PlayerSearch label="PLAYER 1" onSelect={setPlayer1} />
<PlayerSearch label="PLAYER 2" onSelect={setPlayer2} />
</div>
          

        <div className="mt-10 rounded-xl border border-slate-700 bg-[#12243a] p-8">
          <h2 className="text-2xl font-bold">
            Statistical Comparison
          </h2>

{player1 && player2 ? (
<PlayerComparison
  player1={player1}
  player2={player2}
  season={season}
  statGroup={statGroup}
/>
) : (
  <p className="mt-3 text-slate-400">
    Select two players to compare their performance.
  </p>
)}

        </div>
      </section>
    </main>
  );
}
