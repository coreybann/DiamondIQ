
"use client";

import { useMemo, useState } from "react";

type Pitcher = {
  id: number;
  name: string;
  games: number;
  wins: number;
  losses: number;
  era: string;
  whip: string;
  innings: string;
  strikeouts: number;
  walks: number;
  fwar?: number | null;
};

type SortKey = Exclude<keyof Pitcher, "id">;
type Direction = "asc" | "desc";

const columns: { label: string; key: SortKey }[] = [
  { label: "Player", key: "name" },
  { label: "G", key: "games" },
  { label: "W", key: "wins" },
  { label: "L", key: "losses" },
  { label: "ERA", key: "era" },
  { label: "WHIP", key: "whip" },
  { label: "IP", key: "innings" },
  { label: "SO", key: "strikeouts" },
  { label: "BB", key: "walks" },
  { label: "fWAR", key: "fwar" },
];

export default function SortablePitchingTable({
  pitchers,
}: {
  pitchers: Pitcher[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("strikeouts");
  const [direction, setDirection] = useState<Direction>("desc");

  const sortedPitchers = useMemo(() => {
    return [...pitchers].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (sortKey === "name") {
        const result = String(aValue).localeCompare(String(bValue));
        return direction === "asc" ? result : -result;
      }

      // Keep missing fWAR values at the bottom.
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const aNumber = Number(aValue);
      const bNumber = Number(bValue);

      const aMissing = !Number.isFinite(aNumber);
      const bMissing = !Number.isFinite(bNumber);

      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;

      const result = aNumber - bNumber;
      return direction === "asc" ? result : -result;
    });
  }, [pitchers, sortKey, direction]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
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
          {sortedPitchers.map((player) => (
            <tr
              key={player.id}
              className="border-t border-slate-700 hover:bg-white/5"
            >
              <td className="sticky left-0 z-10 min-w-[150px] bg-[#081321] px-4 py-4 font-semibold whitespace-nowrap md:static md:bg-transparent">
                {player.name}
              </td>
              <td className="px-4 py-4">{player.games}</td>
              <td className="px-4 py-4">{player.wins}</td>
              <td className="px-4 py-4">{player.losses}</td>
              <td className="px-4 py-4">{player.era}</td>
              <td className="px-4 py-4">{player.whip}</td>
              <td className="px-4 py-4">{player.innings}</td>
              <td className="px-4 py-4">{player.strikeouts}</td>
              <td className="px-4 py-4">{player.walks}</td>
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
