"use client"

import { useState, useMemo } from "react"
import { TopNavbar } from "@/components/myheadspace/top-navbar"
import { Sidebar, type SidebarCategory } from "@/components/myheadspace/sidebar"
import { KanbanBoard } from "@/components/myheadspace/kanban-board"
import { TaskDetails } from "@/components/myheadspace/task-details"
import type { TaskData } from "@/components/myheadspace/task-card"
import { Menu, X } from "lucide-react"

// ---------- hardcoded data ----------

const IS_ADMIN = false

const CATEGORIES: SidebarCategory[] = [
  {
    id: "work",
    name: "Work",
    projects: [
      { id: "portfolio-v2", name: "Portfolio v2" },
      { id: "clipnet", name: "ClipNET" },
    ],
  },
  {
    id: "learning",
    name: "Learning",
    projects: [
      { id: "rag-research", name: "RAG research" },
    ],
  },
]

const ALL_TASKS: Record<string, TaskData[]> = {
  "portfolio-v2": [
    { id: "t1", title: "Set up Supabase", description: "Install and configure Supabase for auth and DB", status: "todo" },
    { id: "t2", title: "Build auth flow", description: "Set up Google OAuth and admin gating", status: "todo" },
    { id: "t3", title: "Wire activity feed", description: "Create realtime activity feed component", status: "todo" },
    { id: "t4", title: "Design landing page", description: "Hero, projects, activity widget sections", status: "done" },
    { id: "t5", title: "Write project docs", description: "DECISIONS.md, DATA_MODEL.md, RLS_AUTH.md", status: "done" },
  ],
  "clipnet": [
    { id: "t6", title: "Implement RAG pipeline", description: "Build embedding job and similarity search", status: "in-progress" },
    { id: "t7", title: "Connect pgvector", description: "Set up vector index and chunking logic", status: "in-progress" },
    { id: "t8", title: "Build clip preview UI", description: "Video player with highlight markers", status: "todo" },
  ],
  "rag-research": [
    { id: "t9", title: "Read LangChain docs", description: "Study retrieval-augmented generation patterns", status: "done" },
    { id: "t10", title: "Benchmark embeddings", description: "Compare OpenAI vs Cohere vs local models", status: "in-progress" },
    { id: "t11", title: "Write summary notes", description: "Compile findings into a research brief", status: "todo" },
  ],
}

// ---------- page ----------

export default function MyHeadSpacePage() {
  const [activeProjectId, setActiveProjectId] = useState("portfolio-v2")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [noteText, setNoteText] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const tasks = ALL_TASKS[activeProjectId] ?? []
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  )

  // Find which category the active project belongs to for tabs
  const activeCategory = useMemo(() => {
    for (const cat of CATEGORIES) {
      if (cat.projects.some((p) => p.id === activeProjectId)) return cat
    }
    return CATEGORIES[0]
  }, [activeProjectId])

  function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId)
    setSelectedTaskId(null)
    setSearchQuery("")
    setNoteText("")
    setSidebarOpen(false)
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId)
    setNoteText("")
  }

  return (
    <div className="flex h-screen flex-col bg-[#ffffff] dark:bg-[#080810]">
      {/* Top navbar */}
      <TopNavbar />

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex h-10 items-center gap-2 border-b border-[#f3f4f6] px-4 text-sm text-muted-foreground lg:hidden dark:border-white/8"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        {sidebarOpen ? "Close" : "Projects"}
      </button>

      {/* Main 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar -- hidden on mobile unless toggled */}
        <div
          className={`${
            sidebarOpen ? "flex" : "hidden"
          } lg:flex`}
        >
          <Sidebar
            categories={CATEGORIES}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            isAdmin={IS_ADMIN}
          />
        </div>

        {/* Middle: kanban board */}
        <KanbanBoard
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isAdmin={IS_ADMIN}
          projectTabs={activeCategory.projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
        />

        {/* Right: task details -- hidden on mobile/tablet if sidebar is open */}
        <div className="hidden lg:flex">
          <TaskDetails
            task={selectedTask}
            noteText={noteText}
            onNoteChange={setNoteText}
            isAdmin={IS_ADMIN}
          />
        </div>
      </div>
    </div>
  )
}
