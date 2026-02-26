"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { logActivity } from "@/lib/activity/log-activity"
import {
  syncKnowledgeDoc,
  deleteKnowledgeDoc,
  buildProjectContent,
  buildTaskContent,
  buildNoteContent,
} from "@/lib/rag/sync-knowledge-doc"
import { Sidebar } from "./sidebar"
import { KanbanBoard } from "./kanban-board"
import { TaskDetails } from "./task-details"
import { Menu, X } from "lucide-react"
import type { Category, Project, Task, TaskNote } from "@/lib/types"

const GLASS_WALL_MSG =
  "This workspace is Gilvin\u2019s private area \u2014 only he can make changes."

interface WorkspaceProps {
  isAdmin: boolean
  userId: string | null
  initialCategories: Category[]
  initialProjects: Project[]
}

export function Workspace({
  isAdmin,
  userId,
  initialCategories,
  initialProjects,
}: WorkspaceProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialProjects[0]?.id ?? null
  )
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskNote, setTaskNote] = useState<TaskNote | null>(null)
  const [noteText, setNoteText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // --- Helpers ---
  function guard(): boolean {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG, { duration: 3000 })
      return true
    }
    return false
  }

  function getCategoryName(categoryId: string | null): string {
    if (!categoryId) return "Uncategorized"
    return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized"
  }

  function getProjectTitle(projectId: string): string {
    return projects.find((p) => p.id === projectId)?.title ?? ""
  }

  // --- Data fetching ---
  async function refetchCategories() {
    const { data } = await createClient()
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true })
    setCategories(data ?? [])
  }

  async function refetchProjects() {
    const { data } = await createClient()
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true })
    setProjects(data ?? [])
  }

  async function fetchTasks(projectId: string) {
    const { data } = await createClient()
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
    setTasks(data ?? [])
  }

  async function fetchNote(taskId: string) {
    const { data } = await createClient()
      .from("task_notes")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    setTaskNote(data)
    setNoteText(data?.body ?? "")
  }

  useEffect(() => {
    if (activeProjectId) {
      fetchTasks(activeProjectId)
    } else {
      setTasks([])
    }
    setSelectedTaskId(null)
    setTaskNote(null)
    setNoteText("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId])

  useEffect(() => {
    if (selectedTaskId) {
      fetchNote(selectedTaskId)
    } else {
      setTaskNote(null)
      setNoteText("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId])

  // --- Category CRUD (no RAG sync — categories not embedded) ---
  async function createCategory(name: string) {
    if (guard()) return
    const { error } = await createClient()
      .from("categories")
      .insert({ owner_id: userId!, name })
    if (error) {
      toast.error("Failed to create category")
      return
    }
    await refetchCategories()
  }

  async function renameCategory(id: string, name: string) {
    if (guard()) return
    const { error } = await createClient()
      .from("categories")
      .update({ name })
      .eq("id", id)
    if (error) {
      toast.error("Failed to rename category")
      return
    }
    await refetchCategories()
  }

  async function deleteCategory(id: string) {
    if (guard()) return
    const { error } = await createClient()
      .from("categories")
      .delete()
      .eq("id", id)
    if (error) {
      toast.error("Failed to delete category")
      return
    }
    await refetchCategories()
    await refetchProjects()
  }

  // --- Project CRUD ---
  async function createProject(categoryId: string | null, title: string) {
    if (guard()) return
    const { data, error } = await createClient()
      .from("projects")
      .insert({ owner_id: userId!, category_id: categoryId, title })
      .select()
      .single()
    if (error || !data) {
      toast.error("Failed to create project")
      return
    }
    await logActivity({
      action: "create",
      entity_type: "project",
      entity_id: data.id,
      entity_title: data.title,
      owner_id: userId!,
    })
    // RAG sync
    try {
      const blob = buildProjectContent({
        title: data.title,
        categoryName: getCategoryName(categoryId),
        description: data.description,
        updatedAt: data.updated_at,
      })
      await syncKnowledgeDoc({
        sourceType: "project",
        sourceId: data.id,
        title: blob.title,
        content: blob.content,
        ownerId: userId!,
      })
    } catch { /* non-blocking */ }
    await refetchProjects()
    setActiveProjectId(data.id)
  }

  async function renameProject(id: string, title: string) {
    if (guard()) return
    const now = new Date().toISOString()
    const { error } = await createClient()
      .from("projects")
      .update({ title, updated_at: now })
      .eq("id", id)
    if (error) {
      toast.error("Failed to rename project")
      return
    }
    await logActivity({
      action: "update",
      entity_type: "project",
      entity_id: id,
      entity_title: title,
      owner_id: userId!,
    })
    // RAG sync
    try {
      const project = projects.find((p) => p.id === id)
      const blob = buildProjectContent({
        title,
        categoryName: getCategoryName(project?.category_id ?? null),
        description: project?.description ?? null,
        updatedAt: now,
      })
      await syncKnowledgeDoc({
        sourceType: "project",
        sourceId: id,
        title: blob.title,
        content: blob.content,
        ownerId: userId!,
      })
    } catch { /* non-blocking */ }
    await refetchProjects()
  }

  async function deleteProject(id: string) {
    if (guard()) return
    const project = projects.find((p) => p.id === id)
    const supabase = createClient()

    // Collect task + note IDs before cascade delete
    const { data: projectTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("project_id", id)
    const taskIds = projectTasks?.map((t) => t.id) ?? []

    let noteIds: string[] = []
    if (taskIds.length > 0) {
      const { data: notes } = await supabase
        .from("task_notes")
        .select("id")
        .in("task_id", taskIds)
      noteIds = notes?.map((n) => n.id) ?? []
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
    if (error) {
      toast.error("Failed to delete project")
      return
    }
    if (project) {
      await logActivity({
        action: "delete",
        entity_type: "project",
        entity_id: id,
        entity_title: project.title,
        owner_id: userId!,
      })
    }
    // RAG cleanup — delete knowledge docs for notes, tasks, then project
    try {
      for (const nid of noteIds) await deleteKnowledgeDoc("note", nid)
      for (const tid of taskIds) await deleteKnowledgeDoc("task", tid)
      await deleteKnowledgeDoc("project", id)
    } catch { /* non-blocking */ }
    await refetchProjects()
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id)
      setActiveProjectId(remaining[0]?.id ?? null)
    }
  }

  // --- Task CRUD ---
  async function createTask(title: string, status: string) {
    if (guard() || !activeProjectId) return
    const { data, error } = await createClient()
      .from("tasks")
      .insert({
        owner_id: userId!,
        project_id: activeProjectId,
        title,
        status,
      })
      .select()
      .single()
    if (error || !data) {
      toast.error("Failed to create task")
      return
    }
    await logActivity({
      action: "create",
      entity_type: "task",
      entity_id: data.id,
      entity_title: data.title,
      owner_id: userId!,
    })
    // RAG sync
    try {
      const blob = buildTaskContent({
        title: data.title,
        projectTitle: getProjectTitle(activeProjectId),
        status: data.status,
        updatedAt: data.updated_at,
      })
      await syncKnowledgeDoc({
        sourceType: "task",
        sourceId: data.id,
        title: blob.title,
        content: blob.content,
        ownerId: userId!,
      })
    } catch { /* non-blocking */ }
    await fetchTasks(activeProjectId)
  }

  async function renameTask(id: string, title: string) {
    if (guard()) return
    const now = new Date().toISOString()
    const { error } = await createClient()
      .from("tasks")
      .update({ title, updated_at: now })
      .eq("id", id)
    if (error) {
      toast.error("Failed to rename task")
      return
    }
    await logActivity({
      action: "update",
      entity_type: "task",
      entity_id: id,
      entity_title: title,
      owner_id: userId!,
    })
    // RAG sync
    try {
      const task = tasks.find((t) => t.id === id)
      const blob = buildTaskContent({
        title,
        projectTitle: getProjectTitle(task?.project_id ?? activeProjectId ?? ""),
        status: task?.status ?? "todo",
        updatedAt: now,
      })
      await syncKnowledgeDoc({
        sourceType: "task",
        sourceId: id,
        title: blob.title,
        content: blob.content,
        ownerId: userId!,
      })
    } catch { /* non-blocking */ }
    if (activeProjectId) await fetchTasks(activeProjectId)
  }

  async function changeTaskStatus(id: string, newStatus: string) {
    if (guard()) return
    const now = new Date().toISOString()
    const task = tasks.find((t) => t.id === id)
    const { error } = await createClient()
      .from("tasks")
      .update({ status: newStatus, updated_at: now })
      .eq("id", id)
    if (error) {
      toast.error("Failed to change task status")
      return
    }
    if (task) {
      await logActivity({
        action: "update",
        entity_type: "task",
        entity_id: id,
        entity_title: task.title,
        owner_id: userId!,
      })
      // RAG sync
      try {
        const blob = buildTaskContent({
          title: task.title,
          projectTitle: getProjectTitle(task.project_id),
          status: newStatus,
          updatedAt: now,
        })
        await syncKnowledgeDoc({
          sourceType: "task",
          sourceId: id,
          title: blob.title,
          content: blob.content,
          ownerId: userId!,
        })
      } catch { /* non-blocking */ }
    }
    if (activeProjectId) await fetchTasks(activeProjectId)
  }

  async function deleteTask(id: string) {
    if (guard()) return
    const task = tasks.find((t) => t.id === id)
    const supabase = createClient()

    // Collect note IDs before cascade delete
    const { data: notes } = await supabase
      .from("task_notes")
      .select("id")
      .eq("task_id", id)
    const noteIds = notes?.map((n) => n.id) ?? []

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
    if (error) {
      toast.error("Failed to delete task")
      return
    }
    if (task) {
      await logActivity({
        action: "delete",
        entity_type: "task",
        entity_id: id,
        entity_title: task.title,
        owner_id: userId!,
      })
    }
    // RAG cleanup
    try {
      for (const nid of noteIds) await deleteKnowledgeDoc("note", nid)
      await deleteKnowledgeDoc("task", id)
    } catch { /* non-blocking */ }
    if (selectedTaskId === id) setSelectedTaskId(null)
    if (activeProjectId) await fetchTasks(activeProjectId)
  }

  // --- Note save ---
  async function saveNote(body: string) {
    if (guard() || !selectedTaskId) return
    const supabase = createClient()
    let noteId: string | undefined

    if (taskNote) {
      const { error } = await supabase
        .from("task_notes")
        .update({ body, updated_at: new Date().toISOString() })
        .eq("id", taskNote.id)
      if (error) {
        toast.error("Failed to save note")
        return
      }
      noteId = taskNote.id
    } else {
      const { data, error } = await supabase
        .from("task_notes")
        .insert({ owner_id: userId!, task_id: selectedTaskId, body })
        .select("id")
        .single()
      if (error || !data) {
        toast.error("Failed to save note")
        return
      }
      noteId = data.id
    }

    // RAG sync for note
    try {
      const task = tasks.find((t) => t.id === selectedTaskId)
      const blob = buildNoteContent({
        taskTitle: task?.title ?? "",
        projectTitle: getProjectTitle(task?.project_id ?? activeProjectId ?? ""),
        body,
        updatedAt: new Date().toISOString(),
      })
      await syncKnowledgeDoc({
        sourceType: "note",
        sourceId: noteId!,
        title: blob.title,
        content: blob.content,
        ownerId: userId!,
      })
    } catch { /* non-blocking */ }

    await fetchNote(selectedTaskId)
    toast.success("Note saved", { duration: 2000 })
  }

  // --- Computed values ---
  const categoryTree = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    projects: projects
      .filter((p) => p.category_id === cat.id)
      .map((p) => ({ id: p.id, name: p.title })),
  }))

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const activeCategoryId =
    activeProject?.category_id ?? categories[0]?.id ?? null
  const projectTabs = projects
    .filter((p) => p.category_id === activeCategoryId)
    .map((p) => ({ id: p.id, name: p.title }))

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

  function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId)
    setSearchQuery("")
    setSidebarOpen(false)
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId)
  }

  // --- Render ---
  return (
    <>
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
        <div className={`${sidebarOpen ? "flex" : "hidden"} lg:flex`}>
          <Sidebar
            categories={categoryTree}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            isAdmin={isAdmin}
            onCreateCategory={createCategory}
            onRenameCategory={renameCategory}
            onDeleteCategory={deleteCategory}
            onCreateProject={createProject}
            onRenameProject={renameProject}
            onDeleteProject={deleteProject}
          />
        </div>

        <KanbanBoard
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isAdmin={isAdmin}
          projectTabs={projectTabs}
          activeProjectId={activeProjectId}
          activeCategoryId={activeCategoryId}
          onSelectProject={handleSelectProject}
          onCreateProject={createProject}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
          onCreateTask={createTask}
          onRenameTask={renameTask}
          onChangeTaskStatus={changeTaskStatus}
          onDeleteTask={deleteTask}
        />

        <div className="hidden lg:flex">
          <TaskDetails
            task={selectedTask}
            noteText={noteText}
            onNoteChange={setNoteText}
            onSaveNote={() => saveNote(noteText)}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </>
  )
}
