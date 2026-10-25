"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ChartColumn, ArrowLeftRight, ChartNoAxesCombined, Menu } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: House },
  { label: "Stats", href: "/stats", icon: ChartColumn },
  { label: "Compare", href: "/compare", icon: ArrowLeftRight },
  { label: "Trends", href: "/trends", icon: ChartNoAxesCombined },
  { label: "More", href: "/more", icon: Menu },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0d1d30] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors ${
                active ? "text-blue-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}