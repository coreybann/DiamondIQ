"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { refreshFranchiseSalaries } from "@/lib/play-gm/refreshFranchiseSalaries";
import {
  getFranchise,
  type FranchiseSave,
} from "@/lib/play-gm/franchiseStorage";

export default function FranchiseRosterPage() {
  const params = useParams<{ id: string }>();
  const [franchise, setFranchise] = useState<FranchiseSave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");

  async function handleSalaryRefresh() {
    if (refreshing) return;

    setRefreshing(true);
    setRefreshMessage("");

    try {
      const updated = await refreshFranchiseSalaries(params.id);
      setFranchise(updated);
      setRefreshMessage("Salary information refreshed successfully.");
    } catch (err: unknown) {
      setRefreshMessage(
        err instanceof Error ? err.message : "Unable to refresh salaries."
      );
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    getFranchise(params.id)
      .then((save) => {
        if (!active) return;
        if (!save) {
          setError("Franchise not found.");
        } else {
          setFranchise(save);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load roster."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const team = franchise?.universe?.teams.find(
    (entry) => entry.id === franchise.teamId
  );

  const players = useMemo(() => {
    if (!franchise?.universe || !team) return [];

    const playerIds = new Set(team.playerIds);

    return franchise.universe.players
      .filter((player) => playerIds.has(player.id))
      .sort((a, b) =>
        a.position.localeCompare(b.position) ||
        a.name.localeCompare(b.name)
      );
  }, [franchise, team]);

  const fortyManCount = players.filter(
    (player) => player.onFortyMan
  ).length;

  const salaryTotal = players.reduce(
    (total, player) => total + (player.salaryMillions ?? 0),
    0
  );

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

        {loading && (
          <p className="mt-10 text-slate-400">Loading roster...</p>
        )}

        {!loading && error && (
          <p role="alert" className="mt-10 text-red-400">{error}</p>
        )}

        {!loading && franchise && !franchise.universe && (
          <p className="mt-10 text-amber-300">
            This franchise does not have saved roster data.
          </p>
        )}

        {!loading && franchise?.universe && !team && (
          <p className="mt-10 text-red-400">
            Your team could not be found in this franchise.
          </p>
        )}

        {!loading && franchise && team && (
          <>
            <p className="mt-10 text-sm font-bold uppercase tracking-widest text-blue-400">
              Play GM / Roster Management
            </p>

            <h1 className="mt-3 text-3xl font-black">
              {franchise.teamName} Roster
            </h1>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                ["Players", players.length],
                ["40-Man Roster", `${fortyManCount}/40`],
                ["Listed Player Salaries", `$${salaryTotal.toFixed(1)}M`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-[#102035] p-5"
                >
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleSalaryRefresh}
                disabled={refreshing}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? "Refreshing Salaries..." : "Refresh Missing Salaries"}
              </button>

              {refreshMessage && (
                <p role="status" className="text-sm text-slate-300">
                  {refreshMessage}
                </p>
              )}
            </div>

            <div className="mt-8 overflow-x-auto rounded-xl border border-white/10 bg-[#102035]">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/5 text-slate-300">
                  <tr>
                    {["Player", "POS", "Age", "Roster Status", "Salary", "Contract"].map(
                      (heading) => (
                        <th key={heading} className="px-4 py-4 font-semibold">
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-semibold">{player.name}</td>
                      <td className="px-4 py-3">{player.position}</td>
                      <td className="px-4 py-3">{player.age ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">
                        {player.rosterStatus.replaceAll("-", " ")}
                      </td>
                      <td className="px-4 py-3">
                        {player.salaryMillions === null
                          ? "Unknown"
                          : `$${player.salaryMillions.toFixed(2)}M`}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {player.contractStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {players.length === 0 && (
                <p className="p-6 text-slate-400">
                  No players found on this roster.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
