
import { getMLBTransactions } from "@/lib/mlbTransactions";

export default async function TestTransactionsPage() {
  try {
    const transactions = await getMLBTransactions(
  "2025-11-01",
  "2026-03-31"
);

const freeAgentSignings = transactions.filter((transaction) =>
  /\bsigned (?:a )?free agent\b/i.test(transaction.description)
);

const majorLeagueSignings = freeAgentSignings.filter(
  (transaction) =>
    !/minor league contract/i.test(transaction.description)
);

    return (
      <main className="min-h-screen bg-[#081321] p-8 text-white">
        <h1 className="mb-4 text-3xl font-bold">
          MLB Transactions API Test
        </h1>

        <p className="mb-6 text-blue-400">
          Potential MLB free agent signings: {majorLeagueSignings.length}
        </p>

        <div className="space-y-3">
          {majorLeagueSignings.slice(0, 20).map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-lg border border-slate-700 p-4"
            >
              <p className="font-semibold">
                {transaction.playerName}
              </p>

              <p className="text-sm text-gray-400">
                {transaction.date}
              </p>

              <p className="mt-2 text-sm">
                {transaction.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    );
  } catch (error) {
    return (
      <main className="min-h-screen bg-[#081321] p-8 text-white">
        <h1 className="text-2xl font-bold">
          MLB Transactions API Test
        </h1>

        <p className="mt-4 text-red-400">
          Unable to retrieve MLB transactions.
        </p>

        <pre className="mt-4 whitespace-pre-wrap text-sm text-gray-400">
          {error instanceof Error ? error.message : "Unknown error"}
        </pre>
      </main>
    );
  }
}
