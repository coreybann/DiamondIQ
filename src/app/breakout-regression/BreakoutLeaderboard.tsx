"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Prediction = "Breakout" | "Stable" | "Regression";

type Player = {
  player_id: number;
  player_name: string;
  PA_2026: number;
  OPS_2026: number;
  projected_OPS_2027: number;
  projected_OPS_change: number;
  prediction: Prediction;
};

type SortKey =
  | "player_name"
  | "PA_2026"
  | "OPS_2026"
  | "projected_OPS_2027"
  | "projected_OPS_change";

export default function BreakoutLeaderboard({
  players,
}: {
  players: Player[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>(
    "projected_OPS_change"
  );
  const [descending, setDescending] = useState(true);

  const filtered = useMemo(() => {
    return players
      .filter((player) =>
        player.player_name
          .toLowerCase()
          .includes(search.toLowerCase().trim())
      )
      .filter(
        (player) =>
          filter === "All" || player.prediction === filter
      )
      .sort((a, b) => {
        const first = a[sortKey];
        const second = b[sortKey];

        const comparison =
          typeof first === "string" && typeof second === "string"
            ? first.localeCompare(second)
            : Number(first) - Number(second);

        return descending ? -comparison : comparison;
      });
  }, [players, search, filter, sortKey, descending]);

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setDescending(!descending);
    } else {
      setSortKey(key);
      setDescending(key !== "player_name");
    }
  }

  const columns: { label: string; key: SortKey }[] = [
    { label: "Player", key: "player_name" },
    { label: "2026 PA", key: "PA_2026" },
    { label: "2026 OPS", key: "OPS_2026" },
    { label: "2027 Projected OPS", key: "projected_OPS_2027" },
    { label: "Projected Change", key: "projected_OPS_change" },
  ];

  return (
    <section className="mt-10 rounded-xl border border-white/10 bg-[#0d1d30] p-5 md:p-6">
      <h2 className="text-xl font-bold">
        2027 Hitter Breakout & Regression Leaderboard
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        Experimental projections for MLB hitters with at least
        200 plate appearances in 2026. Predictions are not
        guarantees of future performance.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search players..."
          aria-label="Search players"
          className="w-full rounded-lg border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none focus:border-blue-400 sm:max-w-sm"
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter prediction classification"
          className="rounded-lg border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white"
        >
          <option value="All">All Predictions</option>
          <option value="Breakout">Breakout</option>
          <option value="Stable">Stable</option>
          <option value="Regression">Regression</option>
        </select>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Showing {filtered.length} of {players.length} players
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => changeSort(column.key)}
                    className="font-semibold hover:text-white"
                  >
                    {column.label}
                    {sortKey === column.key
                      ? descending ? " ↓" : " ↑"
                      : ""}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3">Classification</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((player) => (
              <tr
                key={player.player_id}
                className="border-b border-white/5 hover:bg-white/5"
              >
                <td className="px-3 py-3 font-medium">
                  <Link
                    href={`/players/${player.player_id}`}
                    className="text-blue-300 hover:text-blue-200 hover:underline"
                  >
                    {player.player_name}
                  </Link>
                </td>
                <td className="px-3 py-3">{player.PA_2026}</td>
                <td className="px-3 py-3">
                  {player.OPS_2026.toFixed(3)}
                </td>
                <td className="px-3 py-3">
                  {player.projected_OPS_2027.toFixed(3)}
                </td>
                <td
                  className={`px-3 py-3 font-semibold ${
                    player.projected_OPS_change > 0
                      ? "text-emerald-400"
                      : player.projected_OPS_change < 0
                        ? "text-rose-400"
                        : "text-slate-300"
                  }`}
                >
                  {player.projected_OPS_change > 0 ? "+" : ""}
                  {player.projected_OPS_change.toFixed(3)}
                </td>
                <td className="px-3 py-3">
                  {player.prediction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-slate-400">
          No players match your filters.
        </p>
      )}
    </section>
  );
}
