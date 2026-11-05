import type { MetadataRoute } from "next";

const BASE_URL = "https://diamondiq-nine.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
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

  return pages.map((page) => ({
    url: `${BASE_URL}${page}`,
  }));
}
