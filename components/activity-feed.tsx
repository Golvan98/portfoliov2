"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

type ActivityType = "create" | "update" | "done" | "note"

interface ActivityItem {
  id: number
  type: ActivityType
  action: string
  target: string
  timestamp: string
}

const dotColors: Record<ActivityType, string> = {
  create: "bg-primary",
  update: "bg-blue-500",
  done: "bg-green-500",
  note: "bg-amber-500",
}

const initialActivities: ActivityItem[] = [
  {
    id: 1,
    type: "create",
    action: "created",
    target: "Portfolio chat widget",
    timestamp: "2m ago",
  },
  {
    id: 2,
    type: "update",
    action: "updated",
    target: "ClipNET inference pipeline",
    timestamp: "15m ago",
  },
  {
    id: 3,
    type: "done",
    action: "completed",
    target: "Supabase RLS policies",
    timestamp: "1h ago",
  },
  {
    id: 4,
    type: "note",
    action: "noted",
    target: "pgvector embedding strategy",
    timestamp: "3h ago",
  },
  {
    id: 5,
    type: "create",
    action: "started",
    target: "StudySpring analytics module",
    timestamp: "5h ago",
  },
]

const extraActivities: Omit<ActivityItem, "id" | "timestamp">[] = [
  { type: "update", action: "pushed to", target: "main branch" },
  { type: "done", action: "deployed", target: "portfolio v2.1" },
  { type: "create", action: "created", target: "API rate limiter" },
  { type: "note", action: "reviewed", target: "FastAPI architecture" },
  { type: "update", action: "refactored", target: "auth middleware" },
]

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [idCounter, setIdCounter] = useState(6)

  const addActivity = useCallback(() => {
    const random = extraActivities[Math.floor(Math.random() * extraActivities.length)]
    const newItem: ActivityItem = {
      ...random,
      id: idCounter,
      timestamp: "just now",
    }
    setActivities((prev) => [newItem, ...prev.slice(0, 4)])
    setIdCounter((c) => c + 1)
  }, [idCounter])

  useEffect(() => {
    const interval = setInterval(addActivity, 7000)
    return () => clearInterval(interval)
  }, [addActivity])

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
      <div className="flex flex-col">
        {activities.map((item, i) => (
          <div key={item.id}>
            <div className="flex items-start justify-between gap-3 py-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${dotColors[item.type]}`}
                />
                <p className="text-sm leading-snug text-foreground">
                  <span className="font-medium">Gilvin</span>{" "}
                  <span className="text-muted-foreground">{item.action}</span>{" "}
                  <span className="font-medium">{`\u201c${item.target}\u201d`}</span>
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.timestamp}
              </span>
            </div>
            {i < activities.length - 1 && (
              <div className="h-px w-full bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Last active: 2 minutes ago
        </p>
      </div>
    </div>
  )
}
