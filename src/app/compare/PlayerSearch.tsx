
"use client";

import { useState } from "react";

type Player = {
  id: number;
  name: string;
  position: string;
  team: string;
};

export default function PlayerSearch({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (player: Player | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchPlayers() {
    if (search.trim().length < 2) return;

    setLoading(true);
    setError("");
    setPlayers([]);

    try {
      const response = await fetch(
        `/api/players?search=${encodeURIComponent(search)}`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setPlayers(data.players ?? []);
    } catch {
      setError("Could not search players. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-[#12243a] p-6">
      <p className="mb-4 text-sm font-bold text-blue-400">
        {label}
      </p>

      {selected ? (
        <div>
          <h2 className="text-2xl font-bold">{selected.name}</h2>
          <p className="mt-2 text-slate-400">
            {selected.team} | {selected.position}
          </p>
          <button
            onClick={() => {
              setSelected(null);
              setSearch("");
              setPlayers([]);
            }}
            className="mt-5 text-sm font-semibold text-blue-400"
          >
            Change Player
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchPlayers();
              }}
              placeholder="Search player name..."
              className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-[#081321] px-3 py-3 text-white outline-none focus:border-blue-400"
            />
            <button
              onClick={searchPlayers}
              disabled={loading}
              className="rounded-lg bg-blue-500 px-4 py-3 font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "..." : "Search"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-300">{error}</p>
          )}

          <div className="mt-4 max-h-64 overflow-y-auto">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => {
  setSelected(player);
  onSelect(player);
}}
                className="block w-full border-b border-slate-700 px-3 py-3 text-left hover:bg-white/5"
              >
                <p className="font-semibold">{player.name}</p>
                <p className="text-sm text-slate-400">
                  {player.team} | {player.position}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
