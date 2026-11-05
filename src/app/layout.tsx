import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MobileNav from "./components/MobileNav";
import DesktopNav from "./components/DesktopNav";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://diamondiq-nine.vercel.app"),

  title: "DiamondIQ | MLB Baseball Analytics, Scouting & Player Evaluation",

  description:
    "Explore MLB baseball analytics with DiamondIQ. Compare players, evaluate prospects, analyze team rosters, research free agents, and explore front office decision-making tools.",

  keywords: [
    "MLB analytics",
    "baseball analytics",
    "MLB player statistics",
    "baseball scouting",
    "prospect evaluation",
    "MLB player comparisons",
    "baseball front office",
    "MLB roster construction",
    "baseball research",
  ],

  icons: {
    icon: "/diamondiq-logo.png",
    shortcut: "/diamondiq-logo.png",
  },

  openGraph: {
    title: "DiamondIQ | MLB Baseball Analytics & Scouting",
    description:
      "Explore MLB statistics, player evaluations, prospect rankings, roster construction, and baseball front office analytics.",
    url: "https://diamondiq-nine.vercel.app",
    siteName: "DiamondIQ",
    images: [
      {
        url: "/diamondiq-logo.png",
        alt: "DiamondIQ Baseball Analytics",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "DiamondIQ | MLB Baseball Analytics & Scouting",
    description:
      "MLB statistics, player evaluations, prospect rankings, and baseball front office analytics.",
    images: ["/diamondiq-logo.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#081321] text-white">
<header className="desktop-header sticky top-0 z-40 border-b border-white/10 bg-[#0d1d30]/95 backdrop-blur-md">  <DesktopNav />
</header>

  <div className="flex-1 pb-24 md:pb-0">
  {children}
</div>

<MobileNav />

</body>
    </html>
  );
}
