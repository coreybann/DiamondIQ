import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Binoculars,
  ClipboardList,
  GitCompareArrows,
  LineChart,
  ChartNoAxesCombined,
  Search,
  GraduationCap,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

const toolGroups = [
  {
    title: "Front Office",
    description: "Analyze roster construction, team needs, and baseball operations.",
    tools: [
      {
        title: "Front Office",
        description: "Explore player value, payroll, and front-office strategy.",
        href: "/front-office",
        icon: BarChart3,
      },
      {
        title: "Team Needs",
        description: "Identify positional strengths, weaknesses, and roster gaps.",
        href: "/team-needs",
        icon: ClipboardList,
      },
      {
        title: "Roster Constructor",
        description: "Build custom rosters and evaluate projected WAR and payroll.",
        href: "/roster-constructor",
        icon: Users,
      },
      {
        title: "Lineup Optimizer",
        description: "Compare batting orders, platoon matchups, and offensive production.",
        href: "/lineup-optimizer",
        icon: LineChart,
      },
      {
        title: "Bullpen Usage & Fatigue",
        description: "Analyze historical bullpen workloads, pitcher rest, and fatigue indicators.",
        href: "/bullpen-usage",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Trades & Free Agency",
    description: "Evaluate potential transactions and player acquisition opportunities.",
    tools: [
      {
        title: "Trade Analyzer",
        description: "Evaluate hypothetical trades using WAR and contract value.",
        href: "/trade-analyzer",
        icon: GitCompareArrows,
      },
      {
        title: "Trade Target Finder",
        description: "Find trade candidates using team fit, surplus value, and salary.",
        href: "/trade-target-finder",
        icon: Search,
      },
      {
        title: "Free Agency",
        description: "Explore free agents, contract projections, and team fits.",
        href: "/free-agency",
        icon: Wallet,
      },
    ],
  },
  {
    title: "Scouting",
    description: "Explore player evaluation and scouting insights.",
    tools: [
      {
        title: "Scouting",
        description: "View player scouting reports and performance evaluations.",
        href: "/scouting",
        icon: Binoculars,
      },
      {
        title: "Pitcher Stuff+ Lab",
        description: "Explore pitcher Stuff+ ratings, pitch quality, and arsenal analysis.",
        href: "/stuff-plus",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Prospects & Player Development",
    description: "Explore minor-league talent and player development.",
    tools: [
      {
        title: "Prospect Development Hub",
        description: "Browse minor-league players and explore future MLB talent.",
        href: "/prospects",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "Research",
    description: "Explore baseball analytics projects and research.",
    tools: [
      {
        title: "MLB Leaderboards",
        description: "Build custom MLB hitting and pitching leaderboards with advanced statistics, filters, sorting, and CSV exports.",
        href: "/leaderboards",
        icon: BarChart3,
      },
      {
        title: "Research",
        description: "View baseball analytics research and portfolio projects.",
        href: "/research",
        icon: Wrench,
      },
      {
        title: "2027 Player Projections",
        description: "Explore projected MLB hitting performance, debut probabilities, and potential returnees.",
        href: "/projections",
        icon: LineChart,
      },
      {
        title: "Breakout & Regression Predictor",
        description: "Explore experimental MLB hitter breakout and regression predictions using advanced performance metrics.",
        href: "/breakout-regression",
        icon: ChartNoAxesCombined,
      },
    ],
  },
];

export default function MorePage() {
  return (
    <main className="min-h-screen bg-[#081321] px-5 py-10 pb-28 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ
        </p>

        <h1 className="text-3xl font-bold md:text-4xl">
          Tools Hub
        </h1>

        <p className="mt-3 max-w-2xl text-slate-400">
          Explore DiamondIQ's baseball analytics tools for scouting,
          roster construction, trades, and front-office decisions.
        </p>

        <div className="mt-10 space-y-10">
          {toolGroups.map((group) => (
            <section key={group.title}>
              <h2 className="text-xl font-semibold text-blue-400">
                {group.title}
              </h2>

              <p className="mt-1 mb-4 text-sm text-slate-400">
                {group.description}
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.tools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="group flex min-h-36 flex-col rounded-xl border border-white/10 bg-[#0d1d30] p-5 transition-colors hover:border-blue-400/50 hover:bg-[#142b45]"
                    >
                      <div className="flex items-center justify-between">
                        <Icon size={23} className="text-blue-400" />
                        <ArrowRight
                          size={18}
                          className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-blue-400"
                        />
                      </div>

                      <h3 className="mt-4 font-semibold text-white">
                        {tool.title}
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {tool.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
