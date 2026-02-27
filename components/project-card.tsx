import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Code } from "lucide-react"

export interface ProjectData {
  title: string
  tag: string
  tagLabel: string
  accent: string
  bgTint: string
  description: string
  techStack: string[]
  demoUrl?: string
  codeUrl?: string
}

const accentMap: Record<string, { badge: string; button: string; preview: string; text: string }> = {
  "#7c3aed": {
    badge: "bg-[#f5f3ff] text-[#7c3aed] border-[#7c3aed]/20 dark:bg-[#7c3aed]/10 dark:text-[#a78bfa] dark:border-[#7c3aed]/30",
    button: "bg-[#7c3aed] hover:bg-[#7c3aed]/90 text-white",
    preview: "bg-[#f5f3ff] dark:bg-[#7c3aed]/10",
    text: "text-[#7c3aed] dark:text-[#a78bfa]",
  },
  "#0ea5e9": {
    badge: "bg-[#f0f9ff] text-[#0ea5e9] border-[#0ea5e9]/20 dark:bg-[#0ea5e9]/10 dark:text-[#38bdf8] dark:border-[#0ea5e9]/30",
    button: "bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white",
    preview: "bg-[#f0f9ff] dark:bg-[#0ea5e9]/10",
    text: "text-[#0ea5e9] dark:text-[#38bdf8]",
  },
  "#d97706": {
    badge: "bg-[#fffbeb] text-[#d97706] border-[#d97706]/20 dark:bg-[#d97706]/10 dark:text-[#fbbf24] dark:border-[#d97706]/30",
    button: "bg-[#d97706] hover:bg-[#d97706]/90 text-white",
    preview: "bg-[#fffbeb] dark:bg-[#d97706]/10",
    text: "text-[#d97706] dark:text-[#fbbf24]",
  },
}

export function ProjectCard({ project }: { project: ProjectData }) {
  const colors = accentMap[project.accent] || accentMap["#7c3aed"]

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/8 dark:bg-[#0d0d18] dark:shadow-none dark:hover:border-white/12">
      <div className="grid md:grid-cols-[300px_1fr]">
        {/* Preview panel */}
        <div
          className={`relative flex flex-col items-center justify-center gap-3 p-8 ${colors.preview}`}
        >
          {/* Dot pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <h3
            className={`relative z-10 text-center font-display text-2xl font-extrabold tracking-tight ${colors.text}`}
          >
            {project.title}
          </h3>
          <span className="relative z-10 text-xs font-medium text-muted-foreground">
            {project.tagLabel}
          </span>
        </div>

        {/* Content panel */}
        <div className="flex flex-col gap-4 p-6 lg:p-8 dark:bg-[#0d0d18]">
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={`rounded-full border px-3 py-1 text-xs font-medium ${colors.badge}`}
            >
              {project.tag}
            </Badge>
          </div>

          <h3 className="font-display text-xl font-bold tracking-tight text-foreground dark:text-white">
            {project.title}
          </h3>

          <p className="leading-relaxed text-muted-foreground dark:text-slate-300">
            {project.description}
          </p>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech) => (
              <Badge
                key={tech}
                variant="secondary"
                className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
              >
                {tech}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="sm"
              className={`rounded-full ${colors.button}`}
              asChild={!!project.demoUrl}
              disabled={!project.demoUrl}
            >
              {project.demoUrl ? (
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                  Test it out
                  <ArrowRight className="size-3.5" />
                </a>
              ) : (
                <span>
                  Test it out
                  <ArrowRight className="size-3.5" />
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-border text-foreground hover:bg-muted dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              asChild={!!project.codeUrl}
              disabled={!project.codeUrl}
            >
              {project.codeUrl ? (
                <a href={project.codeUrl} target="_blank" rel="noopener noreferrer">
                  <Code className="size-3.5" />
                  View code
                </a>
              ) : (
                <span>
                  <Code className="size-3.5" />
                  View code
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
