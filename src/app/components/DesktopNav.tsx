"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const primaryLinks = [
  { label: "Rosters", href: "/rosters" },
  { label: "MLB Stats", href: "/stats" },
  { label: "Player Trends", href: "/trends" },
  { label: "Compare", href: "/compare" },
];

const toolGroups = [
  {
    title: "Front Office",
    links: [
      { label: "Front Office", href: "/front-office" },
      { label: "Team Needs", href: "/team-needs" },
      { label: "Roster Constructor", href: "/roster-constructor" },
      { label: "Lineup Optimizer", href: "/lineup-optimizer" },
    ],
  },
  {
    title: "Trades & Free Agency",
    links: [
      { label: "Trade Analyzer", href: "/trade-analyzer" },
      { label: "Trade Target Finder", href: "/trade-target-finder" },
      { label: "Free Agency", href: "/free-agency" },
    ],
  },
  {
    title: "Scouting",
    links: [
      { label: "Scouting", href: "/scouting" },
      { label: "Pitcher Stuff+ Lab", href: "/stuff-plus" },
      { label: "Prospect Development Hub", href: "/prospects" },
    ],
  },
  {
    title: "Research",
    links: [
      { label: "Research", href: "/research" },
      { label: "MLB Leaderboards", href: "/leaderboards" },
      { label: "2027 Player Projections", href: "/projections" },
      { label: "Breakout & Regression Predictor", href: "/breakout-regression" },
    ],
  },
];

const toolLinks = toolGroups.flatMap((group) => group.links);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DesktopNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep server and initial client rendering consistent.
  const activePathname = mounted ? pathname : "";
  const toolsActive = toolLinks.some((item) =>
    isActive(activePathname, item.href)
  );

  const linkClass = (href: string) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive(activePathname, href)
        ? "bg-blue-500/10 font-semibold text-blue-400"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <nav className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-3">
      <Link
        href="/"
        aria-label="DiamondIQ home"
        className="flex shrink-0 items-center"
      >
        <img
          src="/diamondiq-logo.png"
          alt="DiamondIQ Baseball Analytics"
          className="h-auto w-36"
        />
      </Link>

      <div className="col-start-2 flex items-center gap-2">
        {primaryLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activePathname === item.href ? "page" : undefined}
            className={linkClass(item.href)}
          >
            {item.label}
          </Link>
        ))}

        <div className="relative">
          <button
            type="button"
            aria-expanded={toolsOpen}
            aria-haspopup="true"
            onClick={() => setToolsOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setToolsOpen(false);
            }}
            className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
              toolsActive
                ? "bg-blue-500/10 font-semibold text-blue-400"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Tools
            <ChevronDown
              size={15}
              className={`transition-transform ${toolsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {toolsOpen && (
            <>
              <button
                type="button"
                aria-label="Close tools menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setToolsOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-[520px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#102238] p-4 shadow-2xl">
                <p className="mb-3 px-2 text-sm font-semibold text-white">
                  DiamondIQ Tools
                </p>

                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                  {toolGroups.map((group) => (
                    <div key={group.title}>
                      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
                        {group.title}
                      </p>
                      <div className="space-y-1">
                        {group.links.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setToolsOpen(false)}
                            aria-current={isActive(activePathname, item.href) ? "page" : undefined}
                            className={`block rounded-lg px-2 py-2 text-sm transition-colors ${
                              isActive(activePathname, item.href)
                                ? "bg-blue-500/10 font-semibold text-blue-400"
                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-white/10 pt-3">
                  <Link
                    href="/more"
                    onClick={() => setToolsOpen(false)}
                    className="block rounded-lg px-2 py-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-white/5"
                  >
                    View All Tools →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <Link
          href="/about"
          aria-current={activePathname === "/about" ? "page" : undefined}
          className={linkClass("/about")}
        >
          About Me
        </Link>
      </div>
    </nav>
  );
}
