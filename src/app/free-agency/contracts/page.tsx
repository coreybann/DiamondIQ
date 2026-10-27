
"use client";

import Link from "next/link";
import { useState } from "react";
import freeAgentData from "../../../../public/data/free-agents-2027.json";
import { projectContract } from "@/lib/contractProjections";
import contractData from "../../../../public/data/mlb-contract-comparables.json";
type FreeAgent = {
  name: string;
  position: string;
  age: number;
  war2025_2026: number;
  contractOption?: string | null;
};

const players = (freeAgentData.players as FreeAgent[]).sort((a, b) =>
  a.name.localeCompare(b.name)
);

export default function ContractProjectionsPage() {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(search.toLowerCase())
  );

  const player = players.find((p) => p.name === selectedPlayer);
const projection = player ? projectContract(player) : null;
const comparableContracts = player
  ? contractData.contracts.filter(
      (contract) => contract.position === player.position
    )
  : [];
  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/free-agency"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to Free Agency Hub
        </Link>

        <div className="mb-10 mt-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
            DiamondIQ | 2026–2027 Offseason
          </p>

          <h1 className="text-4xl font-bold">
            Free Agent Contract Projections
          </h1>

          <p className="mt-4 max-w-3xl text-gray-400">
            Explore potential MLB free agents and their projected contract
            values using DiamondIQ's experimental evaluation model.
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
          <h2 className="text-xl font-semibold">Select a Free Agent</h2>

          <input
            type="text"
            placeholder="Search for a player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 w-full rounded-lg border border-slate-600 bg-[#081321] px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          
{search.trim() && (
  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-600 bg-[#081321]">
    {filteredPlayers.length > 0 ? (
      filteredPlayers.slice(0, 10).map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => {
            setSelectedPlayer(p.name);
            setSearch("");
          }}
          className="block w-full border-b border-slate-700 px-4 py-3 text-left text-white transition hover:bg-blue-900 last:border-b-0"
        >
          <span className="font-semibold">{p.name}</span>
          <span className="ml-2 text-sm text-gray-400">
            {p.position}
          </span>
        </button>
      ))
    ) : (
      <p className="px-4 py-3 text-sm text-gray-400">
        No matching free agents found.
      </p>
    )}
  </div>
)}

        </div>

        {player && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
            <h2 className="text-2xl font-bold">{player.name}</h2>
            <p className="mt-2 text-gray-400">
              {player.position} | Age {player.age} | 2025–2026 WAR:{" "}
              {player.war2025_2026}
            </p>

            <p className="mt-2 text-sm text-yellow-400">
              {player.contractOption
                ? `Pending: ${player.contractOption}`
                : "Projected Free Agent — Unverified"}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
  {
    label: "Projected Years",
    value: projection ? `${projection.years} Years` : "—",
  },
  {
    label: "Projected AAV",
    value: projection
      ? `$${projection.aavMillions.toFixed(1)}M`
      : "—",
  },
  {
    label: "Projected Total Value",
    value: projection
      ? `$${projection.totalMillions.toFixed(1)}M`
      : "—",
  },
].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-700 bg-[#081321] p-5"
                >
                  <p className="text-sm text-gray-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold text-blue-400">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

{comparableContracts.length > 0 && (
  <div className="mt-8">
    <h3 className="text-xl font-semibold">
      Historical Contract Comparables
    </h3>

    <p className="mt-2 text-sm text-gray-400">
      Recent MLB free agent contracts at the same position.
      These are market references, not exact player comparisons.
    </p>

    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      {comparableContracts.map((contract) => (
        <div
          key={contract.player}
          className="rounded-lg border border-slate-700 bg-[#081321] p-5"
        >
          <h4 className="text-lg font-semibold">
            {contract.player}
          </h4>

          <p className="mt-1 text-sm text-gray-400">
            {contract.team}
          </p>

          <p className="mt-4 text-blue-400">
            {contract.years} Years · ${contract.totalMillions}M
          </p>

          <p className="mt-1 text-sm text-gray-400">
            ${contract.aavMillions.toFixed(2)}M AAV
          </p>

          <a
            href={contract.source}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-blue-400 hover:underline"
          >
            View Contract Source →
          </a>
        </div>
      ))}
    </div>
  </div>
)}

          </div>
        )}

        <p className="mt-6 text-xs text-gray-500">
          DiamondIQ projections are experimental estimates, not confirmed
          contracts. Free agent eligibility is not independently verified.
        </p>
      </div>
    </main>
  );
}
