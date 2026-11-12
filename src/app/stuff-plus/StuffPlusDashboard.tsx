"use client";

import { useEffect, useState } from "react";
import PlayerSearch from "@/app/compare/PlayerSearch";
import PitchMovementChart from "./PitchMovementChart";

type Player = {
  id: number;
  name: string;
  position: string;
  team: string;
};

type StuffPlusRating = {
  pitcher: number;
  pitches: number;
  predicted_rv: number;
  stuff_plus: number;
};

type PitchTypeRating = StuffPlusRating & {
  pitch_type: string;
  metrics_pitches: number | null;
  avg_velocity: number | null;
  avg_spin: number | null;
  avg_h_break: number | null;
  avg_v_break: number | null;
};

type StuffPlusResponse = {
  pitcher: number;
  season: number;
  overall: StuffPlusRating | null;
  pitches: PitchTypeRating[];
};

const PITCH_NAMES: Record<string, string> = {
  FF: "Four-Seam Fastball",
  SI: "Sinker",
  FC: "Cutter",
  SL: "Slider",
  ST: "Sweeper",
  SV: "Slurve",
  CU: "Curveball",
  KC: "Knuckle Curve",
  CS: "Slow Curve",
  CH: "Changeup",
  FS: "Splitter",
  FO: "Forkball",
  SC: "Screwball",
  KN: "Knuckleball",
  EP: "Eephus",
};

export default function StuffPlusDashboard() {
  const [selectedPlayer, setSelectedPlayer] =
    useState<Player | null>(null);

  const [season, setSeason] = useState(2026);
  const [ratings, setRatings] =
    useState<StuffPlusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedPlayer) {
      return;
    }

    const controller = new AbortController();

    async function loadRatings() {
      setLoading(true);
      setError("");
      setRatings(null);

      try {
        const response = await fetch(
          `/api/stuff-plus?pitcher=${selectedPlayer!.id}&season=${season}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load Stuff+ ratings");
        }

        const data: StuffPlusResponse = await response.json();

        if (!controller.signal.aborted) {
          setRatings(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Could not load Stuff+ ratings.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRatings();

    return () => controller.abort();
  }, [selectedPlayer, season]);

  return (
    <section className="mt-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Pitcher Analysis
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Search for an MLB pitcher and select a season
          to explore their DiamondIQ Stuff+ ratings.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <PlayerSearch
          label="Search MLB Pitcher"
          onSelect={setSelectedPlayer}
        />

        <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-4">
          <label
            htmlFor="stuff-plus-season"
            className="mb-2 block text-sm font-bold text-blue-400"
          >
            Select Season
          </label>

          <select
            id="stuff-plus-season"
            value={season}
            onChange={(event) =>
              setSeason(Number(event.target.value))
            }
            className="w-full rounded-lg border border-slate-600 bg-[#081321] px-3 py-2 text-white"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>

          {selectedPlayer && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Overall DiamondIQ Stuff+
              </p>

              {loading ? (
                <p className="mt-2 text-sm text-slate-400">
                  Loading ratings...
                </p>
              ) : error ? (
                <p className="mt-2 text-sm text-red-300">{error}</p>
              ) : ratings?.overall ? (
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-white">
                    {ratings.overall.stuff_plus.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {ratings.overall.pitches.toLocaleString()} pitches
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  No qualifying overall rating.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedPlayer && (
        <div className="space-y-3">
          {loading && (
            <p className="text-sm text-slate-400">
              Loading Stuff+ ratings...
            </p>
          )}

          {error && (
            <p className="text-sm text-red-300">{error}</p>
          )}

          {!loading && !error && ratings && (
            <>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]">
                <div className="p-4">
                  <h3 className="text-lg font-semibold">
                    Pitch Arsenal Stuff+
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    DiamondIQ Stuff+ ratings and Statcast pitch characteristics. Velocity in mph, spin in rpm, movement in inches.
                  </p>
                </div>

                {ratings.pitches.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px] text-left text-sm">
                      <thead className="border-y border-white/10 bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-4 py-2">Pitch Type</th>
                          <th className="px-5 py-3 text-right">Pitches</th>
                          <th className="px-5 py-3 text-right">Usage</th>
                          <th className="px-4 py-3 text-right">Velo</th>
                          <th className="px-4 py-3 text-right">Spin</th>
                          <th className="px-4 py-3 text-right">H-Break</th>
                          <th className="px-4 py-3 text-right">V-Break</th>
                          <th className="px-5 py-3 text-right">Stuff+</th>
                        </tr>
                      </thead>

                      <tbody>
                        {ratings.pitches.map((pitch) => (
                          <tr
                            key={pitch.pitch_type}
                            className="border-b border-white/5"
                          >
                            <td className="px-4 py-2 font-semibold">
                              {PITCH_NAMES[pitch.pitch_type]
                                ? `${PITCH_NAMES[pitch.pitch_type]} (${pitch.pitch_type})`
                                : pitch.pitch_type}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {pitch.pitches.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {ratings.overall
                                ? (
                                    (pitch.pitches /
                                      ratings.overall.pitches) *
                                    100
                                  ).toFixed(1) + "%"
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {pitch.avg_velocity != null
                                ? pitch.avg_velocity.toFixed(1)
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {pitch.avg_spin != null
                                ? pitch.avg_spin.toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {pitch.avg_h_break != null
                                ? `${pitch.avg_h_break > 0 ? "+" : ""}${pitch.avg_h_break.toFixed(1)}`
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {pitch.avg_v_break != null
                                ? `${pitch.avg_v_break > 0 ? "+" : ""}${pitch.avg_v_break.toFixed(1)}`
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-blue-400">
                              {pitch.stuff_plus.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-6 pb-6 text-sm text-slate-400">
                    No qualifying pitch-type ratings for this season.
                  </p>
                )}
              </div>

              {ratings.pitches.length > 0 && (
                <PitchMovementChart pitches={ratings.pitches} />
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
