"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";

type Player = {
  id: number;
  name: string;
  position: string;
  team: string;
};

export default function UniversalPlayerSearch() {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const query = search.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(
          `/api/players?search=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setPlayers(data.players ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setPlayers([]);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  const results = search.trim().length >= 2 ? players : [];

  return (
    <div className="relative mt-8 w-full max-w-2xl">
      <label
        htmlFor="universal-player-search"
        className="mb-3 block text-sm font-semibold text-slate-300"
      >
        Search MLB & MiLB Players
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-slate-600 bg-[#12243a] px-4 py-3 focus-within:border-blue-400">
        <Search size={21} className="shrink-0 text-blue-400" />

        <input
          id="universal-player-search"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPlayers([]);
            setError(false);
          }}
          placeholder="Search any MLB or MiLB player..."
          autoComplete="off"
          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
        />

        {loading && (
          <Loader2
            size={19}
            className="shrink-0 animate-spin text-blue-400"
          />
        )}
      </div>

      {search.trim().length >= 2 && (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-700 bg-[#0d1d30] shadow-2xl">
          {error ? (
            <p className="px-4 py-4 text-sm text-red-400">
              Unable to search players. Please try again.
            </p>
          ) : loading ? (
            <p className="px-4 py-4 text-sm text-slate-400">
              Searching players...
            </p>
          ) : results.length > 0 ? (
            results.slice(0, 12).map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="block border-b border-slate-700/60 px-4 py-3 transition hover:bg-[#12243a] last:border-b-0"
              >
                <span className="block font-semibold text-white">
                  {player.name}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {player.position} · {player.team}
                </span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-4 text-sm text-slate-400">
              No matching players found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
