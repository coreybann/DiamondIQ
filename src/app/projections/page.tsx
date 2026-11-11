"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import projectionData from "../../../public/data/mlb-player-projections-2027-experimental.json";
import teamData from "../../../public/data/mlb-projection-team-assignments-2027.json";
import { freeAgents } from "../../lib/freeAgency";
import PitchingProjectionsTable from "./PitchingProjectionsTable";

type Player = (typeof projectionData.players)[number];
type PlayerKey = Extract<keyof Player, string>;

type Category =
  | "established_mlb_hitter"
  | "mlb_debut_candidate"
  | "potential_mlb_returnee";

const tabs: { id: Category; label: string }[] = [
  { id: "established_mlb_hitter", label: "MLB Hitters" },
  { id: "mlb_debut_candidate", label: "Potential Debuts" },
  { id: "potential_mlb_returnee", label: "Potential Returnees" },
];

const columns: Record<Category, { key: PlayerKey; label: string }[]> = {
  established_mlb_hitter: [
    { key: "player_name", label: "Player" },
    { key: "conditional_PA_2027", label: "PA" },
    { key: "projected_AB", label: "AB" },
    { key: "projected_H", label: "H" },
    { key: "projected_2B", label: "2B" },
    { key: "projected_3B", label: "3B" },
    { key: "projected_HR", label: "HR" },
    { key: "projected_BB", label: "BB" },
    { key: "projected_SO", label: "SO" },
    { key: "AVG", label: "AVG" },
    { key: "OBP", label: "OBP" },
    { key: "SLG", label: "SLG" },
    { key: "OPS", label: "OPS" },
    { key: "expected_PA_2027", label: "Expected PA" },
    { key: "return_probability_2027", label: "Return %" },
  ],
  mlb_debut_candidate: [
    { key: "player_name", label: "Player" },
    { key: "debut_probability_2027", label: "Debut %" },
    { key: "highest_milb_level_2026", label: "MiLB Level" },
    { key: "milb_pa_2026", label: "2026 MiLB PA" },
  ],
  potential_mlb_returnee: [
    { key: "player_name", label: "Player" },
    { key: "age_2027", label: "2027 Age" },
    { key: "last_mlb_season", label: "Last MLB Season" },
    { key: "last_mlb_PA", label: "Last MLB PA" },
  ],
};

const levelNames: Record<number, string> = {
  11: "Triple-A",
  12: "Double-A",
  13: "High-A",
  14: "Single-A",
};

function formatValue(key: PlayerKey, value: Player[PlayerKey]) {
  if (value === null || value === undefined || value === "") return "—";

  if (key === "highest_milb_level_2026") {
    return levelNames[Number(value)] ?? String(value);
  }

  if (
    key === "return_probability_2027" ||
    key === "debut_probability_2027"
  ) {
    return `${(Number(value) * 100).toFixed(1)}%`;
  }

  if (["AVG", "OBP", "SLG", "OPS"].includes(key)) {
    return Number(value).toFixed(3).replace(/^0/, "");
  }

  if (key === "expected_PA_2027") {
    return Number(value).toFixed(0);
  }

  return String(value);
}

export default function ProjectionsPage() {
  const [statGroup, setStatGroup] = useState<"hitting" | "pitching">("hitting");
  const [category, setCategory] = useState<Category>("established_mlb_hitter");
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");

  const availableFreeAgents = useMemo(
    () =>
      new Set(
        freeAgents
          .filter((player) => player.status === "Available")
          .map((player) => player.name.toLocaleLowerCase())
      ),
    []
  );
  const [sortKey, setSortKey] = useState<PlayerKey>("projected_HR");
  const [descending, setDescending] = useState(true);

  const players = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projectionData.players
      .filter(
        (player) =>
          player.projection_type === category &&
          (player.player_name ?? "").toLowerCase().includes(query) &&
          (selectedTeam === "all" ||
            (selectedTeam === "free-agents"
              ? availableFreeAgents.has(player.player_name.toLocaleLowerCase())
              : !availableFreeAgents.has(player.player_name.toLocaleLowerCase()) &&
                (selectedTeam === "other"
                  ? teamData.players[
                      String(player.player_id) as keyof typeof teamData.players
                    ]?.organizationId == null
                  : teamData.players[
                      String(player.player_id) as keyof typeof teamData.players
                    ]?.organizationId === Number(selectedTeam))))
      )
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];

        if (av == null) return 1;
        if (bv == null) return -1;

        const comparison =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));

        return descending ? -comparison : comparison;
      });
  }, [category, search, selectedTeam, sortKey, descending, availableFreeAgents]);

  function changeCategory(next: Category) {
    setCategory(next);
    setSearch("");
    setSelectedTeam("all");
    setDescending(true);
    setSortKey(
      next === "established_mlb_hitter"
        ? "projected_HR"
        : next === "mlb_debut_candidate"
          ? "debut_probability_2027"
          : "last_mlb_PA"
    );
  }

  function changeSort(key: PlayerKey) {
    if (sortKey === key) {
      setDescending((current) => !current);
    } else {
      setSortKey(key);
      setDescending(key !== "player_name");
    }
  }

  return (
    <main className="min-h-screen bg-[#081321] px-5 py-10 pb-28 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ | Experimental 2027
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          2027 Player Projections
        </h1>

        <p className="mt-4 max-w-3xl text-slate-400">
          Explore experimental MLB hitting projections, potential major-league
          debuts, and players who could return after time away from MLB.
        </p>

        <div
          className="mt-8 inline-flex rounded-xl border border-white/10 bg-[#0d1d30] p-1"
          role="group"
          aria-label="Projection statistic group"
        >
          {(["hitting", "pitching"] as const).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setStatGroup(group)}
              aria-pressed={statGroup === group}
              className={`rounded-lg px-6 py-3 text-sm font-semibold transition ${
                statGroup === group
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {group === "hitting" ? "Hitting" : "Pitching"}
            </button>
          ))}
        </div>

        {statGroup === "pitching" ? (
          <PitchingProjectionsTable />
        ) : (
          <>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {tabs.map((tab) => {
            const count = projectionData.players.filter(
              (player) => player.projection_type === tab.id
            ).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeCategory(tab.id)}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  category === tab.id
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-white/10 bg-[#0d1d30] hover:border-blue-400/40"
                }`}
              >
                <span className="block text-sm text-slate-300">
                  {tab.label}
                </span>
                <span className="mt-2 block text-2xl font-bold">
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-[#0d1d30] p-5">
          <h2 className="font-semibold text-white">
            Understanding These Projections
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {category === "established_mlb_hitter"
              ? "Projected counting statistics use estimated plate appearances conditional on playing in MLB during 2027. Expected PA separately accounts for the probability of returning to MLB. All estimates are experimental and subject to playing-time uncertainty."
              : category === "mlb_debut_candidate"
                ? "Debut probability estimates the likelihood of a first MLB appearance in 2027. These players do not have projected MLB hitting statistics or plate appearances."
                : "Potential returnees previously appeared in MLB but did not appear in the 2026 eligible hitter dataset. Inclusion does not imply a confirmed contract, active status, or projected MLB return."}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_280px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search players..."
            aria-label="Search projected players"
            className="w-full rounded-lg border border-white/10 bg-[#0d1d30] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
          />
          <select
            value={selectedTeam}
            onChange={(event) => setSelectedTeam(event.target.value)}
            aria-label="Filter by MLB organization"
            className="w-full rounded-lg border border-white/10 bg-[#0d1d30] px-4 py-3 text-white outline-none focus:border-blue-400"
          >
            <option value="all">All Teams</option>
            {teamData.organizations.map((team) => (
              <option key={team.id} value={String(team.id)}>
                {team.name}
              </option>
            ))}
            <option value="free-agents">Free Agents</option>
            <option value="other">Unassigned / Other</option>
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Team filters use latest recorded affiliations, not confirmed 2027 rosters.
        </p>

        <p className="mt-4 text-sm text-slate-400">
          Showing {players.length.toLocaleString()} players
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1d30]">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-white/10 bg-[#102238] text-slate-300">
              <tr>
                {columns[category].map((column) => (
                  <th key={column.key} className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => changeSort(column.key)}
                      className="whitespace-nowrap hover:text-blue-400"
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
              {players.map((player) => (
                <tr
                  key={player.player_id}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  {columns[category].map((column) => (
                    <td
                      key={column.key}
                      className="whitespace-nowrap px-4 py-3"
                    >
                      {column.key === "player_name" ? (
                        <Link
                          href={`/players/${player.player_id}`}
                          className="font-medium text-blue-400 hover:underline"
                        >
                          {player.player_name}
                        </Link>
                      ) : (
                        formatValue(column.key, player[column.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {players.length === 0 && (
            <p className="p-8 text-center text-slate-400">
              No matching players found.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Experimental DiamondIQ research projections. Estimates are not
          official MLB forecasts and do not account for every injury,
          transaction, roster decision, or future development.
        </p>
          </>
        )}
      </div>
    </main>
  );
}
