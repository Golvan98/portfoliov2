"use client"

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
import { TaskCard, type TaskData } from "./task-card"

interface KanbanBoardProps {
  tasks: TaskData[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  isAdmin: boolean
  projectTabs: { id: string; name: string }[]
  activeProjectId: string
  onSelectProject: (projectId: string) => void
}

const GLASS_WALL_MSG =
  "This workspace is Gilvin's private area \u2014 only he can make changes."

const columns: { key: TaskData["status"]; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
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
  onSelectProject,
}: KanbanBoardProps) {
  function handleMutation() {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG)
      return
    }
  }

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Project tabs */}
      <div className="flex items-center gap-1 border-b border-[#f3f4f6] px-4 py-2 dark:border-white/8">
        {projectTabs.map((tab) => {
          const isActive = tab.id === activeProjectId
          return (
            <div key={tab.id} className="group/tab relative flex items-center">
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
                    <DropdownMenuItem onClick={handleMutation}>
                      Edit name
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleMutation}
                    >
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMutation}
          className="gap-1 text-xs text-muted-foreground hover:text-foreground dark:hover:text-white"
        >
          <Plus className="size-3.5" />
          New Project
        </Button>
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

      {/* Kanban columns */}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleMutation}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[#f3f4f6] hover:text-foreground dark:hover:bg-white/5 dark:hover:text-white"
                    aria-label={`Add task to ${col.label}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[#f3f4f6] hover:text-foreground dark:hover:bg-white/5 dark:hover:text-white"
                        aria-label={`Options for ${col.label} column`}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={handleMutation}>
                        Clear column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Column tasks */}
              <ScrollArea className="flex-1 px-2 pb-2">
                <div className="flex flex-col gap-2">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onSelect={onSelectTask}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </div>
  )
}
