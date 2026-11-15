"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Shield,
} from "lucide-react";
import {
  getFranchise,
  type FranchiseSave,
} from "@/lib/play-gm/franchiseStorage";

export default function FranchiseDashboardPage() {
  const params = useParams<{ id: string }>();
  const [franchise, setFranchise] = useState<FranchiseSave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setFranchise(null);

    getFranchise(params.id)
      .then((save) => {
        if (!active) return;

        if (save) {
          setFranchise(save);
        } else {
          setError("Franchise save not found.");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load franchise."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <main className="min-h-screen bg-[#081321] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/play-gm/continue"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          Your Franchises
        </Link>

        {loading && (
          <p className="mt-10 text-slate-400">
            Loading franchise dashboard...
          </p>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mt-10 rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-red-300"
          >
            {error}
          </div>
        )}

        {!loading && franchise && (
          <>
            <p className="mt-10 text-sm font-bold uppercase tracking-widest text-blue-400">
              Play GM / Franchise Dashboard
            </p>

            <div className="mt-5 flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#102035] p-7 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-white p-4">
                <img
                  src={`https://www.mlbstatic.com/team-logos/${franchise.teamId}.svg`}
                  alt={`${franchise.teamName} logo`}
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-400">
                  GENERAL MANAGER
                </p>

                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  {franchise.teamName}
                </h1>

                <p className="mt-2 text-slate-400">
                  {franchise.name}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#102035] p-5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Shield size={17} className="text-blue-400" />
                  Current Season
                </div>
                <p className="mt-3 text-2xl font-bold">
                  {franchise.currentSeason}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#102035] p-5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CalendarDays size={17} className="text-blue-400" />
                  Game Date
                </div>
                <p className="mt-3 text-2xl font-bold">
                  {franchise.currentDate}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#102035] p-5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock3 size={17} className="text-blue-400" />
                  Season Phase
                </div>
                <p className="mt-3 text-2xl font-bold capitalize">
                  {franchise.phase.replaceAll("-", " ")}
                </p>
              </div>
            </div>

            <section className="mt-10 rounded-2xl border border-blue-400/20 bg-[#10253e] p-7">
              <h2 className="text-2xl font-bold">
                Front Office Headquarters
              </h2>

              <p className="mt-3 max-w-3xl text-slate-300">
                This is your franchise's management dashboard.
                Roster management, payroll, transactions,
                free agency, and season simulation will be
                added as the Play GM game systems are built.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Link
                  href={`/play-gm/franchise/${params.id}/free-agency`}
                  className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-5 transition-colors hover:border-blue-400 hover:bg-blue-500/20"
                >
                  <h3 className="text-lg font-bold text-white">
                    Free Agency Market
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Explore free agents, review player information,
                    and prepare for contract negotiations.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-blue-400">
                    View Free Agents →
                  </p>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
