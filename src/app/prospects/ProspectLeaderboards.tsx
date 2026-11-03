"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Player = {
  id: number;
  name: string;
  teamId: number | null;
  team: string;
  stats: Record<string, unknown>;
};

type Column = {
  key: string;
  label: string;
  lowerBetter?: boolean;
};

const HITTING: Column[] = [
  { key: "gamesPlayed", label: "G" },
  { key: "plateAppearances", label: "PA" },
  { key: "avg", label: "AVG" },
  { key: "obp", label: "OBP" },
  { key: "slg", label: "SLG" },
  { key: "ops", label: "OPS" },
  { key: "homeRuns", label: "HR" },
  { key: "rbi", label: "RBI" },
  { key: "stolenBases", label: "SB" },
  { key: "baseOnBalls", label: "BB" },
  { key: "strikeOuts", label: "SO", lowerBetter: true },
];

const PITCHING: Column[] = [
  { key: "gamesPlayed", label: "G" },
  { key: "inningsPitched", label: "IP" },
  { key: "era", label: "ERA", lowerBetter: true },
  { key: "whip", label: "WHIP", lowerBetter: true },
  { key: "strikeOuts", label: "SO" },
  { key: "baseOnBalls", label: "BB", lowerBetter: true },
  { key: "hits", label: "H", lowerBetter: true },
  { key: "homeRuns", label: "HR", lowerBetter: true },
];

const LEVELS = [
  { id: 11, label: "Triple-A" },
  { id: 12, label: "Double-A" },
  { id: 13, label: "High-A" },
  { id: 14, label: "Single-A" },
];

function inningsToOuts(value: unknown): number {
  const [innings, outs = "0"] = String(value ?? "0").split(".");
  return Number(innings) * 3 + Number(outs);
}

function numeric(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function ProspectLeaderboards() {
  const [group, setGroup] = useState<"hitting" | "pitching">("hitting");
  const [level, setLevel] = useState(11);
  const [season, setSeason] = useState(2026);
  const [minimum, setMinimum] = useState(200);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sortKey, setSortKey] = useState("ops");
  const [descending, setDescending] = useState(true);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          season: String(season),
          level: String(level),
          group,
        });

        const response = await fetch(
          `/api/prospect-leaderboards?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Request failed");

        const data = await response.json();
        if (!controller.signal.aborted) {
          setPlayers(data.players ?? []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to load leaderboard statistics.");
          setPlayers([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [group, level, season]);

  const columns = group === "hitting" ? HITTING : PITCHING;

  const teams = useMemo(
    () =>
      [...new Set(players.map((player) => player.team))]
        .sort((a, b) => a.localeCompare(b)),
    [players]
  );

  const filtered = useMemo(() => {
    const rows = players.filter((player) => {
      const playingTime =
        group === "hitting"
          ? numeric(player.stats.plateAppearances)
          : inningsToOuts(player.stats.inningsPitched) / 3;

      return (
        playingTime >= minimum &&
        (team === "all" || player.team === team) &&
        player.name.toLowerCase().includes(search.toLowerCase())
      );
    });

    return rows.sort((a, b) => {
      const aValue =
        sortKey === "inningsPitched"
          ? inningsToOuts(a.stats[sortKey])
          : numeric(a.stats[sortKey]);

      const bValue =
        sortKey === "inningsPitched"
          ? inningsToOuts(b.stats[sortKey])
          : numeric(b.stats[sortKey]);

      return descending ? bValue - aValue : aValue - bValue;
    });
  }, [players, group, minimum, team, search, sortKey, descending]);

  function changeGroup(next: "hitting" | "pitching") {
    setGroup(next);
    setMinimum(next === "hitting" ? 200 : 40);
    setSortKey(next === "hitting" ? "ops" : "era");
    setDescending(next === "hitting");
    setTeam("all");
  }

  function changeSort(column: Column) {
    if (sortKey === column.key) {
      setDescending(!descending);
    } else {
      setSortKey(column.key);
      setDescending(!column.lowerBetter);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-5 md:p-6">
      <h2 className="text-2xl font-bold">Minor-League Leaderboards</h2>
      <p className="mt-2 text-sm text-slate-400">
        Compare season statistics across minor-league affiliates.
        Rankings are statistical, not official prospect rankings.
      </p>

      <div className="mt-6 flex gap-2">
        {(["hitting", "pitching"] as const).map((value) => (
          <button
            key={value}
            onClick={() => changeGroup(value)}
            className={`rounded-lg px-5 py-2 font-semibold ${
              group === value
                ? "bg-blue-500 text-white"
                : "bg-[#12243a] text-slate-300"
            }`}
          >
            {value === "hitting" ? "Hitting" : "Pitching"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-slate-300">
          Season
          <select
            value={season}
            onChange={(event) => setSeason(Number(event.target.value))}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#081321] p-3"
          >
            {[2026, 2025, 2024, 2023].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Level
          <select
            value={level}
            onChange={(event) => {
              setLevel(Number(event.target.value));
              setTeam("all");
            }}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#081321] p-3"
          >
            {LEVELS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Minimum {group === "hitting" ? "PA" : "IP"}
          <input
            type="number"
            min={0}
            value={minimum}
            onChange={(event) =>
              setMinimum(Math.max(0, Number(event.target.value) || 0))
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#081321] p-3"
          />
        </label>

        <label className="text-sm text-slate-300">
          Affiliate
          <select
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#081321] p-3"
          >
            <option value="all">All Affiliates</option>
            {teams.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search players..."
        className="mt-5 w-full rounded-lg border border-slate-700 bg-[#081321] p-3 text-white"
      />

      {loading ? (
        <p className="mt-6 text-slate-400">Loading statistics...</p>
      ) : error ? (
        <p className="mt-6 text-red-400">{error}</p>
      ) : (
        <>
          <p className="mt-5 text-sm text-slate-400">
            Showing {filtered.length} of {players.length} player records.
            Click a statistic to sort.
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#12243a] text-slate-300">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Player</th>
                  <th className="p-3">Team</th>
                  {columns.map((column) => (
                    <th key={column.key} className="p-3">
                      <button
                        onClick={() => changeSort(column)}
                        className="hover:text-blue-400"
                      >
                        {column.label}
                        {sortKey === column.key
                          ? descending ? " ↓" : " ↑"
                          : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((player, index) => (
                  <tr
                    key={player.id}
                    className="border-t border-slate-700 hover:bg-[#12243a]"
                  >
                    <td className="p-3 text-slate-400">{index + 1}</td>
                    <td className="p-3">
                      <Link
                        href={`/prospects/player/${player.id}`}
                        className="font-semibold text-blue-400 hover:underline"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-300">{player.team}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="p-3 tabular-nums">
                        {player.stats[column.key] == null
                          ? "—"
                          : String(player.stats[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="mt-5 text-slate-400">
              No players match these filters.
            </p>
          )}
        </>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Source: MLB Stats API. Includes minor-league assignments and
        potentially MLB rehabilitation appearances. Playing-time
        thresholds are configurable.
      </p>
    </section>
  );
}
