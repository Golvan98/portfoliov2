"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Home, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function TopNavbar() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  function handleSignOut() {
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      setUser(null)
      router.push("/")
    })
  }

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "?"

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "User"

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Avatar className="size-8">
                <AvatarImage
                  src={user?.user_metadata?.avatar_url}
                  alt={displayName}
                />
                <AvatarFallback className="bg-[#7c3aed] text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground dark:text-white sm:inline">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
