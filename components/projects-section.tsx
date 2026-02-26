import { ProjectCard, type ProjectData } from "@/components/project-card"
import { Separator } from "@/components/ui/separator"

const projects: ProjectData[] = [
  {
    title: "ClipNET",
    tag: "AI \u00b7 Video Intelligence",
    tagLabel: "AI \u00b7 Video Intelligence",
    accent: "#7c3aed",
    bgTint: "#f5f3ff",
    description:
      "An end-to-end video pipeline that ingests raw footage, runs object detection and scene segmentation, and surfaces highlights through a clean web dashboard.",
    techStack: ["Python", "FastAPI", "React", "PostgreSQL", "OpenCV"],
  },
  {
    title: "StudySpring",
    tag: "EdTech \u00b7 SaaS",
    tagLabel: "EdTech \u00b7 SaaS",
    accent: "#0ea5e9",
    bgTint: "#f0f9ff",
    description:
      "A spaced repetition study platform with adaptive scheduling, progress analytics, and collaborative decks built around retention science.",
    techStack: ["Next.js", "Supabase", "Tailwind", "TypeScript"],
  },
  {
    title: "MyHeadSpace",
    tag: "Productivity \u00b7 Full-stack",
    tagLabel: "Productivity \u00b7 Full-stack",
    accent: "#7c3aed",
    bgTint: "#faf5ff",
    description:
      "A private workspace for managing projects, tasks, and notes \u2014 the operational core of this portfolio. Every action is publicly logged so visitors see real, ongoing work.",
    techStack: ["Next.js", "Supabase", "pgvector", "OpenAI"],
    demoUrl: "https://portfoliov2-three-liard.vercel.app/myheadspace",
  },
]

export function ProjectsSection() {
  return (
    <section id="projects" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-10 flex items-center gap-4">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Projects
          </h2>
          <Separator className="flex-1" />
          <span className="shrink-0 text-sm text-muted-foreground">
            {projects.length} case studies
          </span>
        </div>

        {/* Project cards */}
        <div className="flex flex-col gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </div>
    </section>
  )
}
