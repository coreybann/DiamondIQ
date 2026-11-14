import type { Metadata } from "next";
import BreakoutLeaderboard from "./BreakoutLeaderboard";
import predictionData from "../../../public/data/hitter-breakout-regression-2027-experimental.json";

export const metadata: Metadata = {
  title: "Breakout & Regression Predictor | DiamondIQ",
  description:
    "Explore DiamondIQ's experimental MLB hitter breakout and regression prediction model.",
};

export default function BreakoutRegressionPage() {
  return (
    <main className="min-h-screen bg-[#081321] px-5 py-10 pb-28 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ | Player Development Analytics
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Breakout & Regression Predictor
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-slate-400">
          Explore an experimental statistical model designed to
          identify MLB hitters who may improve or decline in the
          following season.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Prediction Model",
              value: "Ridge Regression",
            },
            {
              label: "Historical OPS MAE",
              value: ".0621",
            },
            {
              label: "Historical Predictions",
              value: "528",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-white/10 bg-[#0d1d30] p-5"
            >
              <p className="text-sm text-slate-400">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <BreakoutLeaderboard
          players={predictionData.players.map((player) => ({
            ...player,
            prediction: player.prediction as
              "Breakout" | "Stable" | "Regression",
          }))}
        />

        <section className="mt-10 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
          <h2 className="text-xl font-bold">
            How the Model Works
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-400">
            The model evaluates OPS, walk rate, strikeout rate,
            exit velocity, hard-hit rate, barrel rate, and
            contact-based expected batting and slugging averages
            to estimate next-season offensive performance.
          </p>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            Breakouts and regressions are defined as actual OPS
            changes of at least .050 in either direction.
            The experimental prediction classification threshold
            is currently .030.
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h2 className="text-lg font-bold text-blue-300">
            Research Status
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            This model is experimental. Historical evaluation
            covers 2025 and 2026 hitters who reached at least
            200 plate appearances in consecutive seasons.
            Results are subject to selection bias and limited
            historical validation.
          </p>

          <p className="mt-4 text-sm text-slate-400">
            Player-level experimental projections are now available
            below. These predictions describe potential changes in
            offensive performance, not guaranteed outcomes.
          </p>
        </section>
      </div>
    </main>
  );
}
