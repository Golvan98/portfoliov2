"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { ChatWidget } from "@/components/chat-widget"

type ActivityType = "create" | "update" | "done" | "note"

interface ActivityItem {
  id: number
  type: ActivityType
  action: string
  target: string
  timestamp: string
}

const dotColors: Record<ActivityType, string> = {
  create: "bg-[#7c3aed]",
  update: "bg-blue-500",
  done: "bg-green-500",
  note: "bg-amber-500",
}

const allActivities: ActivityItem[] = [
  { id: 1, type: "create", action: "created", target: "Portfolio chat widget", timestamp: "2 minutes ago" },
  { id: 2, type: "update", action: "updated", target: "ClipNET inference pipeline", timestamp: "15 minutes ago" },
  { id: 3, type: "done", action: "completed", target: "Supabase RLS policies", timestamp: "1 hour ago" },
  { id: 4, type: "note", action: "noted", target: "pgvector embedding strategy", timestamp: "3 hours ago" },
  { id: 5, type: "create", action: "started", target: "StudySpring analytics module", timestamp: "5 hours ago" },
  { id: 6, type: "update", action: "pushed to", target: "main branch", timestamp: "8 hours ago" },
  { id: 7, type: "done", action: "deployed", target: "portfolio v2.1", timestamp: "12 hours ago" },
  { id: 8, type: "create", action: "created", target: "API rate limiter", timestamp: "1 day ago" },
  { id: 9, type: "note", action: "reviewed", target: "FastAPI architecture", timestamp: "1 day ago" },
  { id: 10, type: "update", action: "refactored", target: "auth middleware", timestamp: "2 days ago" },
  { id: 11, type: "done", action: "completed", target: "database migration scripts", timestamp: "2 days ago" },
  { id: 12, type: "create", action: "started", target: "MyHeadSpace v3 redesign", timestamp: "3 days ago" },
  { id: 13, type: "note", action: "documented", target: "API endpoints v2", timestamp: "3 days ago" },
  { id: 14, type: "update", action: "improved", target: "error handling patterns", timestamp: "4 days ago" },
  { id: 15, type: "done", action: "shipped", target: "dark mode support", timestamp: "5 days ago" },
  { id: 16, type: "create", action: "initialized", target: "CI/CD pipeline", timestamp: "6 days ago" },
  { id: 17, type: "note", action: "outlined", target: "Q1 project roadmap", timestamp: "1 week ago" },
  { id: 18, type: "update", action: "optimized", target: "image loading pipeline", timestamp: "1 week ago" },
  { id: 19, type: "done", action: "resolved", target: "memory leak in workers", timestamp: "1 week ago" },
  { id: 20, type: "create", action: "prototyped", target: "real-time collaboration", timestamp: "2 weeks ago" },
]

export default function NowPage() {
  const [visibleCount, setVisibleCount] = useState(10)
  const visible = allActivities.slice(0, visibleCount)

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 pt-28 pb-20">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {"What I'm up to"}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          A live log of everything I{"'"}m working on.
        </p>

        <div className="mt-10 flex flex-col">
          {visible.map((item, i) => (
            <div key={item.id}>
              <div className="flex items-start justify-between gap-4 py-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dotColors[item.type]}`}
                  />
                  <p className="text-sm leading-snug text-foreground sm:text-base">
                    <span className="font-medium">Gilvin</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    <span className="font-medium">{`\u201c${item.target}\u201d`}</span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                  {item.timestamp}
                </span>
              </div>
              {i < visible.length - 1 && (
                <div className="h-px w-full bg-border" />
              )}
            </div>
          ))}
        </div>

        {visibleCount < allActivities.length && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              className="rounded-full border-border text-foreground hover:bg-muted dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              onClick={() =>
                setVisibleCount((c) => Math.min(c + 10, allActivities.length))
              }
            >
              Load more
            </Button>
          </div>
        )}
      </div>

      <ChatWidget />
    </main>
  )
}
