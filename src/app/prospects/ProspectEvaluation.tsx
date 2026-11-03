type ProspectStat = Record<string, string | number>;

type Props = {
  playerName: string;
  isPitcher: boolean;
  season: string;
  level: string;
  stats: ProspectStat;
};

export default function ProspectEvaluation({
  playerName,
  isPitcher,
  season,
  level,
  stats,
}: Props) {
  const observations: string[] = [];
  const areasToEvaluate: string[] = [];

  if (isPitcher) {
    if (stats.era != null) {
      observations.push(
        `Recorded a ${stats.era} ERA in ${season} at ${level}.`
      );
    }

    if (stats.whip != null) {
      observations.push(
        `Allowed ${stats.whip} walks and hits per inning pitched (WHIP).`
      );
    }

    if (stats.strikeoutsPer9Inn != null) {
      observations.push(
        `Averaged ${stats.strikeoutsPer9Inn} strikeouts per nine innings.`
      );
    }

    if (stats.walksPer9Inn != null) {
      areasToEvaluate.push(
        `Review the ${stats.walksPer9Inn} walks per nine innings alongside strikeout production.`
      );
    }

    if (stats.strikeoutWalkRatio != null) {
      observations.push(
        `Recorded a ${stats.strikeoutWalkRatio} strikeout-to-walk ratio.`
      );
    }

    areasToEvaluate.push(
      "Compare pitch velocity, movement, command, and quality of contact before assigning scouting grades."
    );
  } else {
    const plateAppearances = Number(stats.plateAppearances);
    const strikeouts = Number(stats.strikeOuts);
    const walks = Number(stats.baseOnBalls);

    if (
      Number.isFinite(plateAppearances) &&
      plateAppearances > 0
    ) {
      if (
        stats.strikeOuts != null &&
        Number.isFinite(strikeouts)
      ) {
        const strikeoutRate = (
          (strikeouts / plateAppearances) * 100
        ).toFixed(1);

        if (Number(strikeoutRate) >= 28) {
          areasToEvaluate.push(
            `Elevated strikeout rate (${strikeoutRate}% K%) warrants further evaluation of contact ability.`
          );
        } else {
          observations.push(
            `Struck out in ${strikeoutRate}% of plate appearances (K%).`
          );
        }
      }

      if (
        stats.baseOnBalls != null &&
        Number.isFinite(walks)
      ) {
        const walkRate = (
          (walks / plateAppearances) * 100
        ).toFixed(1);

        observations.push(
          `Walked in ${walkRate}% of plate appearances (BB%).`
        );
      }
    }

    if (stats.avg != null) {
      observations.push(
        `Recorded a ${stats.avg} batting average in ${season} at ${level}.`
      );
    }

    if (stats.obp != null) {
      observations.push(
        `Posted a ${stats.obp} on-base percentage.`
      );
    }

    if (stats.ops != null) {
      observations.push(
        `Produced a ${stats.ops} OPS.`
      );
    }

    areasToEvaluate.push(
      "Review strikeout rate, walk rate, contact quality, and performance against age-appropriate competition."
    );
  }

  return (
    <section className="mt-12 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
      <h2 className="text-2xl font-bold">
        Prospect Statistical Evaluation
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        {playerName} · {season} · {level}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-[#12243a] p-5">
          <h3 className="text-lg font-semibold text-green-400">
            Statistical Observations
          </h3>

          <ul className="mt-4 space-y-3 text-slate-300">
            {observations.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-[#12243a] p-5">
          <h3 className="text-lg font-semibold text-amber-400">
            Areas to Evaluate
          </h3>

          <ul className="mt-4 space-y-3 text-slate-300">
            {areasToEvaluate.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Preliminary statistical evaluation using available minor-league
        data. These observations are not league-adjusted scouting grades
        or predictions of MLB performance.
      </p>
    </section>
  );
}
