"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import {
  getFranchise,
  type FranchiseSave,
} from "@/lib/play-gm/franchiseStorage";

export default function FreeAgencyMarketPage() {
  const params = useParams<{ id: string }>();
  const [franchise, setFranchise] = useState<FranchiseSave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setFranchise(null);

    getFranchise(params.id)
      .then((save) => {
        if (!active) return;
        if (!save) {
          setError("Franchise save not found.");
        } else if (!save.universe) {
          setError("This franchise has no initialized MLB universe.");
        } else {
          setFranchise(save);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load free agency."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const players = useMemo(() => {
    const universe = franchise?.universe;
    if (!universe) return [];

    const playerMap = new Map(
      universe.players.map((player) => [player.id, player])
    );

    return (universe.freeAgentCandidates ?? [])
      .map((candidate) => ({
        candidate,
        player: playerMap.get(candidate.playerId),
      }))
      .filter(({ candidate, player }) => {
        const query = search.toLowerCase().trim();
        const matchesSearch =
          candidate.name.toLowerCase().includes(query) ||
          (candidate.formerTeam ?? "").toLowerCase().includes(query);

        const matchesStatus =
          status === "all" || candidate.availability === status;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) =>
        a.candidate.name.localeCompare(b.candidate.name)
      );
  }, [franchise, search, status]);

  return (
    <main className="min-h-screen bg-[#081321] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/play-gm/franchise/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          Franchise Dashboard
        </Link>

        <h1 className="mt-8 text-3xl font-black sm:text-4xl">
          Free Agency Market
        </h1>

        <p className="mt-3 text-slate-400">
          Explore free-agent candidates in your franchise universe.
        </p>

        {loading && (
          <p className="mt-8 text-slate-400">Loading free agents...</p>
        )}

        {!loading && error && (
          <p role="alert" className="mt-8 text-red-400">
            {error}
          </p>
        )}

        {!loading && franchise?.universe && (
          <>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search players or former teams..."
                  className="w-full rounded-xl border border-white/10 bg-[#102035] py-3 pl-11 pr-4 outline-none focus:border-blue-400"
                />
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#102035] px-4 py-3"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="unresolved">Unresolved</option>
                <option value="reported-signed">Reported Signed</option>
                <option value="under-contract">Under Contract</option>
              </select>
            </div>

            <p className="mt-5 text-sm text-slate-400">
              Showing {players.length} of{" "}
              {franchise.universe.freeAgentCandidates?.length ?? 0} candidates
            </p>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#102035]">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-5 py-4">Player</th>
                    <th className="px-5 py-4">Position</th>
                    <th className="px-5 py-4">Age</th>
                    <th className="px-5 py-4">Former Team</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(({ candidate, player }) => (
                    <tr
                      key={candidate.playerId}
                      className="border-b border-white/5"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {candidate.name}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {player?.position ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {player?.age ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {candidate.formerTeam ?? "—"}
                      </td>
                      <td className="px-5 py-4 capitalize text-slate-300">
                        {candidate.availability.replaceAll("-", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {players.length === 0 && (
                <p className="p-8 text-center text-slate-400">
                  No free-agent candidates match your filters.
                </p>
              )}
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Availability statuses reflect the saved simulation data.
              Unresolved players are not currently eligible for contract offers.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
