"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import pitchingData from "../../../public/data/mlb-pitching-projections-2027-experimental.json";
import teamData from "../../../public/data/mlb-projection-team-assignments-2027.json";
import { freeAgents } from "../../lib/freeAgency";

type Pitcher = (typeof pitchingData.players)[number];
type PitcherKey = Extract<keyof Pitcher, string>;

const columns: { key: PitcherKey; label: string }[] = [
  { key: "player_name", label: "Player" },
  { key: "projected_ip", label: "Expected IP" },
  { key: "conditional_ip", label: "Conditional IP" },
  { key: "projected_era", label: "ERA" },
  { key: "projected_whip", label: "WHIP" },
  { key: "projected_so", label: "SO" },
  { key: "projected_bb", label: "BB" },
  { key: "projected_hr", label: "HR" },
  { key: "projected_k9", label: "K/9" },
  { key: "projected_bb9", label: "BB/9" },
  { key: "projected_hr9", label: "HR/9" },
  { key: "return_probability", label: "Return %" },
];

function formatValue(key: PitcherKey, value: Pitcher[PitcherKey]) {
  if (value === null || value === undefined) return "—";

  if (key === "return_probability") {
    return `${(Number(value) * 100).toFixed(1)}%`;
  }

  if (key === "player_name") return String(value);

  if (
    ["projected_so", "projected_bb", "projected_hr"].includes(key)
  ) {
    return Number(value).toFixed(0);
  }

  if (typeof value === "number") {
    return value.toFixed(2);
  }

  return String(value);
}

export default function PitchingProjectionsTable() {
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [sortKey, setSortKey] = useState<PitcherKey>("projected_so");
  const [descending, setDescending] = useState(true);

  const availableFreeAgentIds = useMemo(
    () =>
      new Set(
        freeAgents
          .filter((player) => player.status === "Available")
          .map((player) => player.id)
      ),
    []
  );

  const players = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pitchingData.players
      .filter((player) => {
        if (!player.player_name.toLowerCase().includes(query)) {
          return false;
        }

        if (selectedTeam === "all") return true;

        const isFreeAgent = availableFreeAgentIds.has(player.player_id);

        if (selectedTeam === "free-agents") {
          return isFreeAgent;
        }

        if (isFreeAgent) return false;

        const assignment =
          teamData.players[
            String(player.player_id) as keyof typeof teamData.players
          ];

        if (selectedTeam === "other") {
          return assignment?.organizationId == null;
        }

        return assignment?.organizationId === Number(selectedTeam);
      })
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
  }, [search, selectedTeam, sortKey, descending, availableFreeAgentIds]);

  function changeSort(key: PitcherKey) {
    if (sortKey === key) {
      setDescending((current) => !current);
    } else {
      setSortKey(key);
      setDescending(
        !["player_name", "projected_era", "projected_whip",
          "projected_bb9", "projected_hr9"].includes(key)
      );
    }
  }

  return (
    <section className="mt-8">
      <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-5">
        <h2 className="text-lg font-bold text-white">
          Understanding Pitching Projections
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Expected IP accounts for the estimated probability of pitching
          in MLB during 2027. Conditional IP estimates innings if the
          pitcher returns. Projected strikeouts, walks, home runs, and
          earned runs use expected IP. These experimental estimates
          are not official MLB forecasts.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_280px]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search pitchers..."
          aria-label="Search projected pitchers"
          className="rounded-lg border border-white/10 bg-[#0d1d30] px-4 py-3 text-sm text-white"
        />

        <select
          value={selectedTeam}
          onChange={(event) => setSelectedTeam(event.target.value)}
          aria-label="Filter pitchers by MLB organization"
          className="rounded-lg border border-white/10 bg-[#0d1d30] px-4 py-3 text-sm text-white"
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

      <p className="mt-3 text-xs text-slate-500">
        Team filters reflect last recorded affiliations, not confirmed
        2027 rosters. Free-agent classifications use DiamondIQ's
        existing offseason status data.
      </p>

      <p className="mt-5 text-sm text-slate-400">
        Showing {players.length.toLocaleString()} of{" "}
        {pitchingData.players.length.toLocaleString()} pitchers
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1d30]">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-4 py-3">
                  <button
                    type="button"
                    onClick={() => changeSort(column.key)}
                    className="font-semibold text-slate-300 hover:text-white"
                  >
                    {column.label}
                    {sortKey === column.key
                      ? descending
                        ? " ↓"
                        : " ↑"
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
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 text-slate-300"
                  >
                    {column.key === "player_name" ? (
                      <Link
                        href={`/players/${player.player_id}`}
                        className="font-medium text-blue-400 hover:text-blue-300"
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
          <p className="p-6 text-sm text-slate-400">
            No matching pitchers found.
          </p>
        )}
      </div>
    </section>
  );
}
