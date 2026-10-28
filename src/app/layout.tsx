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
  title: "DiamondIQ | Baseball Analytics & Scouting",
  description:
    "DiamondIQ is an interactive baseball analytics platform featuring MLB statistics, player comparisons, scouting reports, contract projections, and front office analysis.",
    icons: {
    icon: "/diamondiq-logo.png",
    shortcut: "/diamondiq-logo.png",
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
