import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getPitcherStuffPlus,
  getPitchTypeStuffPlus,
} from "@/lib/stuffPlus";

const SUPPORTED_SEASONS = [2024, 2025, 2026];

export async function GET(request: NextRequest) {
  const pitcherParam = request.nextUrl.searchParams.get("pitcher");
  const seasonParam = request.nextUrl.searchParams.get("season");

  const pitcher = Number(pitcherParam);
  const season = Number(seasonParam);

  if (
    !pitcherParam ||
    !Number.isSafeInteger(pitcher) ||
    pitcher <= 0 ||
    !seasonParam ||
    !SUPPORTED_SEASONS.includes(season)
  ) {
    return NextResponse.json(
      { error: "Invalid pitcher or season" },
      { status: 400 }
    );
  }

  try {
    const [pitcherRatings, pitchTypeRatings] = await Promise.all([
      getPitcherStuffPlus(season),
      getPitchTypeStuffPlus(season),
    ]);

    const overall = pitcherRatings.get(pitcher) ?? null;

    const metricsPath = path.join(
      process.cwd(),
      "public",
      "data",
      "stuff-plus",
      `arsenal_metrics_${season}.csv`
    );

    const metricsCSV = await readFile(metricsPath, "utf8");
    const metricsLines = metricsCSV.trim().split(/\r?\n/);

    const metrics = new Map<
      string,
      {
        metrics_pitches: number;
        avg_velocity: number;
        avg_spin: number;
        avg_h_break: number;
        avg_v_break: number;
      }
    >();

    for (const line of metricsLines.slice(1)) {
      const [
        pitcherId,
        pitchType,
        pitchCount,
        velocity,
        spin,
        horizontal,
        vertical,
      ] = line.split(",");

      if (Number(pitcherId) !== pitcher) continue;

      metrics.set(pitchType, {
        metrics_pitches: Number(pitchCount),
        avg_velocity: Number(velocity),
        avg_spin: Number(spin),
        avg_h_break: Number(horizontal),
        avg_v_break: Number(vertical),
      });
    }

    const pitches = (pitchTypeRatings.get(pitcher) ?? [])
      .map((pitch) => ({
        ...pitch,
        metrics_pitches:
          metrics.get(pitch.pitch_type)?.metrics_pitches ?? null,
        avg_velocity:
          metrics.get(pitch.pitch_type)?.avg_velocity ?? null,
        avg_spin:
          metrics.get(pitch.pitch_type)?.avg_spin ?? null,
        avg_h_break:
          metrics.get(pitch.pitch_type)?.avg_h_break ?? null,
        avg_v_break:
          metrics.get(pitch.pitch_type)?.avg_v_break ?? null,
      }))
      .sort((a, b) => b.pitches - a.pitches);

    return NextResponse.json({
      pitcher,
      season,
      overall,
      pitches,
    });
  } catch (error) {
    console.error("Stuff+ API error:", error);

    return NextResponse.json(
      { error: "Unable to load Stuff+ ratings" },
      { status: 500 }
    );
  }
}
