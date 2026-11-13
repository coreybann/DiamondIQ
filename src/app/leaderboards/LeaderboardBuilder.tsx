"use client";

import { useEffect, useState } from "react";
import LeaderboardTable from "./LeaderboardTable";

type StatGroup = "hitting" | "pitching";

type Player = {
  id: number;
  name: string;
  teamId: number | null;
  teamName: string;
  stats: Record<string, string | number>;
};

type LeaderboardResponse = {
  season: number;
  group: StatGroup;
  count: number;
  players: Player[];
};

export default function LeaderboardBuilder() {
  const [season, setSeason] = useState(2026);
  const [group, setGroup] = useState<StatGroup>("hitting");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statFilters, setStatFilters] = useState<
    {
      id: number;
      stat: string;
      operator: ">" | ">=" | "<" | "<=" | "=" | "!=";
      value: string;
    }[]
  >([]);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");
  const [teamId, setTeamId] = useState("all");
  const [minimumPlayingTime, setMinimumPlayingTime] = useState(0);
  const [sortKey, setSortKey] = useState("gamesPlayed");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "desc" ? "asc" : "desc"
      );
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  const columnOptions = {
    hitting: [
      { key: "gamesPlayed", label: "Games (G)", category: "Playing Time" },
      { key: "plateAppearances", label: "Plate Appearances (PA)", category: "Playing Time" },
      { key: "atBats", label: "At Bats (AB)", category: "Playing Time" },
      { key: "hits", label: "Hits (H)", category: "Traditional" },
      { key: "homeRuns", label: "Home Runs (HR)", category: "Traditional" },
      { key: "rbi", label: "Runs Batted In (RBI)", category: "Traditional" },
      { key: "avg", label: "Batting Average (AVG)", category: "Traditional" },
      { key: "obp", label: "On-Base Percentage (OBP)", category: "Traditional" },
      { key: "slg", label: "Slugging (SLG)", category: "Traditional" },
      { key: "ops", label: "OPS", category: "Traditional" },
      { key: "iso", label: "Isolated Power (ISO)", category: "Advanced" },
      { key: "babip", label: "BABIP", category: "Advanced" },
      { key: "strikeoutRate", label: "Strikeout Rate (K%)", category: "Advanced" },
      { key: "walkRate", label: "Walk Rate (BB%)", category: "Advanced" },
    ],
    pitching: [
      { key: "gamesPlayed", label: "Games (G)", category: "Playing Time" },
      { key: "gamesStarted", label: "Games Started (GS)", category: "Playing Time" },
      { key: "inningsPitched", label: "Innings Pitched (IP)", category: "Playing Time" },
      { key: "wins", label: "Wins (W)", category: "Traditional" },
      { key: "losses", label: "Losses (L)", category: "Traditional" },
      { key: "era", label: "Earned Run Average (ERA)", category: "Traditional" },
      { key: "whip", label: "WHIP", category: "Traditional" },
      { key: "strikeOuts", label: "Strikeouts (SO)", category: "Traditional" },
      { key: "baseOnBalls", label: "Walks (BB)", category: "Traditional" },
      { key: "homeRuns", label: "Home Runs Allowed (HR)", category: "Traditional" },
      { key: "strikeoutsPer9Inn", label: "Strikeouts per 9 (K/9)", category: "Advanced" },
      { key: "walksPer9Inn", label: "Walks per 9 (BB/9)", category: "Advanced" },
      { key: "homeRunsPer9", label: "Home Runs per 9 (HR/9)", category: "Advanced" },
      { key: "hitsPer9Inn", label: "Hits per 9 (H/9)", category: "Advanced" },
      { key: "strikeoutRate", label: "Strikeout Rate (K%)", category: "Advanced" },
      { key: "walkRate", label: "Walk Rate (BB%)", category: "Advanced" },
      { key: "stuffPlus", label: "DiamondIQ Stuff+", category: "Advanced" },
    ],
  };

  const defaultColumns = {
    hitting: [
      "gamesPlayed", "plateAppearances", "atBats", "homeRuns",
      "rbi", "avg", "obp", "slg", "ops",
    ],
    pitching: [
      "gamesPlayed", "gamesStarted", "inningsPitched", "wins",
      "losses", "era", "whip", "strikeOuts", "baseOnBalls", "homeRuns",
    ],
  };

  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    defaultColumns.hitting
  );

  function toggleColumn(key: string) {
    setSelectedColumns((current) =>
      current.includes(key)
        ? current.filter((column) => column !== key)
        : [...current, key]
    );
  }

  function resetColumns() {
    setSelectedColumns(defaultColumns[group]);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlayers() {
      setLoading(true);
      setError("");
      setPlayers([]);

      try {
        const params = new URLSearchParams({
          season: String(season),
          group,
        });

        const response = await fetch(
          `/api/leaderboards?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load leaderboard statistics.");
        }

        const data: LeaderboardResponse = await response.json();

        if (!controller.signal.aborted) {
          setPlayers(data.players);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPlayers();

    return () => controller.abort();
  }, [season, group]);

  const teams = Array.from(
    new Map(
      players
        .filter((player) => player.teamId !== null)
        .map((player) => [
          player.teamId,
          { id: player.teamId, name: player.teamName },
        ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  function matchesStatFilter(
    player: Player,
    filter: (typeof statFilters)[number]
  ): boolean {
    const rawValue = player.stats[filter.stat];

    if (
      rawValue === undefined ||
      rawValue === null ||
      rawValue === "" ||
      filter.value.trim() === ""
    ) {
      return false;
    }

    const actual = Number(rawValue);
    const target = Number(filter.value);

    if (!Number.isFinite(actual) || !Number.isFinite(target)) {
      return false;
    }

    switch (filter.operator) {
      case ">":
        return actual > target;
      case ">=":
        return actual >= target;
      case "<":
        return actual < target;
      case "<=":
        return actual <= target;
      case "=":
        return actual === target;
      case "!=":
        return actual !== target;
      default:
        return false;
    }
  }

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesTeam =
      teamId === "all" || String(player.teamId) === teamId;

    const rawPlayingTime =
      group === "hitting"
        ? player.stats.plateAppearances
        : player.stats.inningsPitched;

    let playingTime = Number(rawPlayingTime ?? 0);

    if (group === "pitching" && rawPlayingTime !== undefined) {
      const [whole, fraction = "0"] = String(rawPlayingTime).split(".");
      const outs = Number(fraction);
      playingTime = Number(whole) + outs / 3;
    }

    const activeStatFilters = statFilters.filter(
      (filter) =>
        filter.value.trim() !== "" &&
        Number.isFinite(Number(filter.value))
    );

    const matchesStatFilters =
      activeStatFilters.length === 0 ||
      (filterLogic === "AND"
        ? activeStatFilters.every((filter) => matchesStatFilter(player, filter))
        : activeStatFilters.some((filter) => matchesStatFilter(player, filter)));

    return (
      matchesSearch &&
      matchesTeam &&
      playingTime >= minimumPlayingTime &&
      matchesStatFilters
    );
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const getValue = (player: Player): string | number | null => {
      if (sortKey === "name") return player.name;
      if (sortKey === "teamName") return player.teamName;

      const value = player.stats[sortKey];

      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "-.--" ||
        value === ".---"
      ) {
        return null;
      }

      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const aValue = getValue(a);
    const bValue = getValue(b);

    if (aValue === null) return bValue === null ? 0 : 1;
    if (bValue === null) return -1;

    const comparison =
      typeof aValue === "string" && typeof bValue === "string"
        ? aValue.localeCompare(bValue)
        : Number(aValue) - Number(bValue);

    return sortDirection === "asc" ? comparison : -comparison;
  });

  function exportCSV() {
    const columns = columnOptions[group].filter((column) =>
      selectedColumns.includes(column.key)
    );

    const escapeCSV = (value: unknown): string => {
      let text = value == null ? "" : String(value);

      // Prevent spreadsheet applications from interpreting
      // untrusted text as formulas.
      if (/^[\\s]*[=+@\\-]/.test(text) && !/^-?\\d+(\\.\\d+)?$/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replace(/"/g, '""') + '"';
    };

    const headers = [
      "Player ID",
      "Player",
      "Team",
      ...columns.map((column) => column.label),
    ];

    const rows = sortedPlayers.map((player) => [
      player.id,
      player.name,
      player.teamName,
      ...columns.map((column) => player.stats[column.key] ?? ""),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `DiamondIQ_${season}_${group}_leaderboard.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const seasons = Array.from(
    { length: new Date().getFullYear() - 2015 + 1 },
    (_, index) => new Date().getFullYear() - index
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1d30] p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Custom Leaderboard Builder
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Explore actual MLB regular-season statistics.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Select season"
            value={season}
            onChange={(event) =>
              setSeason(Number(event.target.value))
            }
            className="rounded-lg border border-white/15 bg-[#142940] px-4 py-2 text-sm text-white"
          >
            {seasons.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-white/15 bg-[#142940] p-1">
            {(["hitting", "pitching"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (group === option) return;
                  setStatFilters([]);
                  setFilterLogic("AND");
                  setGroup(option);
                }}
                className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                  group === option
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {option === "hitting" ? "Hitting" : "Pitching"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl border border-white/10 bg-[#142940] p-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Search Players
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search player name..."
            className="rounded-lg border border-white/15 bg-[#0d1d30] px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Team
          <select
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            className="rounded-lg border border-white/15 bg-[#0d1d30] px-3 py-2 text-white"
          >
            <option value="all">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={String(team.id)}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Minimum {group === "hitting" ? "PA" : "IP"}
          <input
            type="number"
            min="0"
            step="1"
            value={minimumPlayingTime}
            onChange={(event) =>
              setMinimumPlayingTime(
                Math.max(0, Number(event.target.value) || 0)
              )
            }
            className="rounded-lg border border-white/15 bg-[#0d1d30] px-3 py-2 text-white"
          />
        </label>
      </div>

      <section className="mb-6 rounded-xl border border-white/10 bg-[#142940] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">
              Advanced Statistical Filters
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Find players who meet your custom statistical criteria.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setStatFilters((current) => [
                ...current,
                {
                  id: Math.max(0, ...current.map((filter) => filter.id)) + 1,
                  stat: columnOptions[group][0].key,
                  operator: ">",
                  value: "",
                },
              ])
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            + Add Filter
          </button>
        </div>

        {statFilters.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            No statistical filters applied. All eligible players are shown.
          </p>
        )}

        {statFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                Match conditions:
              </span>
              <select
                aria-label="Filter matching logic"
                value={filterLogic}
                onChange={(event) =>
                  setFilterLogic(event.target.value as "AND" | "OR")
                }
                className="rounded-lg border border-white/15 bg-[#0d1d30] px-3 py-2 text-sm text-white"
              >
                <option value="AND">Match ALL (AND)</option>
                <option value="OR">Match ANY (OR)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setStatFilters([]);
                setFilterLogic("AND");
              }}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {statFilters.length > 0 && (
          <div className="mt-4 space-y-3">
            {statFilters.map((filter) => (
              <div
                key={filter.id}
                className="grid gap-3 rounded-lg border border-white/10 bg-[#0d1d30] p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Statistic
                  <select
                    value={filter.stat}
                    onChange={(event) =>
                      setStatFilters((current) =>
                        current.map((item) =>
                          item.id === filter.id
                            ? { ...item, stat: event.target.value }
                            : item
                        )
                      )
                    }
                    className="rounded-lg border border-white/15 bg-[#142940] px-3 py-2 text-sm text-white"
                  >
                    {columnOptions[group].map((column) => (
                      <option key={column.key} value={column.key}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Comparison
                  <select
                    value={filter.operator}
                    onChange={(event) =>
                      setStatFilters((current) =>
                        current.map((item) =>
                          item.id === filter.id
                            ? {
                                ...item,
                                operator: event.target.value as typeof item.operator,
                              }
                            : item
                        )
                      )
                    }
                    className="rounded-lg border border-white/15 bg-[#142940] px-3 py-2 text-sm text-white"
                  >
                    <option value=">">Greater than</option>
                    <option value=">=">At least</option>
                    <option value="<">Less than</option>
                    <option value="<=">At most</option>
                    <option value="=">Equal to</option>
                    <option value="!=">Not equal to</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Value
                  <input
                    type="number"
                    step="any"
                    value={filter.value}
                    onChange={(event) =>
                      setStatFilters((current) =>
                        current.map((item) =>
                          item.id === filter.id
                            ? { ...item, value: event.target.value }
                            : item
                        )
                      )
                    }
                    placeholder="Enter value"
                    className="rounded-lg border border-white/15 bg-[#142940] px-3 py-2 text-sm text-white"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setStatFilters((current) =>
                      current.filter((item) => item.id !== filter.id)
                    )
                  }
                  className="self-end rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-white/10 bg-[#142940] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">
              Customize Statistics
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Select the statistics you want displayed in your leaderboard.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedColumns(
                  columnOptions[group].map((column) => column.key)
                )
              }
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={resetColumns}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        {["Playing Time", "Traditional", "Advanced"].map((category) => (
          <div key={category} className="mb-4 last:mb-0">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-400">
              {category}
            </h4>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {columnOptions[group]
                .filter((column) => column.category === category)
                .map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="accent-blue-500"
                    />
                    {column.label}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </section>

      {loading ? (
        <p className="text-sm text-slate-400">
          Loading {season} MLB {group} statistics...
        </p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Showing {filteredPlayers.length.toLocaleString()} of {players.length.toLocaleString()} players
              {" "}— {season} MLB {group}
            </p>

            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredPlayers.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <LeaderboardTable
            key={group}
            players={sortedPlayers}
            group={group}
            selectedColumns={selectedColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
      )}
    </section>
  );
}
