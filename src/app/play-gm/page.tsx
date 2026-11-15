import Link from "next/link";
import {
  Gamepad2,
  Trophy,
  Users,
  ArrowLeftRight,
  CalendarDays,
  Save,
  LockKeyhole,
} from "lucide-react";

export const metadata = {
  title: "Play GM | DiamondIQ",
  description:
    "Take control of an MLB franchise in DiamondIQ Play GM, a realistic baseball front office simulator.",
};

const features = [
  {
    icon: ArrowLeftRight,
    title: "Build Your Roster",
    description:
      "Make trades, negotiate contracts, and manage your organization's future.",
  },
  {
    icon: Users,
    title: "Compete Against 29 GMs",
    description:
      "Every other MLB franchise operates independently.",
  },
  {
    icon: CalendarDays,
    title: "Simulate MLB Seasons",
    description:
      "Guide your team through the regular season and postseason.",
  },
  {
    icon: Trophy,
    title: "Build a Dynasty",
    description:
      "Develop prospects, manage future payroll, and pursue championships.",
  },
];

export default function PlayGMPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 text-white sm:px-8">
      <section className="rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#122c4b] via-[#0d2038] to-[#091625] px-6 py-12 sm:px-12">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
          <Gamepad2 size={18} />
          DIAMONDIQ PLAY GM
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Your Franchise.
          <span className="block text-blue-400">
            Your Decisions.
          </span>
          Your Legacy.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          Take control of any MLB franchise. Negotiate contracts,
          make trades, build your roster, and compete against
          29 AI-controlled front offices across multiple seasons.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
            30 MLB Teams
          </span>
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
            Realistic Front Office Decisions
          </span>
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
            Multi-Season Franchise Mode
          </span>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-blue-400/30 bg-[#10253e] p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <Gamepad2 size={25} />
          </div>

          <h2 className="text-2xl font-bold">New Franchise</h2>

          <p className="mt-3 text-slate-300">
            Choose your MLB team and begin building your
            organization from the current offseason.
          </p>

          <Link
            href="/play-gm/new"
            className="mt-6 block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            New Franchise →
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#102035] p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-300">
            <Save size={25} />
          </div>

          <h2 className="text-2xl font-bold">Continue Franchise</h2>

          <p className="mt-3 text-slate-300">
            Return to your saved franchise and continue
            building your team's future.
          </p>

          <Link
            href="/play-gm/continue"
            className="mt-6 block rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-center text-sm font-bold text-blue-300 transition-colors hover:bg-blue-500/20"
          >
            Continue Franchise →
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold">
          Take Control of the Front Office
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-[#102035] p-6"
              >
                <Icon size={25} className="mb-4 text-blue-400" />

                <h3 className="font-bold">{feature.title}</h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-10 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <LockKeyhole className="shrink-0 text-blue-400" size={20} />
          <p className="text-sm text-slate-300">
            No account required. Browser-based franchise saves
            will be supported.
          </p>
        </div>

        <Link
          href="/"
          className="shrink-0 text-sm font-semibold text-blue-400 hover:text-blue-300"
        >
          DiamondIQ Home
        </Link>
      </div>
    </main>
  );
}
