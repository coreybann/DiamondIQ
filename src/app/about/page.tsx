
const experience = [
  {
    role: "Student Football Manager",
    organization: "University of Delaware Athletics",
    description:
      "Supported football operations through equipment distribution, practice preparation, field setup, and day-to-day team activities. Developed an understanding of teamwork, organization, and the operational demands of a college athletic program.",
  },
  {
    role: "Field Manager",
    organization: "Perfect Game",
    description:
      "Helped coordinate travel baseball events, supported field operations, and used Perfect Game's app and website to record and maintain game statistics.",
  },
];

const skills = [
  "R Programming",
  "Data Cleaning",
  "Data Visualization",
  "Baseball Statistics",
  "Baseball Data Analysis",
  "Microsoft Excel",
  "Team Operations",
  "Communication",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#081321] text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <section className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
            About Me
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
            Baseball, Data, and Better Decisions
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            I'm interested in how data can help baseball organizations
            evaluate players, understand performance, and make better
            decisions. DiamondIQ is my platform for exploring baseball
            statistics and building tools around player evaluation and
            front office analysis.
          </p>

          <p className="mt-4 leading-7 text-slate-400">
            My background combines hands-on sports operations experience
            with academic work in sports analytics. Through my experience
            with University of Delaware Athletics and Perfect Game, I've
            gained an appreciation for the preparation, organization, and
            teamwork that support successful baseball and sports programs.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/research"
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
            >
              Explore DiamondIQ
            </a>
            <a
              href="/front-office"
              className="rounded-lg border border-slate-700 px-5 py-3 font-semibold transition hover:border-blue-500"
            >
              Front Office Tools
            </a>
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#0d1b2d] p-6">
            <p className="text-sm text-slate-400">Education & Development</p>
            <h2 className="mt-2 text-xl font-bold">
              Sports Analytics
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Building skills in statistical analysis, data preparation,
              visualization, and the application of data to sports.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d1b2d] p-6">
            <p className="text-sm text-slate-400">Experience</p>
            <h2 className="mt-2 text-xl font-bold">
              Sports Operations
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Experience supporting college football operations and
              travel baseball events.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d1b2d] p-6">
            <p className="text-sm text-slate-400">Career Interest</p>
            <h2 className="mt-2 text-xl font-bold">
              Baseball Operations
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Interested in baseball analytics, player evaluation,
              roster construction, and front office decision-making.
            </p>
          </div>
        </section>

        <section className="mt-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Background
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            Sports Experience
          </h2>

          <div className="mt-8 space-y-5">
            {experience.map((item) => (
              <article
                key={item.role}
                className="rounded-2xl border border-slate-800 bg-[#0d1b2d] p-6 md:p-8"
              >
                <p className="text-sm font-semibold text-blue-400">
                  {item.organization}
                </p>
                <h3 className="mt-2 text-xl font-bold">
                  {item.role}
                </h3>
                <p className="mt-4 leading-7 text-slate-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-2xl border border-slate-800 bg-[#0d1b2d] p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Skills & Tools
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            My Toolkit
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            Skills developed through coursework, sports experience,
            and independent work with baseball data.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-slate-700 bg-[#081321] px-4 py-3 text-sm text-slate-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold">
            What I'm Working Toward
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-400">
            My goal is to pursue a career in baseball where I can combine
            my interest in the game with analytical thinking and practical
            problem-solving. I'm continuing to develop my technical skills
            while learning how data can support player evaluation,
            roster decisions, and organizational strategy.
          </p>
        </section>
      </div>
    </main>
  );
}
