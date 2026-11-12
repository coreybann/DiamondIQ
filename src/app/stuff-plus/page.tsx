import Link from "next/link";
import StuffPlusDashboard from "./StuffPlusDashboard";


export const metadata = {
  title: "Pitcher Stuff+ Lab | DiamondIQ",
  description:
    "Explore DiamondIQ pitcher Stuff+ ratings, pitch arsenals, and pitch quality analysis.",
};

export default function StuffPlusPage() {
  return (
    <main className="min-h-screen bg-[#081321] px-5 py-10 pb-28 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ Pitch Analytics
        </p>

        <h1 className="text-3xl font-bold md:text-4xl">
          Pitcher Stuff+ Lab
        </h1>

        <p className="mt-4 max-w-3xl text-slate-400">
          Explore pitch quality through DiamondIQ's custom Stuff+
          model, trained using Statcast pitch characteristics
          and run-value outcomes.
        </p>

        <StuffPlusDashboard />

        <div className="mt-8 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
          <h2 className="text-xl font-semibold">
            Understanding DiamondIQ Stuff+
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            DiamondIQ Stuff+ evaluates pitch characteristics
            including velocity, spin rate, movement, release
            position, and extension. Ratings are centered
            around 100, with higher values indicating
            stronger modeled pitch quality.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/leaderboards"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              View MLB Stuff+ Leaderboards
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
          <h2 className="text-xl font-semibold">
            Pitch Arsenal Analysis
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Individual pitch-type ratings, arsenal breakdowns,
            and interactive pitch visualizations will be
            available here as the Lab develops.
          </p>
        </div>
      </div>
    </main>
  );
}
