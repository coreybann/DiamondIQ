"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const primaryLinks = [
  { label: "MLB Stats", href: "/stats" },
  { label: "Player Trends", href: "/trends" },
  { label: "Compare", href: "/compare" },
];

const toolLinks = [
  { label: "Scouting", href: "/scouting" },
  { label: "Front Office", href: "/front-office" },
  { label: "Trade Analyzer", href: "/trade-analyzer" },
  { label: "Free Agency", href: "/free-agency" },
  { label: "Research", href: "/research" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DesktopNav() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsActive = toolLinks.some((item) =>
    isActive(pathname, item.href)
  );

  const linkClass = (href: string) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive(pathname, href)
        ? "bg-blue-500/10 font-semibold text-blue-400"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <nav className="mx-auto hidden w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 md:flex">
      <Link
        href="/"
        aria-label="DiamondIQ home"
        className="flex shrink-0 items-center"
      >
        <img
          src="/diamondiq-logo.png"
          alt="DiamondIQ Baseball Analytics"
          className="h-auto w-28"
        />
      </Link>

      <div className="flex items-center gap-1">
        {primaryLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
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
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#102238] p-2 shadow-2xl">
                {toolLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setToolsOpen(false)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive(pathname, item.href)
                        ? "bg-blue-500/10 font-semibold text-blue-400"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <Link
          href="/about"
          aria-current={pathname === "/about" ? "page" : undefined}
          className={linkClass("/about")}
        >
          About Me
        </Link>
      </div>
    </nav>
  );
}
