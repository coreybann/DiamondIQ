"use client";

import Link from "next/link";

type StatGroup = "hitting" | "pitching";

type Player = {
  id: number;
  name: string;
  teamId: number | null;
  teamName: string;
  stats: Record<string, string | number>;
};

type Column = {
  key: string;
  label: string;
};

const HITTING_COLUMNS: Column[] = [
  { key: "gamesPlayed", label: "G" },
  { key: "plateAppearances", label: "PA" },
  { key: "atBats", label: "AB" },
  { key: "hits", label: "H" },
  { key: "homeRuns", label: "HR" },
  { key: "rbi", label: "RBI" },
  { key: "avg", label: "AVG" },
  { key: "obp", label: "OBP" },
  { key: "slg", label: "SLG" },
  { key: "ops", label: "OPS" },
  { key: "iso", label: "ISO" },
  { key: "babip", label: "BABIP" },
  { key: "strikeoutRate", label: "K%" },
  { key: "walkRate", label: "BB%" },
];

const PITCHING_COLUMNS: Column[] = [
  { key: "gamesPlayed", label: "G" },
  { key: "gamesStarted", label: "GS" },
  { key: "inningsPitched", label: "IP" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "era", label: "ERA" },
  { key: "whip", label: "WHIP" },
  { key: "strikeOuts", label: "SO" },
  { key: "baseOnBalls", label: "BB" },
  { key: "homeRuns", label: "HR" },
  { key: "strikeoutsPer9Inn", label: "K/9" },
  { key: "walksPer9Inn", label: "BB/9" },
  { key: "homeRunsPer9", label: "HR/9" },
  { key: "hitsPer9Inn", label: "H/9" },
  { key: "strikeoutRate", label: "K%" },
  { key: "walkRate", label: "BB%" },
  { key: "stuffPlus", label: "Stuff+" },
];

export default function LeaderboardTable({
  players,
  group,
  selectedColumns,
  sortKey,
  sortDirection,
  onSort,
}: {
  players: Player[];
  group: StatGroup;
  selectedColumns: string[];
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const allColumns =
    group === "hitting" ? HITTING_COLUMNS : PITCHING_COLUMNS;

  const columns = allColumns.filter((column) =>
    selectedColumns.includes(column.key)
  );

  function sortIndicator(key: string) {
    if (sortKey !== key) return "";
    return sortDirection === "desc" ? " ↓" : " ↑";
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full whitespace-nowrap text-left text-sm">
        <thead className="bg-[#142940] text-slate-300">
          <tr>
            <th className="px-4 py-3">#</th>

            {[
              { key: "name", label: "Player" },
              { key: "teamName", label: "Team" },
              ...columns,
            ].map((column) => (
              <th key={column.key} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  className="font-semibold hover:text-blue-400"
                >
                  {column.label}
                  {sortIndicator(column.key)}
                </button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-white/5">
          {players.map((player, index) => (
            <tr
              key={player.id}
              className="hover:bg-white/5"
            >
              <td className="px-4 py-3 text-slate-500">
                {index + 1}
              </td>

              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/players/${player.id}`}
                  className="text-blue-400 hover:underline"
                >
                  {player.name}
                </Link>
              </td>

              <td className="px-4 py-3 text-slate-400">
                {player.teamName}
              </td>

              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-4 py-3 tabular-nums text-slate-200"
                >
                  {column.key === "stuffPlus"
                    ? player.stats.stuffPlus == null
                      ? "—"
                      : Number(player.stats.stuffPlus).toFixed(2)
                    : player.stats[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {players.length === 0 && (
        <p className="p-6 text-center text-slate-400">
          No players found.
        </p>
      )}
    </div>
  );
}
