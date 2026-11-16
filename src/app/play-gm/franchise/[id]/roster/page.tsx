"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { refreshFranchiseSalaries } from "@/lib/play-gm/refreshFranchiseSalaries";
import { loadMinorLeagueMigrationPreview } from "@/lib/play-gm/loadMinorLeagueMigrationPreview";
import { applyMinorLeagueMigration } from "@/lib/play-gm/applyMinorLeagueMigration";
import type { FranchiseMinorLeagueMigrationPreview } from "@/lib/play-gm/loadMinorLeagueMigrationPreview";
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [migrationPreview, setMigrationPreview] =
    useState<FranchiseMinorLeagueMigrationPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [applyingMigration, setApplyingMigration] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState("");
  const [rosterView, setRosterView] = useState<
    "40-man" | "minor-league" | "all"
  >("40-man");

  async function handleMigrationPreview() {
    if (previewLoading || applyingMigration || refreshing) return;

    setPreviewLoading(true);
    setPreviewError("");
    setMigrationMessage("");
    setMigrationPreview(null);

    try {
      const preview = await loadMinorLeagueMigrationPreview(params.id);
      setMigrationPreview(preview);
    } catch (err: unknown) {
      setPreviewError(
        err instanceof Error
          ? err.message
          : "Unable to preview minor-league players."
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleApplyMigration() {
    if (!migrationPreview || applyingMigration || previewLoading || refreshing) {
      return;
    }

    const total = migrationPreview.eligiblePlayers.length;
    const teamCount = migrationPreview.eligiblePlayers.filter(
      (player) => player.organizationId === franchise?.teamId
    ).length;

    if (
      !window.confirm(
        `Add ${total} minor-league players across MLB, including ` +
        `${teamCount} to your organization? This updates your saved franchise.`
      )
    ) {
      return;
    }

    setApplyingMigration(true);
    setMigrationMessage("");
    setPreviewError("");

    try {
      const updated = await applyMinorLeagueMigration(
        params.id,
        migrationPreview.eligiblePlayers,
        migrationPreview.franchiseRevision
      );

      setFranchise(updated);
      setMigrationPreview(null);
      setMigrationMessage(
        `Migration successful. ${total} minor-league players added.`
      );
    } catch (err: unknown) {
      setMigrationPreview(null);
      setPreviewError(
        err instanceof Error
          ? err.message
          : "Unable to apply minor-league migration."
      );
    } finally {
      setApplyingMigration(false);
    }
  }

  async function handleSalaryRefresh() {
    if (refreshing || applyingMigration || previewLoading) return;

    setMigrationPreview(null);
    setMigrationMessage("");

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

  const minorLeagueCount = players.filter(
    (player) => !player.onFortyMan
  ).length;

  const displayedPlayers = players.filter((player) => {
    if (rosterView === "40-man") return player.onFortyMan;
    if (rosterView === "minor-league") return !player.onFortyMan;
    return true;
  });

  // Match the simplified MLB payroll calculation:
  // only players on the 40-man roster are included.
  const salaryTotal = players
    .filter((player) => player.onFortyMan)
    .reduce(
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

            <div className="mt-8 rounded-xl border border-white/10 bg-[#102035] p-5">
              <h2 className="text-lg font-bold">
                Minor League Roster Update
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Preview missing minor-league players from the November 14,
                2026 roster snapshot. This does not modify your franchise.
              </p>

              <button
                type="button"
                onClick={handleMigrationPreview}
                disabled={previewLoading || applyingMigration || refreshing}
                className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {previewLoading
                  ? "Loading Minor League Players..."
                  : "Preview Minor League Players"}
              </button>

              {migrationMessage && (
                <p role="status" className="mt-4 text-sm text-green-400">
                  {migrationMessage}
                </p>
              )}

              {previewError && (
                <p role="alert" className="mt-4 text-sm text-red-400">
                  {previewError}
                </p>
              )}

              {migrationPreview && (
                <div role="status" className="mt-4 space-y-2 text-sm text-slate-300">
                  <p>
                    Potential players to add across MLB:
                    {" "}
                    <strong>{migrationPreview.eligiblePlayers.length}</strong>
                  </p>
                  <p>
                    Potential Yankees additions:
                    {" "}
                    <strong>
                      {migrationPreview.eligiblePlayers.filter(
                        (player) => player.organizationId === franchise.teamId
                      ).length}
                    </strong>
                  </p>
                  <p>
                    Existing players skipped:
                    {" "}
                    {migrationPreview.existingPlayersSkipped}
                  </p>
                  <p>
                    Transaction players skipped:
                    {" "}
                    {migrationPreview.transactionPlayersSkipped}
                  </p>
                  <p>
                    Unknown organizations skipped:
                    {" "}
                    {migrationPreview.missingOrganizationsSkipped}
                  </p>
                  <p className="text-amber-300">
                    Historical roster assignments remain unverified.
                    Applying will modify this franchise save.
                  </p>

                  <button
                    type="button"
                    onClick={handleApplyMigration}
                    disabled={
                      applyingMigration ||
                      previewLoading ||
                      refreshing ||
                      migrationPreview.eligiblePlayers.length === 0
                    }
                    className="mt-4 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {applyingMigration
                      ? "Applying Minor League Players..."
                      : "Apply Minor League Players"}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { id: "40-man", label: `40-Man Roster (${fortyManCount})` },
                { id: "minor-league", label: `Minor League System (${minorLeagueCount})` },
                { id: "all", label: `Entire Organization (${players.length})` },
              ].map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() =>
                    setRosterView(view.id as "40-man" | "minor-league" | "all")
                  }
                  aria-pressed={rosterView === view.id}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    rosterView === view.id
                      ? "bg-blue-600 text-white"
                      : "border border-white/10 bg-[#102035] text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#102035]">
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
                  {displayedPlayers.map((player) => (
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

              {displayedPlayers.length === 0 && (
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
