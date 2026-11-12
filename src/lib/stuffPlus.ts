import { readFile } from "node:fs/promises";
import path from "node:path";

export type StuffPlusRecord = {
  pitcher: number;
  pitches: number;
  predicted_rv: number;
  stuff_plus: number;
};

const SUPPORTED_SEASONS = [2024, 2025, 2026];

export async function getPitcherStuffPlus(
  season: number
): Promise<Map<number, StuffPlusRecord>> {
  if (!SUPPORTED_SEASONS.includes(season)) {
    return new Map();
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "stuff-plus",
    `pitcher_stuff_plus_${season}.csv`
  );

  const csv = await readFile(filePath, "utf8");
  const lines = csv.trim().split(/\r?\n/);

  const records = new Map<number, StuffPlusRecord>();

  for (const line of lines.slice(1)) {
    const [pitcher, pitches, predictedRV, stuffPlus] =
      line.split(",");

    const record: StuffPlusRecord = {
      pitcher: Number(pitcher),
      pitches: Number(pitches),
      predicted_rv: Number(predictedRV),
      stuff_plus: Number(stuffPlus),
    };

    if (
      Number.isFinite(record.pitcher) &&
      Number.isFinite(record.stuff_plus)
    ) {
      records.set(record.pitcher, record);
    }
  }

  return records;
}


export type PitchTypeStuffPlusRecord = {
  pitcher: number;
  pitch_type: string;
  pitches: number;
  predicted_rv: number;
  stuff_plus: number;
};

export async function getPitchTypeStuffPlus(
  season: number
): Promise<Map<number, PitchTypeStuffPlusRecord[]>> {
  if (!SUPPORTED_SEASONS.includes(season)) {
    return new Map();
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "stuff-plus",
    `pitch_type_stuff_plus_${season}.csv`
  );

  const csv = await readFile(filePath, "utf8");
  const lines = csv.trim().split(/\r?\n/);

  const records = new Map<number, PitchTypeStuffPlusRecord[]>();

  for (const line of lines.slice(1)) {
    const [pitcher, pitchType, pitches, predictedRV, stuffPlus] =
      line.split(",");

    const record: PitchTypeStuffPlusRecord = {
      pitcher: Number(pitcher),
      pitch_type: pitchType,
      pitches: Number(pitches),
      predicted_rv: Number(predictedRV),
      stuff_plus: Number(stuffPlus),
    };

    if (
      !Number.isFinite(record.pitcher) ||
      !Number.isFinite(record.pitches) ||
      !Number.isFinite(record.stuff_plus) ||
      !record.pitch_type
    ) {
      continue;
    }

    const pitcherRecords = records.get(record.pitcher) ?? [];
    pitcherRecords.push(record);
    records.set(record.pitcher, pitcherRecords);
  }

  return records;
}
