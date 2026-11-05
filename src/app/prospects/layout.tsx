import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MLB Prospect Rankings & Evaluation | DiamondIQ",
  description:
    "Explore MLB prospect rankings, minor-league leaderboards, player development, and statistical evaluations across all 30 organizations with DiamondIQ.",

  openGraph: {
    title: "MLB Prospect Rankings & Evaluation | DiamondIQ",
    description:
      "Discover MLB prospects, compare minor-league performance, and explore statistical prospect evaluations across all 30 organizations.",
    url: "https://diamondiq-nine.vercel.app/prospects",
    siteName: "DiamondIQ",
    type: "website",
  },
};


import type { ReactNode } from "react";

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
