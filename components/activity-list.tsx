"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  create: "bg-[#7c3aed]",
  update: "bg-blue-500",
  delete: "bg-red-500",
}

const actionVerbs: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
}

interface ActivityListProps {
  initialActivities: ActivityRow[]
}

export function ActivityList({ initialActivities }: ActivityListProps) {
  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities)
  const [hasMore, setHasMore] = useState(initialActivities.length === 20)
  const [loading, setLoading] = useState(false)

  // Re-render timestamps every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadMore() {
    if (loading || activities.length === 0) return
    setLoading(true)

    const lastItem = activities[activities.length - 1]
    const { data } = await createClient()
      .from("public_activity")
      .select("id, action, entity_type, entity_title, created_at")
      .order("created_at", { ascending: false })
      .lt("created_at", lastItem.created_at)
      .limit(20)

    if (data) {
      setActivities((prev) => [...prev, ...data])
      setHasMore(data.length === 20)
    } else {
      setHasMore(false)
    }
    setLoading(false)
  }

  if (activities.length === 0) {
    return (
      <div className="mt-10 py-12 text-center">
        <p className="text-muted-foreground">No activity yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="mt-10 flex flex-col">
        {activities.map((item, i) => (
          <div key={item.id}>
            <div className="flex items-start justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dotColors[item.action] ?? "bg-[#7c3aed]"}`}
                />
                <p className="text-sm leading-snug text-foreground sm:text-base">
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
              <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                {timeAgo(item.created_at)}
              </span>
            </div>
            {i < activities.length - 1 && (
              <div className="h-px w-full bg-border" />
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            className="rounded-full border-border text-foreground hover:bg-muted dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </>
  )
}
