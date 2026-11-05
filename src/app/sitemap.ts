import type { MetadataRoute } from "next";

const BASE_URL = "https://diamondiq-nine.vercel.app";

export const revalidate = 86400;

const pages = [
  "",
  "/about",
  "/compare",
  "/trends",
  "/stats",
  "/rosters",
  "/scouting",
  "/prospects",
  "/free-agency",
  "/front-office",
  "/team-needs",
  "/trade-analyzer",
  "/trade-target-finder",
  "/lineup-optimizer",
  "/roster-constructor",
  "/research",
  "/more",
  "/free-agency/rankings",
  "/free-agency/contracts",
  "/free-agency/team-fit",
];

type MLBPlayer = {
  id: number;
  active?: boolean;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${BASE_URL}${page}`,
  }));

  try {
    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/sports/1/players?season=2026",
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return staticPages;

    const data = await response.json();
    const players: MLBPlayer[] = data.people ?? [];

    const playerPages: MetadataRoute.Sitemap = players
      .filter(
        (player) =>
          player.active === true &&
          Number.isInteger(player.id) &&
          player.id > 0
      )
      .map((player) => ({
        url: `${BASE_URL}/players/${player.id}`,
      }));

    return [...staticPages, ...playerPages];
  } catch {
    return staticPages;
  }
}
