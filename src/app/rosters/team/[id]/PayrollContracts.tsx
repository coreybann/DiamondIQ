import Link from "next/link";
import type { TeamSalaryRecord, TeamSalaryProjection } from "@/lib/teamPayroll";

type FortyManPlayer = {
  id: number;
  name: string;
  position: string;
  status: string;
};

type Props = {
  records: TeamSalaryRecord[];
  projections: TeamSalaryProjection[];
  fortyManPlayers: FortyManPlayer[];
};

function formatSalary(amount: number | null): string {
  return amount === null ? "—" : `$${amount.toFixed(2)}M`;
}

export default function PayrollContracts({
  records,
  projections,
  fortyManPlayers,
}: Props) {
  const arbitration = projections.filter(
    (record) => record.category === "arbitration"
  );

  const preArbitration = projections.filter(
    (record) => record.category === "pre_arbitration"
  );

  const arbitrationTotal = arbitration.reduce(
    (sum, record) => sum + record.estimatedSalaryMillions,
    0
  );

  const preArbitrationTotal = preArbitration.reduce(
    (sum, record) => sum + record.estimatedSalaryMillions,
    0
  );


  const listed = records.filter(
    (record) =>
      record.salaryStatus === "salary_listed" &&
      record.salaryMillions !== null
  );

  const subtotal = listed.reduce(
    (sum, record) => sum + (record.salaryMillions ?? 0),
    0
  );

  const combinedEstimate =
    subtotal + arbitrationTotal + preArbitrationTotal;

  // Identify current 40-man players without salary coverage.
  const coveredPlayerIds = new Set<number>();

  for (const record of listed) {
    if (record.mlbPlayerId !== null) {
      coveredPlayerIds.add(record.mlbPlayerId);
    }
  }

  for (const projection of projections) {
    coveredPlayerIds.add(projection.mlbPlayerId);
  }

  const missingSalaryPlayers = fortyManPlayers
    .filter((player) => !coveredPlayerIds.has(player.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const coveredPlayerCount = fortyManPlayers.filter(
    (player) => coveredPlayerIds.has(player.id)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          2027 Payroll & Contracts — 40-Man Roster
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Contract salary information from DiamondIQ's existing
          Baseball-Reference dataset. Figures are based on the
          2026 offseason snapshot and may not reflect subsequent
          transactions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-5">
          <p className="text-sm text-slate-400">
            40-Man Listed Salary Subtotal
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatSalary(subtotal)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Listed 2027 salaries for current 40-man roster players only.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-5">
          <p className="text-sm text-slate-400">
            Players With Listed Salaries
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {listed.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Excludes arbitration estimates and unknown salaries.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]">
        <div className="border-b border-white/10 bg-[#12243a] px-6 py-4">
          <h3 className="text-xl font-bold text-white">
            Listed 2027 Salaries
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Contract</th>
                <th className="px-6 py-4 text-right">
                  2027 Salary
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {listed.map((record, index) => (
                <tr
                  key={`${record.player}-${index}`}
                  className="hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {record.source ? (
                      <a
                        href={record.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 hover:underline"
                      >
                        {record.player}
                      </a>
                    ) : (
                      record.player
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {record.contractStatus}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-white">
                    {formatSalary(record.salaryMillions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {listed.length === 0 && (
          <p className="px-6 py-6 text-sm text-slate-400">
            No listed 2027 salaries are available for this team.
          </p>
        )}
      </section>

      <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-5">
        <p className="text-sm text-slate-400">
          2027 40-Man Roster Salary Estimate
        </p>
        <p className="mt-2 text-3xl font-bold text-white">
          {formatSalary(combinedEstimate)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Listed salaries plus arbitration and pre-arbitration
          projections for current 40-man roster players. This is
          not an official or complete team payroll. Contract
          figures come from a historical snapshot, and projections
          are estimates rather than finalized salaries.
        </p>
      </div>

      {([
        {
          title: "2027 Arbitration Projections",
          players: arbitration,
          total: arbitrationTotal,
        },
        {
          title: "2027 Pre-Arbitration Projections",
          players: preArbitration,
          total: preArbitrationTotal,
        },
      ] as const).map((section) => (
        <section
          key={section.title}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#12243a] px-6 py-4">
            <div>
              <h3 className="text-xl font-bold text-white">
                {section.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Model-generated estimates, not finalized salaries.
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white">
                {formatSalary(section.total)}
              </p>
              <p className="text-xs text-slate-400">
                {section.players.length} players
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4">Projection Method</th>
                  <th className="px-6 py-4 text-right">
                    Estimated Salary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {section.players.map((player, index) => (
                  <tr
                    key={`${player.player}-${index}`}
                    className="hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {player.player}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {player.method.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-white">
                      {formatSalary(player.estimatedSalaryMillions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {section.players.length === 0 && (
            <p className="px-6 py-6 text-sm text-slate-400">
              No projections available for this team.
            </p>
          )}
        </section>
      ))}

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#12243a] px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              40-Man Players Without Salary Estimates
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Players on the current 40-man roster without a
              listed 2027 salary or existing salary projection.
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-300">
            {missingSalaryPlayers.length} players
          </span>
        </div>

        {missingSalaryPlayers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4 text-right">
                    Salary Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {missingSalaryPlayers.map((player) => (
                  <tr
                    key={player.id}
                    className="hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-4 font-medium">
                      <Link
                        href={`/players/${player.id}`}
                        className="text-white hover:text-blue-400 hover:underline"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {player.position}
                    </td>
                    <td className="px-6 py-4 text-right text-amber-400">
                      Unavailable
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-6 text-sm text-slate-400">
            All current 40-man roster players have salary coverage.
          </p>
        )}

        <p className="border-t border-white/10 px-6 py-4 text-xs text-slate-500">
          Salary coverage: {coveredPlayerCount} of{" "}
          {fortyManPlayers.length} current 40-man players.
          Players without salary data are excluded from the
          estimated payroll total.
        </p>
      </section>
    </div>
  );
}
