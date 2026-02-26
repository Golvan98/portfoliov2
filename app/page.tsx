import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ProjectsSection } from "@/components/projects-section"
import { ChatWidget } from "@/components/chat-widget"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProjectsSection />

      {/* About */}
      <section id="about" className="px-6 py-20 dark:bg-[#080810]">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground dark:text-white sm:text-4xl">
            About
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground dark:text-slate-400">
            {"I\u2019m Gilvin Zalsos \u2014 a backend-focused builder from the Philippines with a strong ops + data foundation. I like working on the parts of software that make everything else feel smooth and reliable: APIs, background jobs, automation pipelines, and the systems that move data from \u2018messy input\u2019 to \u2018clean output.\u2019 My technical comfort zone is end-to-end backend execution \u2014 designing services, wiring integrations, handling storage, and making workflows observable and repeatable. If you want someone who can ship, debug, and systematize \u2014 especially in backend/pipeline-heavy work \u2014 that\u2019s what I do."}
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-6 py-20 dark:bg-[#080810]">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground dark:text-white sm:text-4xl">
            Get in touch
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground dark:text-slate-400">
            {"Interested in working together? I\u2019d love to hear from you."}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="mailto:gilvinsz@gmail.com"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
            >
              gilvinsz@gmail.com
            </a>
            <a
              href="https://www.linkedin.com/in/gilvin-zalsos-213692141/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/Golvan98"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 dark:border-white/8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {"Gilvin Zalsos \u00a9 2026"}
          </span>
          <span className="text-xs text-muted-foreground">
            Built with Next.js, Tailwind CSS & Supabase
          </span>
        </div>
      </footer>

      <ChatWidget />
    </main>
  )
}
