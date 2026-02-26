"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Search, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TaskCard } from "./task-card"
import type { Task } from "@/lib/types"

type TaskStatus = Task["status"]

interface KanbanBoardProps {
  tasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  isAdmin: boolean
  projectTabs: { id: string; name: string }[]
  activeProjectId: string | null
  activeCategoryId: string | null
  onSelectProject: (projectId: string) => void
  onCreateProject: (categoryId: string | null, title: string) => Promise<void>
  onRenameProject: (id: string, title: string) => Promise<void>
  onDeleteProject: (id: string) => Promise<void>
  onCreateTask: (title: string, status: string) => Promise<void>
  onRenameTask: (id: string, title: string) => Promise<void>
  onChangeTaskStatus: (id: string, status: string) => Promise<void>
  onDeleteTask: (id: string) => Promise<void>
}

const GLASS_WALL_MSG =
  "This workspace is Gilvin\u2019s private area \u2014 only he can make changes."

const columns: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
]

export function KanbanBoard({
  tasks,
  selectedTaskId,
  onSelectTask,
  searchQuery,
  onSearchChange,
  isAdmin,
  projectTabs,
  activeProjectId,
  activeCategoryId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onCreateTask,
  onRenameTask,
  onChangeTaskStatus,
  onDeleteTask,
}: KanbanBoardProps) {
  // Inline editing state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editProjectValue, setEditProjectValue] = useState("")
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [creatingInColumn, setCreatingInColumn] = useState<TaskStatus | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const projInputRef = useRef<HTMLInputElement>(null)
  const newProjInputRef = useRef<HTMLInputElement>(null)
  const newTaskInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingProjectId) projInputRef.current?.focus()
  }, [editingProjectId])
  useEffect(() => {
    if (isCreatingProject) newProjInputRef.current?.focus()
  }, [isCreatingProject])
  useEffect(() => {
    if (creatingInColumn) newTaskInputRef.current?.focus()
  }, [creatingInColumn])

  function guardToast() {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG, { duration: 3000 })
      return true
    }
    return false
  }

  // --- Project inline editing ---
  function startEditProject(id: string, name: string) {
    if (guardToast()) return
    setEditingProjectId(id)
    setEditProjectValue(name)
  }

  async function commitEditProject() {
    if (editingProjectId && editProjectValue.trim()) {
      await onRenameProject(editingProjectId, editProjectValue.trim())
    }
    setEditingProjectId(null)
    setEditProjectValue("")
  }

  function cancelEditProject() {
    setEditingProjectId(null)
    setEditProjectValue("")
  }

  // --- New project ---
  function startCreateProject() {
    if (guardToast()) return
    setIsCreatingProject(true)
    setNewProjectTitle("")
  }

  async function commitCreateProject() {
    if (newProjectTitle.trim()) {
      await onCreateProject(activeCategoryId, newProjectTitle.trim())
    }
    setIsCreatingProject(false)
    setNewProjectTitle("")
  }

  function cancelCreateProject() {
    setIsCreatingProject(false)
    setNewProjectTitle("")
  }

  // --- New task in column ---
  function startCreateTask(status: TaskStatus) {
    if (guardToast()) return
    setCreatingInColumn(status)
    setNewTaskTitle("")
  }

  async function commitCreateTask() {
    if (creatingInColumn && newTaskTitle.trim()) {
      await onCreateTask(newTaskTitle.trim(), creatingInColumn)
    }
    setCreatingInColumn(null)
    setNewTaskTitle("")
  }

  function cancelCreateTask() {
    setCreatingInColumn(null)
    setNewTaskTitle("")
  }

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Project tabs */}
      <div className="flex items-center gap-1 border-b border-[#f3f4f6] px-4 py-2 dark:border-white/8">
        {projectTabs.map((tab) => {
          const isActive = tab.id === activeProjectId
          const isEditingThis = editingProjectId === tab.id
          return (
            <div key={tab.id} className="group/tab relative flex items-center">
              {isEditingThis ? (
                <Input
                  ref={projInputRef}
                  value={editProjectValue}
                  onChange={(e) => setEditProjectValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEditProject()
                    if (e.key === "Escape") cancelEditProject()
                  }}
                  onBlur={commitEditProject}
                  className="h-7 w-32 text-sm"
                />
              ) : (
                <>
                  <button
                    onClick={() => onSelectProject(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-[#7c3aed]/10 font-medium text-[#7c3aed] dark:bg-purple-900/20 dark:text-purple-300"
                        : "text-muted-foreground hover:bg-[#f3f4f6] hover:text-foreground dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    {tab.name}
                  </button>
                  {isActive && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="ml-0.5 flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-[#f3f4f6] group-hover/tab:opacity-100 dark:hover:bg-white/5"
                          aria-label={`Options for ${tab.name}`}
                        >
                          <MoreHorizontal className="size-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem
                          onClick={() => startEditProject(tab.id, tab.name)}
                        >
                          Edit name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            guardToast() || onDeleteProject(tab.id)
                          }
                        >
                          Delete project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>
          )
        })}

        {/* New project tab */}
        {isCreatingProject ? (
          <Input
            ref={newProjInputRef}
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreateProject()
              if (e.key === "Escape") cancelCreateProject()
            }}
            onBlur={commitCreateProject}
            placeholder="Project name..."
            className="h-7 w-32 text-sm"
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={startCreateProject}
            className="gap-1 text-xs text-muted-foreground hover:text-foreground dark:hover:text-white"
          >
            <Plus className="size-3.5" />
            New Project
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks..."
            className="border-[#f3f4f6] pl-9 dark:border-white/8"
          />
        </div>
      </div>

      {/* Empty state */}
      {!activeProjectId && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select or create a project to get started
          </p>
        </div>
      )}

      {/* Kanban columns */}
      {activeProjectId && (
        <div className="flex flex-1 gap-4 overflow-x-auto px-4 pb-4">
          {columns.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key)
            return (
              <div
                key={col.key}
                className="flex min-w-[240px] flex-1 flex-col rounded-lg bg-[#fafafa] dark:bg-[#080810]/50"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground dark:text-white">
                      {col.label}
                    </h3>
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#f3f4f6] text-xs font-medium text-muted-foreground dark:bg-white/5 dark:text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => startCreateTask(col.key)}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[#f3f4f6] hover:text-foreground dark:hover:bg-white/5 dark:hover:text-white"
                    aria-label={`Add task to ${col.label}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Column tasks */}
                <ScrollArea className="flex-1 px-2 pb-2">
                  <div className="flex flex-col gap-2">
                    {/* Inline new task input */}
                    {creatingInColumn === col.key && (
                      <Input
                        ref={newTaskInputRef}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitCreateTask()
                          if (e.key === "Escape") cancelCreateTask()
                        }}
                        onBlur={commitCreateTask}
                        placeholder="Task title..."
                        className="h-8 text-sm"
                      />
                    )}
                    {colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={task.id === selectedTaskId}
                        onSelect={onSelectTask}
                        isAdmin={isAdmin}
                        onRename={onRenameTask}
                        onChangeStatus={onChangeTaskStatus}
                        onDelete={onDeleteTask}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
