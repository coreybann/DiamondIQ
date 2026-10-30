

export type LineupHitter = {
  id: number;
  name: string;
  obp: number;
  slg: number;

  avg?: number;
  plateAppearances?: number;
  atBats?: number;
  hits?: number;
  doubles?: number;
  triples?: number;
  homeRuns?: number;
  walks?: number;
  hitByPitch?: number;
  strikeouts?: number;
  stolenBases?: number;
  groundIntoDoublePlay?: number;
  sacFlies?: number;
};


export function hitterScore(hitter: LineupHitter): number {
  return 1.8 * hitter.obp + hitter.slg;
}

export function recommendLineup(
  hitters: LineupHitter[]
): LineupHitter[] {
  if (hitters.length !== 9) {
    return [];
  }

  const ranked = [...hitters].sort(
    (a, b) => hitterScore(b) - hitterScore(a)
  );

  const lineup: Array<LineupHitter | null> =
    Array(9).fill(null);

  const positions = [1, 3, 0, 2, 4, 5, 6, 7, 8];

  ranked.forEach((hitter, index) => {
    lineup[positions[index]] = hitter;
  });

  return lineup.filter(
    (hitter): hitter is LineupHitter => hitter !== null
  );
}
