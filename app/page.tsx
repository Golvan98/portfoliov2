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

      {/* About stub */}
      <section id="about" className="px-6 py-20 dark:bg-[#080810]">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground dark:text-white sm:text-4xl">
            About
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground dark:text-slate-400">
            {"I'm a full-stack developer who thrives at the intersection of AI and product engineering. I care about shipping things that work, look good, and solve real problems."}
          </p>
        </div>
      </section>

      {/* Contact stub */}
      <section id="contact" className="px-6 py-20 dark:bg-[#080810]">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground dark:text-white sm:text-4xl">
            Get in touch
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground dark:text-slate-400">
            {"Interested in working together? Reach out and let's build something great."}
          </p>
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
