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
      "A startup-built MVP for content creators and streamers. Feed it raw footage and ClipNET automatically detects highlight moments, surfacing the best clips through a clean web dashboard powered by object detection and scene segmentation.",
    techStack: ["Python", "FastAPI", "FFmpeg", "React", "PostgreSQL", "Docker", "OpenCV", "Redis", "Whisper", "Cloudflare", "Cloudflare R2 (S3)", "Next.js"],
    demoUrl: "https://clipnet.ai/",
    codeLabel: "Private repo",
    buttonLabel: "Visit website",
  },
  {
    title: "StudySpring",
    tag: "EdTech \u00b7 SaaS",
    tagLabel: "EdTech \u00b7 SaaS",
    accent: "#0ea5e9",
    bgTint: "#f0f9ff",
    description:
      "A client-commissioned study platform built for self-learners who want to retain more, faster. StudySpring uses spaced repetition and adaptive scheduling to serve the right content at the right time, with progress analytics to keep learners on track.",
    techStack: ["Next.js", "Supabase", "Tailwind", "TypeScript"],
    demoUrl: "https://ai-study-buddy-chi-murex.vercel.app/",
    codeUrl: "https://github.com/Golvan98/ai-study-buddy",
    buttonLabel: "Visit website",
  },
  {
    title: "MyHeadSpace 2.0",
    tag: "Productivity \u00b7 Full-stack",
    tagLabel: "Productivity \u00b7 Full-stack",
    accent: "#7c3aed",
    bgTint: "#faf5ff",
    description:
      "A private workspace for managing projects, tasks, and notes, serving as the operational core of this portfolio. Every action is publicly logged so visitors see real, ongoing work.",
    techStack: ["Next.js", "Supabase", "pgvector", "Gemini"],
    demoUrl: "https://portfoliov2-three-liard.vercel.app/myheadspace",
    codeUrl: "https://github.com/Golvan98/portfoliov2",
    buttonLabel: "Visit website",
  },
  {
    title: "MyHeadSpace v1.0",
    tag: "Productivity \u00b7 Full-stack",
    tagLabel: "Productivity \u00b7 Full-stack",
    accent: "#10b981",
    bgTint: "#ecfdf5",
    description:
      "The original MyHeadSpace, a personal productivity app for managing projects and tasks in real time. Built entirely by hand during my transition from web administrator to web developer, without AI assistance.",
    techStack: ["React", "Firebase", "Tailwind CSS", "Vite", "React Router"],
    demoUrl: "https://gilvin-profile.vercel.app/",
    codeUrl: "https://github.com/Golvan98/gilvin-profile",
    buttonLabel: "Visit website",
  },
  {
    title: "Automated Needs Assessment Survey",
    tag: "Health \u00b7 Academic",
    tagLabel: "Health \u00b7 Academic",
    accent: "#d97706",
    bgTint: "#fffbeb",
    description:
      "A mental health survey questionnaire system built for Mindanao State University that automated school counselors\u2019 needs assessments. Collected student inputs via multi-page survey forms and visualized demographic insights through pie charts and graphs for guidance counselors.",
    techStack: ["PHP", "MySQL", "JavaScript", "HTML/CSS", "Laravel"],
    codeUrl: "https://github.com/Golvan98/NAS",
    buttonLabel: "Coming soon",
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
