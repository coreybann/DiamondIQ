import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MLB Free Agent Rankings, Contracts & Team Fit | DiamondIQ",
  description:
    "Explore MLB free agent rankings, contract projections, signing updates, player performance, and team fit analysis with DiamondIQ.",

  openGraph: {
    title: "MLB Free Agent Rankings & Contract Analysis | DiamondIQ",
    description:
      "Analyze MLB free agents, projected contracts, player value, and potential team fits with DiamondIQ.",
    url: "https://diamondiq-nine.vercel.app/free-agency",
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
