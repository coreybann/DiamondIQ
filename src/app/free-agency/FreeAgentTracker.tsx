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

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
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

      return matchesSearch && matchesPosition && matchesStatus;
    });
  }, [players, search, position, status]);

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
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-slate-600 bg-[#081321] px-4 py-2 text-sm text-white"
        >
          <option value="All">All Statuses</option>
          <option value="Potential Free Agent">Potential Free Agent</option>
          <option value="Available">Available</option>
          <option value="Signing Reported">Signing Reported</option>
          <option value="Signed">Signed</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-gray-400">
        Showing {filteredPlayers.length} of {players.length} players
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 text-gray-400">
            <tr>
              {[
                "Player",
                "Position",
                "Age",
                "Previous Team",
                "Status",
                "Signed Team",
              ].map((heading) => (
                <th
                  key={heading}
                  className="whitespace-nowrap px-4 py-3 font-semibold"
                >
                  {heading}
                </th>
              ))}
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
                  {player.status}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {player.signedTeam ?? "—"}
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
