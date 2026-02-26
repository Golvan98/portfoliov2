"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { timeAgo } from "@/lib/time-ago"

interface ActivityRow {
  id: string
  action: string
  entity_type: string
  entity_title: string
  created_at: string
}

const dotColors: Record<string, string> = {
  create: "bg-primary",
  update: "bg-blue-500",
  delete: "bg-red-500",
}

const actionVerbs: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch — last 3 per DECISIONS.md A2
    supabase
      .from("public_activity")
      .select("id, action, entity_type, entity_title, created_at")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setActivities(data ?? [])
        setLoaded(true)
      })

    // Realtime subscription on INSERTs
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "public_activity",
        },
        (payload) => {
          const newRow = payload.new as ActivityRow
          setActivities((prev) => [newRow, ...prev].slice(0, 3))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Re-render timestamps every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-[#f3f4f6] bg-[#fafafa] p-5 dark:border-white/8 dark:bg-[#0d0d18]">
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-semibold text-foreground">
            Live Activity
          </span>
        </div>
        <p className="py-6 text-center text-sm text-muted-foreground">
          Loading activity...
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#f3f4f6] bg-[#fafafa] p-5 dark:border-white/8 dark:bg-[#0d0d18]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-semibold text-foreground">
            Live Activity
          </span>
        </div>
        <Link
          href="/now"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See all
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Feed rows */}
      {activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No activity yet
        </p>
      ) : (
        <div className="flex flex-col">
          {activities.map((item, i) => (
            <div key={item.id}>
              <div className="flex items-start justify-between gap-3 py-3">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${dotColors[item.action] ?? "bg-primary"}`}
                  />
                  <p className="text-sm leading-snug text-foreground">
                    <span className="font-medium">Gilvin</span>{" "}
                    <span className="text-muted-foreground">
                      just {actionVerbs[item.action] ?? item.action}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {item.entity_type}:
                    </span>{" "}
                    <span className="font-medium">
                      {"\u201c"}
                      {item.entity_title}
                      {"\u201d"}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(item.created_at)}
                </span>
              </div>
              {i < activities.length - 1 && (
                <div className="h-px w-full bg-border" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          {activities.length > 0
            ? `Last active: ${timeAgo(activities[0].created_at)}`
            : "No recent activity"}
        </p>
      </div>
    </div>
  )
}
