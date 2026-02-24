"use client"

import Link from "next/link"
import { Home } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function TopNavbar() {
  return (
    <nav className="flex h-14 shrink-0 items-center justify-between border-b border-[#f3f4f6] bg-[#ffffff]/80 px-5 backdrop-blur-xl dark:border-white/8 dark:bg-[#080810]/90">
      {/* Left: logo */}
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-bold tracking-tight text-foreground dark:text-white">
          MyHeadSpace
        </span>
        <span className="text-lg font-bold text-[#7c3aed]">.</span>
      </div>

      {/* Right: home link + theme toggle + user avatar */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#f3f4f6] hover:text-foreground dark:hover:bg-white/5 dark:hover:text-white"
          aria-label="Back to portfolio"
        >
          <Home className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-semibold text-white">
            GZ
          </div>
          <span className="hidden text-sm font-medium text-foreground dark:text-white sm:inline">
            Gilvin
          </span>
        </div>
      </div>
    </nav>
  )
}
