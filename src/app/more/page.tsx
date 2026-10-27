import Link from "next/link";

const morePages = [
  {
    title: "Scouting",
    description: "Explore player scouting reports and evaluations.",
    href: "/scouting",
    icon: "🔍",
  },
  {
    title: "Front Office",
    description: "Explore baseball operations and roster strategy.",
    href: "/front-office",
    icon: "⚾",
  },
  {
    title: "Trade Analyzer",
    description: "Evaluate hypothetical MLB trades using projected WAR, contract years, and salary value.",
    href: "/trade-analyzer",
    icon: "🔄",
  },
  {
  title: "Free Agency",
  description: "Track MLB free agents, offseason signings, and player positions.",
  href: "/free-agency",
  icon: "📝",
},
  {
    title: "Research",
    description: "View baseball analytics projects and research.",
    href: "/research",
    icon: "📊",
  },
  {
    title: "About Me",
    description: "Learn about the creator of DiamondIQ.",
    href: "/about",
    icon: "👤",
  },
];

export default function MorePage() {
  return (
    <main className="min-h-screen bg-[#081321] px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ
        </p>

        <h1 className="mb-3 text-3xl font-bold">
          Explore More
        </h1>

        <p className="mb-8 text-slate-400">
          Discover more baseball analytics tools, scouting insights,
          and research.
        </p>

        <div className="grid gap-4">
          {morePages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#0d1d30] p-5 transition hover:border-blue-400/50 hover:bg-[#142b45]"
            >
              <span className="text-3xl">{page.icon}</span>

              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">
                  {page.title}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {page.description}
                </p>
              </div>

              <span className="text-xl text-blue-400">›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}