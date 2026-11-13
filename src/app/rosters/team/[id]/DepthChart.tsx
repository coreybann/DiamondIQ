import Link from "next/link";

type MLBPlayer = {
  id: number;
  name: string;
  number: string | null;
  position: string;
  status: string;
  age: number | null;
  bats: string;
  throws: string;
};

const positionGroups = [
  {
    title: "Position Players",
    positions: ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"],
  },
  {
    title: "Pitching Staff",
    positions: ["SP", "P", "RP", "TWP"],
  },
];

export default function DepthChart({
  players,
}: {
  players: MLBPlayer[];
}) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-400">
        Players are displayed in MLB's listed depth-chart order.
        This order does not guarantee projected starters or bullpen roles.
      </p>

      {positionGroups.map((group) => {
        const sections = group.positions
          .map((position) => ({
            position,
            players: players.filter(
              (player) => player.position === position
            ),
          }))
          .filter((section) => section.players.length > 0);

        if (sections.length === 0) return null;

        return (
          <section key={group.title}>
            <h2 className="mb-4 text-xl font-bold text-white">
              {group.title}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {sections.map((section) => (
                <div
                  key={section.position}
                  className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]"
                >
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#12243a] px-5 py-3">
                    <h3 className="font-bold text-white">
                      {section.position === "SP"
                        ? "Starting Pitchers"
                        : section.position === "P" ||
                            section.position === "RP"
                          ? "Relievers"
                          : section.position}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {section.players.length} players
                    </span>
                  </div>

                  <div className="divide-y divide-white/5">
                    {section.players.map((player, index) => (
                      <div
                        key={`${section.position}-${player.id}-${index}`}
                        className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-white/[0.03]"
                      >
                        <span className="w-6 shrink-0 font-bold text-blue-400">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/players/${player.id}`}
                            className="font-medium text-white hover:text-blue-400 hover:underline"
                          >
                            {player.name}
                          </Link>
                        </div>

                        <span className="text-xs text-slate-400">
                          {player.bats}/{player.throws}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {players.length === 0 && (
        <p className="rounded-xl border border-white/10 p-6 text-slate-400">
          No depth-chart data is available for this team.
        </p>
      )}
    </div>
  );
}
