
"use client";

import { useMemo, useState } from "react";

type Hitter = {
  id: number;
  name: string;
  games: number | string;
  plateAppearances: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  homeRuns: number;
  rbi: number;
  fwar?: number | null;
};

type SortKey = Exclude<keyof Hitter, "id">;
type SortDirection = "asc" | "desc";

const columns: { label: string; key: SortKey }[] = [
  { label: "Player", key: "name" },
  { label: "G", key: "games" },
  { label: "PA", key: "plateAppearances" },
  { label: "AVG", key: "avg" },
  { label: "OBP", key: "obp" },
  { label: "SLG", key: "slg" },
  { label: "OPS", key: "ops" },
  { label: "HR", key: "homeRuns" },
  { label: "RBI", key: "rbi" },
  { label: "fWAR", key: "fwar" },
];

export default function SortableBattingTable({
  hitters,
}: {
  hitters: Hitter[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("homeRuns");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const sortedHitters = useMemo(() => {
    return [...hitters].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Missing fWAR values always appear last.
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const comparison =
        sortKey === "name"
          ? String(aValue).localeCompare(String(bValue))
          : Number(aValue) - Number(bValue);

      return direction === "asc" ? comparison : -comparison;
    });
  }, [hitters, sortKey, direction]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setDirection((current) =>
        current === "desc" ? "asc" : "desc"
      );
    } else {
      setSortKey(key);
      setDirection(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#162a43] text-slate-300">
          <tr>
            {columns.map(({ label, key }) => (
              <th
                key={key}
                scope="col"
                aria-sort={
                  sortKey === key
                    ? direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className={`px-4 py-4 whitespace-nowrap ${
                  key === "name"
                    ? "sticky left-0 z-20 min-w-[150px] bg-[#162a43] md:static"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSort(key)}
                  className={`cursor-pointer hover:text-blue-400 ${
                    sortKey === key ? "text-blue-400" : ""
                  }`}
                >
                  {label}
                  {sortKey === key
                    ? direction === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedHitters.map((player) => (
            <tr
              key={player.id}
              className="border-t border-slate-700 hover:bg-white/5"
            >
              <td className="sticky left-0 z-10 min-w-[150px] bg-[#081321] px-4 py-4 font-semibold whitespace-nowrap md:static md:bg-transparent">
                {player.name}
              </td>
              <td className="px-4 py-4">{player.games}</td>
              <td className="px-4 py-4">{player.plateAppearances}</td>
              <td className="px-4 py-4">{player.avg}</td>
              <td className="px-4 py-4">{player.obp}</td>
              <td className="px-4 py-4">{player.slg}</td>
              <td className="px-4 py-4">{player.ops}</td>
              <td className="px-4 py-4">{player.homeRuns}</td>
              <td className="px-4 py-4">{player.rbi}</td>
              <td className="px-4 py-4">
                {player.fwar == null
                  ? "—"
                  : player.fwar.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

