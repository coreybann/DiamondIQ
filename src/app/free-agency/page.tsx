import FreeAgentTracker from "./FreeAgentTracker";
import {
  getFreeAgentSignings,
  getMLBPlayerPositions,
} from "@/lib/mlbTransactions";
import SigningSearch from "./SigningSearch";
import {
  freeAgents,
  getCurrentOffseason,
} from "@/lib/freeAgency";

export default async function FreeAgencyPage() {
 const offseason = getCurrentOffseason();    
const offseasonStartYear = Number(offseason.split("-")[0]);

const today = new Date().toISOString().slice(0, 10);
const currentOffseasonStart = `${offseasonStartYear}-11-01`;
const currentOffseasonEnd = `${offseasonStartYear + 1}-03-31`;

const currentSignings =
  today >= currentOffseasonStart
    ? await getFreeAgentSignings(
        currentOffseasonStart,
        today < currentOffseasonEnd
          ? today
          : currentOffseasonEnd
      )
    : [];

const historicalSignings = await getFreeAgentSignings(
  `${offseasonStartYear - 1}-11-01`,
  `${offseasonStartYear}-03-31`
);

 const playerPositions = await getMLBPlayerPositions(
  [...currentSignings, ...historicalSignings]
    .map((transaction) => transaction.playerId)
    .filter((id): id is number => id !== null)
);

  const signingByPlayerId = new Map(
    [...currentSignings]
      .filter((signing) => signing.playerId !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((signing) => [signing.playerId, signing])
  );

  const currentFreeAgents = freeAgents
    .filter((player) => player.offseason === offseason)
    .map((player) => {
      const signing =
        player.id > 0 ? signingByPlayerId.get(player.id) : undefined;

      return {
        ...player,
        status: signing
          ? ("Signing Reported" as const)
          : player.status,
        signedTeam: signing?.toTeam ?? player.signedTeam,
      };
    });

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ
        </p>

        <h1 className="text-4xl font-bold">
          MLB Free Agency Hub
        </h1>

        <p className="mt-4 text-gray-400">
          Track MLB free agents, evaluate player performance,
          analyze team fits, and explore contract projections.
        </p>
<a
  href="/free-agency/team-fit"
  className="mt-3 block w-full rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-500 sm:mr-3 sm:inline-block sm:w-auto"
>
  Explore Team Fit Analysis →
</a>

<a
  href="/free-agency/rankings"
  className="mt-3 block w-full rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-500 sm:mr-3 sm:inline-block sm:w-auto"
>
  Explore Free Agent Rankings →
</a>
<a
  href="/free-agency/contracts"
  className="mt-3 block w-full rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-500 sm:mr-3 sm:inline-block sm:w-auto"
>
  Explore Contract Projections →
</a>
        <div className="mt-10 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              Free Agent Tracker
            </h2>

            <span className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-400">
              {offseason} Offseason
            </span>
          </div>

          <FreeAgentTracker players={currentFreeAgents} />
        </div>
<div className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">


    <span className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-400">
      {offseason} Offseason
    </span>
  </div>

  <p className="mb-6 text-sm text-gray-400">
    Potential Major League free agent signings recorded by MLB.
    Transactions explicitly identified as minor league contracts
    are excluded. Contract classifications have not been independently verified.
  </p>

<SigningSearch
  title="Current Offseason Signings"
  signings={currentSignings}
  playerPositions={playerPositions}
/>
</div>
<div className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">


  <p className="mb-6 text-sm text-gray-400">
    Potential Major League signings from the{" "}
{offseasonStartYear - 1}–{offseasonStartYear} offseason.
    Transactions explicitly identified as minor league contracts
    are excluded.
  </p>



  <SigningSearch
  title="Historical Free Agent Signings"
  signings={historicalSignings}
  playerPositions={playerPositions}
/>
</div>

      </div>
    </main>
  );
}
