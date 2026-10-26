
"use client";

import { useState } from "react";
import Link from "next/link";
type Signing = {
  id: number;
  date: string;
  playerId: number | null;
  playerName: string;
  description: string;
};

type SigningSearchProps = {
  title: string;
  signings: Signing[];
  playerPositions: Record<number, string>;
};

export default function SigningsSearch({
  title,
  signings,
  playerPositions,
}: SigningSearchProps) {
  const [search, setSearch] = useState("");

  const filteredSignings = signings.filter((signing) =>
    signing.playerName
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>

        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-[#081321] px-4 py-2 text-sm text-white outline-none focus:border-blue-400 sm:w-64"
        />
      </div>

      <p className="mb-4 text-sm text-gray-400">
        Showing {filteredSignings.length} of {signings.length} signing transactions
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 text-gray-400">
            <tr>
              <th className="px-4 py-3">Player</th>
<th className="px-4 py-3">Position</th>
<th className="px-4 py-3">Date</th>
<th className="px-4 py-3">Transaction</th>
            </tr>
          </thead>

          <tbody>
            {filteredSignings.map((signing) => (
              <tr
                key={signing.id}
                className="border-b border-slate-800"
              >
                <td className="whitespace-nowrap px-4 py-4 font-medium">
  {signing.playerId !== null ? (
    <Link
      href={`/free-agency/player/${signing.playerId}`}
      className="text-blue-400 hover:text-blue-300 hover:underline"
    >
      {signing.playerName}
    </Link>
  ) : (
    signing.playerName
  )}
</td>
<td className="whitespace-nowrap px-4 py-4">
  {signing.playerId !== null
    ? playerPositions[signing.playerId] ?? "N/A"
    : "N/A"}
</td>
                <td className="whitespace-nowrap px-4 py-4">
                  {signing.date}
                </td>

                <td className="px-4 py-4 text-gray-300">
                  {signing.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSignings.length === 0 && (
          <p className="py-8 text-center text-gray-400">
            {search
              ? "No players match your search."
              : "No signing transactions available."}
          </p>
        )}
      </div>
    </div>
  );
}
