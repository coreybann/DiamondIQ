
const projects = [
  
  
  
{
  number: "01",
  category: "INTERACTIVE TOOL",
  title: "DiamondIQ Front Office Tools",
  status: "Available",
  description:
    "An interactive baseball front office platform featuring player value analysis, salary efficiency metrics, and tools for evaluating player performance and roster decisions.",
  methods: ["Player Valuation", "Salary Analysis", "Roster Evaluation"],
  takeaway:
    "Explore existing DiamondIQ tools for connecting player performance with financial and roster decisions.",
  href: "/front-office",
  linkLabel: "Explore Front Office Tools",
},

{
  number: "02",
  category: "INTERACTIVE TOOL",
  title: "MLB Player Comparison",
  status: "Available",
  description:
    "An interactive DiamondIQ tool for comparing MLB players across seasons using statistics such as wOBA, ISO, and strikeout-to-walk rate.",
  methods: ["wOBA", "ISO", "K-BB%", "Season Comparisons"],
  takeaway:
    "Helps users examine differences in player performance across selected seasons.",
  href: "/compare",
  linkLabel: "Open Player Comparison",
},

];

const skills = [
  "R Programming",
  "Data Cleaning",
  "Tableau",
  "Data Visualization",
  "Baseball Statistics",
  "Analytical Research",
];

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-[#081321] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-20">
        <section className="max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
            Research & Projects
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Building Tools for Baseball Decision-Making
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            Explore DiamondIQ's interactive baseball tools for evaluating player performance, comparing players across seasons, and examining salary efficiency. This page highlights the features I've built and the baseball analytics concepts behind them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
            >
              Explore Projects
            </a>
            <a
              href="/front-office"
              className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-blue-500"
            >
              Front Office Tools
            </a>
          </div>
        </section>

        <section className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#0d1b2d] p-5">
            <p className="text-sm text-slate-400">Research Focus</p>
            <h2 className="mt-2 text-xl font-bold">MLB Analytics</h2>
            <p className="mt-2 text-sm text-slate-400">
              Team performance, player evaluation, and baseball operations.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d1b2d] p-5">
            <p className="text-sm text-slate-400">Primary Tools</p>
            <h2 className="mt-2 text-xl font-bold">R & Data Visualization</h2>
            <p className="mt-2 text-sm text-slate-400">
              Statistical analysis, data preparation, and visual storytelling.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d1b2d] p-5">
            <p className="text-sm text-slate-400">Current Direction</p>
            <h2 className="mt-2 text-xl font-bold">Roster Strategy</h2>
            <p className="mt-2 text-sm text-slate-400">
              Connecting player value, performance, and payroll decisions.
            </p>
          </div>
        </section>

        <section id="projects" className="mt-20 scroll-mt-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Selected Work
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              DiamondIQ Tools
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-400">
              Explore the interactive tools available in DiamondIQ for comparing
MLB players and evaluating player value and salary efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.number}
                className="flex h-full flex-col rounded-2xl border border-slate-800 bg-[#0d1b2d] p-6 transition duration-200 hover:border-blue-700 md:p-8"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold tracking-widest text-blue-400">
                    PROJECT {project.number}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      project.status === "Completed"
                        ? "border-emerald-800 bg-emerald-950/50 text-emerald-400"
                        : project.status === "In Progress"
                          ? "border-amber-800 bg-amber-950/40 text-amber-300"
                          : "border-blue-800 bg-blue-950/40 text-blue-300"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {project.category}
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  {project.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  {project.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {project.methods.map((method) => (
                    <span
                      key={method}
                      className="rounded-md border border-slate-700 bg-[#081321] px-3 py-1.5 text-xs text-slate-300"
                    >
                      {method}
                    </span>
                  ))}
                </div>

                <div className="mt-6 border-t border-slate-800 pt-5">
                  <p className="text-sm font-semibold text-slate-200">
                    Project Focus
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {project.takeaway}
                  </p>
                </div>

                <div className="mt-auto pt-6">
                  {project.href ? (
                    <a
                      href={project.href}
                      className="inline-flex items-center gap-2 font-semibold text-blue-400 transition hover:text-blue-300"
                    >
                      {project.linkLabel}
                      <span aria-hidden="true">→</span>
                    </a>
                  ) : (
                    <span className="text-sm text-slate-500">
                      Portfolio project
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-2xl border border-slate-800 bg-[#0d1b2d] p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Analytical Toolkit
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Skills Applied to Baseball
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            These are the tools and skills I have used or developed through
            my analytics coursework and projects. My goal is to continue
            expanding this toolkit through hands-on baseball research.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-slate-700 bg-[#081321] px-4 py-3 text-sm font-medium text-slate-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold">
            Interested in my work?
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            Explore the interactive tools on DiamondIQ to see how baseball
            statistics can support player evaluation and front office
            decision-making.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="/compare"
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
            >
              Compare Players
            </a>
            <a
              href="/front-office"
              className="rounded-lg border border-slate-700 px-5 py-3 font-semibold transition hover:border-blue-500"
            >
              Explore Front Office
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
