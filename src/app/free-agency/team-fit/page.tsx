
import Link from "next/link";
import TeamFitSelector from "./TeamFitSelector";
export default function TeamFitPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/free-agency"
        className="text-sm text-blue-400 hover:underline"
      >
        ← Back to Free Agency
      </Link>

      <div className="mt-8">
        <h1 className="text-3xl font-bold">
          MLB Team Fit Analysis
        </h1>

        <p className="mt-4 text-gray-400">
          Evaluate how MLB players fit different teams
          based on player performance, position, and
          team needs.
        </p>
      </div>

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">
          Player and Team Comparison
        </h2>

        <p className="mt-3 text-gray-400">
          Select an MLB player and team to begin
          evaluating their potential fit.
        </p>
        <TeamFitSelector />
      </section>
    </main>
  );
}
