"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FreeAgent } from "@/lib/freeAgency";

type Props = {
  players: FreeAgent[];
};

export default function FreeAgentTracker({ players }: Props) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All");
  const [status, setStatus] = useState("All");
  const [team, setTeam] = useState("All");

  const teams = useMemo(() => {
    return [...new Set(
      players
        .map((player) => player.previousTeam)
        .filter((name) => name && name !== "Unknown")
    )].sort((a, b) => a.localeCompare(b));
  }, [players]);

  type SortKey =
    | "name"
    | "position"
    | "age"
    | "previousTeam"
    | "status"
    | "signedTeam"
    | "signingDate";

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const filteredPlayers = useMemo(() => {
    const filtered = players.filter((player) => {
      const matchesSearch = player.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const p = player.position.toUpperCase();

      const matchesPosition =
        position === "All" ||
        (position === "Pitchers" && ["P", "SP", "RP", "TWP"].includes(p)) ||
        (position === "Catchers" && p === "C") ||
        (position === "Infielders" &&
          ["1B", "2B", "3B", "SS", "IF"].includes(p)) ||
        (position === "Outfielders" &&
          ["LF", "CF", "RF", "OF"].includes(p)) ||
        (position === "DH" && p === "DH");

      const matchesStatus =
        status === "All" || player.status === status;

      const matchesTeam =
        team === "All" || player.previousTeam === team;

      return matchesSearch && matchesPosition && matchesStatus && matchesTeam;
    });
    return filtered.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      const aMissing = aValue === null || aValue === undefined || aValue === "";
      const bMissing = bValue === null || bValue === undefined || bValue === "";

      if (aMissing && bMissing) return a.name.localeCompare(b.name);
      if (aMissing) return 1;
      if (bMissing) return -1;

      const comparison =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return (sortDirection === "asc" ? comparison : -comparison) ||
        a.name.localeCompare(b.name);
    });
  }, [players, search, position, status, team, sortKey, sortDirection]);

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search free agents..."
          className="min-w-56 flex-1 rounded-lg border border-slate-600 bg-[#081321] px-4 py-2 text-sm text-white outline-none focus:border-blue-400"
        />

        <select
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          className="rounded-lg border border-slate-600 bg-[#081321] px-4 py-2 text-sm text-white"
        >
          {[
            "All",
            "Pitchers",
            "Catchers",
            "Infielders",
            "Outfielders",
            "DH",
          ].map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "All Positions" : option}
            </option>
          ))}
        </select>

        <select
          value={team}
          onChange={(event) => setTeam(event.target.value)}
          aria-label="Filter by last known organization"
          className="rounded-lg border border-slate-600 bg-[#081321] px-4 py-2 text-sm text-white"
        >
          <option value="All">All Teams</option>
          {teams.map((teamName) => (
            <option key={teamName} value={teamName}>
              {teamName}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-slate-600 bg-[#081321] px-4 py-2 text-sm text-white"
        >
          <option value="All">All Statuses</option>
          <option value="Potential Free Agent">Potential Free Agent</option>
          <option value="Pending Option">Pending Option</option>
          <option value="Under Contract">Under Contract</option>
          <option value="Available">Available</option>
          <option value="Signing Reported">Signing Reported</option>
          <option value="Signed">Signed</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        Showing {filteredPlayers.length} of {players.length} players
      </p>

      <div className="mb-5 rounded-lg border border-slate-700 bg-[#081321] p-4">
        <p className="mb-3 text-sm font-semibold text-white">
          Understanding Signing Statuses
        </p>
        <div className="grid gap-2 text-xs text-gray-400 sm:grid-cols-2">
          <p><span className="font-semibold text-slate-300">Potential Free Agent:</span> Expected to reach free agency; eligibility not yet confirmed.</p>
         <p>
  <span className="font-semibold text-orange-300">
    Pending Option:
  </span>{" "}

  Player has a contract option awaiting a confirmed decision.
</p>
<p>
  <span className="font-semibold text-purple-300">
    Under Contract:
  </span>{" "}
  The player remains under contract with a team.
</p>
          <p><span className="font-semibold text-green-300">Available:</span> Confirmed free agent without a reported signing.</p>
          <p><span className="font-semibold text-amber-300">Signing Reported:</span> Signing detected in MLB transaction records.</p>
          <p><span className="font-semibold text-blue-300">Signed:</span> Signing independently confirmed.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 text-gray-400">
            <tr>
              {[
                "Player",
                "Position",
                "Age",
                "Last Known Organization",
                "Status",
                "Signed Team",
                "Signing Date",
              ].map((heading, index) => {
                const keys: SortKey[] = [
                  "name",
                  "position",
                  "age",
                  "previousTeam",
                  "status",
                  "signedTeam",
                  "signingDate",
                ];
                const key = keys[index];

                return (
                  <th
                    key={heading}
                    scope="col"
                    aria-sort={
                      sortKey === key
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className="whitespace-nowrap px-4 py-3 font-semibold"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="flex items-center gap-2 text-left hover:text-blue-400"
                    >
                      {heading}
                      <span className="text-blue-400">
                        {sortKey === key
                          ? sortDirection === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredPlayers.map((player) => (
              <tr
                key={`${player.name}-${player.id}`}
                className="border-b border-slate-800"
              >
                <td className="whitespace-nowrap px-4 py-4 font-medium">
                  {player.id > 0 ? (
                    <Link
                      href={`/free-agency/player/${player.id}`}
                      className="text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      {player.name}
                    </Link>
                  ) : (
                    player.name
                  )}
                </td>

                <td className="px-4 py-4">{player.position}</td>
                <td className="px-4 py-4">{player.age ?? "N/A"}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  {player.previousTeam}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      player.status === "Signed"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                        : player.status === "Signing Reported"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                         : player.status === "Available"
  ? "border-green-500/30 bg-green-500/10 text-green-300"
: player.status === "Pending Option"
  ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
  : player.status === "Under Contract"
    ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
    : "border-slate-500/30 bg-slate-500/10 text-slate-300"
                    }`}
                  >
                    {player.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {player.signedTeam ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {player.signingDate ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPlayers.length === 0 && (
          <p className="py-10 text-center text-gray-400">
            No players match your filters.
          </p>
        )}
      </div>
    </>
  );
}
