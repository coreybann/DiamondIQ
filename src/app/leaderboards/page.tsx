import LeaderboardBuilder from "./LeaderboardBuilder";

export const metadata = {
  title: "MLB Leaderboards | DiamondIQ",
  description:
    "Explore and compare MLB player statistics with customizable hitting and pitching leaderboards.",
};

export default function LeaderboardsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-12 text-white">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ | Player Analytics
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          MLB Leaderboards
        </h1>

        <p className="mt-4 max-w-3xl text-slate-400">
          Explore MLB hitting and pitching statistics.
          Search players, customize statistical columns,
          filter results, and compare performance across seasons.
        </p>
      </div>

      <LeaderboardBuilder />
    </main>
  );
}
