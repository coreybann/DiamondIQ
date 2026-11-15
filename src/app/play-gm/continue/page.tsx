"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FolderOpen,
  Shield,
} from "lucide-react";
import {
  getAllFranchises,
  type FranchiseSave,
} from "@/lib/play-gm/franchiseStorage";

export default function ContinueFranchisePage() {
  const [franchises, setFranchises] = useState<FranchiseSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getAllFranchises()
      .then((saves) => {
        if (active) setFranchises(saves);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load saved franchises."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#081321] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/play-gm"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          Back to Play GM
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-400">
            Play GM / Continue Franchise
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Your Franchises
          </h1>

          <p className="mt-4 text-slate-400">
            Manage your saved MLB franchises and continue building
            your organizations.
          </p>
        </div>

        {loading && (
          <p className="mt-10 text-slate-400">
            Loading saved franchises...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-10 rounded-xl border border-red-500/30 bg-red-950/30 p-5 text-red-300"
          >
            {error}
          </p>
        )}

        {!loading && !error && franchises.length === 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-[#102035] p-10 text-center">
            <FolderOpen
              size={40}
              className="mx-auto text-blue-400"
            />

            <h2 className="mt-5 text-xl font-bold">
              No Saved Franchises
            </h2>

            <p className="mt-3 text-slate-400">
              Create your first franchise to begin your GM career.
            </p>

            <Link
              href="/play-gm/new"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-500"
            >
              Create New Franchise
            </Link>
          </div>
        )}

        {!loading && !error && franchises.length > 0 && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {franchises.map((franchise) => (
              <article
                key={franchise.id}
                className="rounded-2xl border border-white/10 bg-[#102035] p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white p-3">
                    <img
                      src={`https://www.mlbstatic.com/team-logos/${franchise.teamId}.svg`}
                      alt={`${franchise.teamName} logo`}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      {franchise.teamName}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      {franchise.name}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-blue-400" />
                    {franchise.currentSeason} Season
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-blue-400" />
                    Game Date: {franchise.currentDate}
                  </div>

                  <p className="capitalize text-slate-400">
                    Phase: {franchise.phase.replaceAll("-", " ")}
                  </p>

                  <p className="text-xs text-slate-500">
                    Last saved:{" "}
                    {new Date(franchise.updatedAt).toLocaleString()}
                  </p>
                </div>

                <Link
                  href={`/play-gm/franchise/${franchise.id}`}
                  className="mt-6 block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-blue-500"
                >
                  Open Franchise →
                </Link>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && franchises.length > 0 && (
          <Link
            href="/play-gm/new"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold transition-colors hover:bg-blue-500"
          >
            + Create Another Franchise
          </Link>
        )}
      </div>
    </main>
  );
}
