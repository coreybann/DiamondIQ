
import Link from "next/link";

const features = [
  {
    icon: "⚾",
    title: "MLB Statistics",
    description:
      "Explore player performance, advanced metrics, and team statistics.",
    href: "/stats",
  },
  {
    icon: "🔎",
    title: "Scouting Hub",
    description:
      "Evaluate players, analyze strengths, and discover future talent.",
    href: "/scouting",
  },
  {
    icon: "📊",
    title: "Player Comparisons",
    description:
      "Compare players using performance metrics and visualizations.",
    href: "/compare",
  },
  {
    icon: "🏟️",
    title: "Front Office Lab",
    description:
      "Explore roster construction, player value, and baseball strategy.",
    href: "/front-office",
  },
  {
    icon: "💻",
    title: "Research & Projects",
    description:
      "Explore original baseball analytics projects and research.",
    href: "/research",
  },
  {
    icon: "👤",
    title: "About Me",
    description:
      "Learn about my background, experience, and career goals.",
    href: "/about",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#081321] text-white">
      

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-24">
        <div className="max-w-4xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-blue-400">
            Baseball Analytics & Scouting
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-7xl">
            Baseball Intelligence.
            <span className="block text-blue-400">
              Better Decisions.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
            Explore advanced MLB statistics, player evaluations,
            scouting insights, and front office analysis through
            data-driven baseball research.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/stats"
              className="rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600"
            >
              Explore MLB Stats →
            </Link>
            <Link
              href="/research"
              className="rounded-lg border border-slate-600 px-6 py-3 font-semibold hover:bg-white/10"
            >
              View My Research
            </Link>
          </div>
        </div>
      </section>
{/* Mobile Quick Access */}
<section className="mx-auto max-w-7xl px-6 pt-8 md:hidden">
  <h2 className="mb-4 text-xl font-bold">
    Quick Access
  </h2>

  <div className="grid grid-cols-2 gap-3">
    {[
      { name: "MLB Stats", href: "/stats", icon: "📊" },
      { name: "Compare", href: "/compare", icon: "⇄" },
      { name: "Player Trends", href: "/trends", icon: "📈" },
      { name: "Scouting", href: "/scouting", icon: "⚾" },
    ].map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className="flex min-h-28 flex-col justify-center gap-2 rounded-xl border border-slate-700 bg-[#12243a] p-4 transition-colors active:bg-[#1b3654]"
      >
        <span className="text-2xl">{item.icon}</span>
        <span className="text-sm font-semibold">{item.name}</span>
      </Link>
    ))}
  </div>
</section>
      <section className="border-y border-white/10 bg-[#0d1d30]">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-3 px-4 py-6 text-center md:gap-6 md:px-6 md:py-10 md:text-left">
          <div>
            <p className="text-4xl font-bold text-blue-400">30</p>
            <p className="mt-2 text-slate-400">MLB Teams</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-blue-400">6</p>
            <p className="mt-2 text-slate-400"><span className="md:hidden">Sections</span>
<span className="hidden md:inline">Planned Website Sections</span></p>
          </div>
          <div>
            <p className="text-4xl font-bold text-blue-400">1</p>
            <p className="mt-2 text-slate-400"><span className="md:hidden">Better Decisions</span>
<span className="hidden md:inline">Goal: Better Baseball Decisions</span></p>
          </div>
        </div>
      </section>

      <section className="mx-auto hidden max-w-7xl px-6 py-20 md:block">
        <h2 className="text-3xl font-bold">Explore DiamondIQ</h2>
        <p className="mt-3 text-slate-400">
          Advanced tools and research for understanding the game.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="rounded-xl border border-slate-700 bg-[#12243a] p-7 transition hover:-translate-y-1 hover:border-blue-400"
            >
              <div className="mb-5 text-3xl">{feature.icon}</div>
              <h3 className="text-xl font-bold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">
                {feature.description}
              </p>
              <p className="mt-6 font-semibold text-blue-400">
                Explore →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        © 2026 DiamondIQ. Independent baseball analytics and research.
      </footer>
    </main>
  );
}
