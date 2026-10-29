
import type { LineupHitter } from "./lineupOptimizer";

export type HitterProbabilities = {
  single: number;
  double: number;
  triple: number;
  homeRun: number;
  walk: number;
  out: number;
};

export function calculateHitterProbabilities(
  hitter: LineupHitter
): HitterProbabilities | null {
  const pa = hitter.plateAppearances ?? 0;
  const hits = hitter.hits ?? 0;
  const doubles = hitter.doubles ?? 0;
  const triples = hitter.triples ?? 0;
  const homeRuns = hitter.homeRuns ?? 0;
  const walks = hitter.walks ?? 0;
  const hbp = hitter.hitByPitch ?? 0;

  if (pa <= 0) return null;

  const singles = hits - doubles - triples - homeRuns;
  const onBaseEvents = hits + walks + hbp;
  const outs = pa - onBaseEvents;

  const counts = [
    singles,
    doubles,
    triples,
    homeRuns,
    walks + hbp,
    outs,
  ];

  if (
    counts.some((count) => !Number.isFinite(count) || count < 0)
  ) {
    return null;
  }

  return {
    single: singles / pa,
    double: doubles / pa,
    triple: triples / pa,
    homeRun: homeRuns / pa,
    walk: (walks + hbp) / pa,
    out: outs / pa,
  };
}

type Bases = {
  first: boolean;
  second: boolean;
  third: boolean;
};

export type PlateAppearanceOutcome = keyof HitterProbabilities;

export function applyPlateAppearance(
  bases: Bases,
  outcome: PlateAppearanceOutcome
): {
  bases: Bases;
  runs: number;
  outs: number;
} {
  const next = { ...bases };
  let runs = 0;

  switch (outcome) {
    case "walk": {
      if (bases.first && bases.second && bases.third) runs++;

      next.third =
        bases.third || (bases.second && bases.first);
      next.second =
        bases.second || bases.first;
      next.first = true;
      break;
    }

    case "single": {
      runs = bases.third ? 1 : 0;
      next.third = bases.second;
      next.second = bases.first;
      next.first = true;
      break;
    }

    case "double": {
      runs =
        Number(bases.third) +
        Number(bases.second);

      next.third = bases.first;
      next.second = true;
      next.first = false;
      break;
    }

    case "triple": {
      runs =
        Number(bases.first) +
        Number(bases.second) +
        Number(bases.third);

      next.first = false;
      next.second = false;
      next.third = true;
      break;
    }

    case "homeRun": {
      runs =
        1 +
        Number(bases.first) +
        Number(bases.second) +
        Number(bases.third);

      next.first = false;
      next.second = false;
      next.third = false;
      break;
    }

    case "out":
      return { bases: next, runs: 0, outs: 1 };
  }

  return { bases: next, runs, outs: 0 };
}

function sampleOutcome(
  probabilities: HitterProbabilities,
  random: () => number = Math.random
): PlateAppearanceOutcome {
  const roll = random();
  let cumulative = 0;

  const outcomes: PlateAppearanceOutcome[] = [
    "single",
    "double",
    "triple",
    "homeRun",
    "walk",
    "out",
  ];

  for (const outcome of outcomes) {
    cumulative += probabilities[outcome];

    if (roll < cumulative) {
      return outcome;
    }
  }

  return "out";
}

export function simulateNineInnings(
  hitters: LineupHitter[],
  random: () => number = Math.random
): number | null {
  if (hitters.length !== 9) return null;

  const probabilities = hitters.map(
    calculateHitterProbabilities
  );

  if (probabilities.some((value) => value === null)) {
    return null;
  }

  const validProbabilities =
    probabilities as HitterProbabilities[];

  let runs = 0;
  let battingIndex = 0;

  for (let inning = 0; inning < 9; inning++) {
    let outs = 0;

    let bases: Bases = {
      first: false,
      second: false,
      third: false,
    };

    let plateAppearances = 0;

    while (outs < 3 && plateAppearances < 100) {
      const hitter = validProbabilities[battingIndex];

      const outcome = sampleOutcome(hitter, random);

      const result = applyPlateAppearance(bases, outcome);

      bases = result.bases;
      runs += result.runs;
      outs += result.outs;

      battingIndex = (battingIndex + 1) % 9;
      plateAppearances++;
    }
  }

  return runs;
}

export function estimateRunsPerGame(
  hitters: LineupHitter[],
  simulations = 5000,
  seed = 12345
): number | null {
  if (
    hitters.length !== 9 ||
    !Number.isInteger(simulations) ||
    simulations < 1
  ) {
    return null;
  }

  let totalRuns = 0;
const random = createSeededRandom(seed);
  for (let i = 0; i < simulations; i++) {
const runs = simulateNineInnings(hitters, random);

    if (runs === null) {
      return null;
    }

    totalRuns += runs;
  }

  return totalRuns / simulations;
}
export function shuffleLineup<T>(players: T[]): T[] {
  const shuffled = [...players];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}


export function findBestSimulatedLineup(
  hitters: LineupHitter[],
  candidates = 100,
  simulationsPerCandidate = 200
): LineupHitter[] {
  if (hitters.length !== 9) return [];

  const testedLineups: {
    lineup: LineupHitter[];
    score: number;
  }[] = [];

  for (let i = 0; i < candidates; i++) {
    const candidate =
      i === 0 ? [...hitters] : shuffleLineup(hitters);

    const score = estimateRunsPerGame(
      candidate,
      simulationsPerCandidate
    );

    if (score === null) return [];

    testedLineups.push({
      lineup: candidate,
      score,
    });
  }

  testedLineups.sort((a, b) => b.score - a.score);

const finalists = [
  { lineup: [...hitters], score: 0 },
  ...testedLineups.slice(0, 10),
];

  let bestLineup = finalists[0].lineup;
  let bestScore = -Infinity;

  for (const finalist of finalists) {
    const score = estimateRunsPerGame(
      finalist.lineup,
      5000
    );

    if (score !== null && score > bestScore) {
      bestScore = score;
      bestLineup = finalist.lineup;
    }
  }

  return bestLineup;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
