"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ActivityFeed } from "@/components/activity-feed"
import { ArrowDown, Sparkles } from "lucide-react"

const techStack = [
  "Next.js",
  "Supabase",
  "Gemini",
  "Python",
  "TypeScript",
  "pgvector",
]

export function Hero() {
  return (
    <section className="relative px-6 pt-28 pb-20 lg:pt-32">
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[1fr_420px]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Status pill */}
          <div className="flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 dark:border-white/10 dark:bg-white/5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-medium text-accent-foreground dark:text-white">
                {"Open to work \u00b7 Full-stack & AI"}
              </span>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-[54px] lg:leading-[1.1]">
              {"Hello, I'm"}
              <br />
              <span className="text-primary">Gilvin Zalsos.</span>
            </h1>
          </div>

          {/* Description */}
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
            {
              "I build full-stack products \u2014 from AI pipelines to polished web apps. This portfolio runs live: every project and task you see reflects real, ongoing work."
            }
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <a href="#projects">
                View Projects
                <ArrowDown className="size-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-border text-foreground hover:bg-muted dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              onClick={() => window.dispatchEvent(new CustomEvent("open-chat-widget"))}
            >
              <Sparkles className="size-4" />
              Chat with portfolio
            </Button>
          </div>

          {/* Tech tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {techStack.map((tech) => (
              <Badge
                key={tech}
                variant="secondary"
                className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
              >
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        {/* Right column: Activity Feed */}
        <div className="w-full lg:mt-4">
          <ActivityFeed />
        </div>
      </div>
    </section>
  )
}
