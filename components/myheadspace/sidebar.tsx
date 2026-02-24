"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export interface SidebarProject {
  id: string
  name: string
}

export interface SidebarCategory {
  id: string
  name: string
  projects: SidebarProject[]
}

interface SidebarProps {
  categories: SidebarCategory[]
  activeProjectId: string
  onSelectProject: (projectId: string) => void
  isAdmin: boolean
}

const GLASS_WALL_MSG =
  "This workspace is Gilvin's private area \u2014 only he can make changes."

export function Sidebar({
  categories,
  activeProjectId,
  onSelectProject,
  isAdmin,
}: SidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id))
  )

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleMutation() {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG)
      return
    }
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#f3f4f6] bg-[#fafafa] dark:border-white/8 dark:bg-[#0d0d18]">
      {/* User row */}
      <div className="flex items-center gap-2 border-b border-[#f3f4f6] px-4 py-3 dark:border-white/8">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-display text-sm font-semibold text-foreground dark:text-white">
          Gilvin
        </span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </div>

      {/* Category tree */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id)
          return (
            <div key={category.id} className="mb-1">
              {/* Category header */}
              <div className="group flex items-center rounded-md px-2 py-1.5">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex flex-1 items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground dark:hover:text-white"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3" />
                  ) : (
                    <ChevronRight className="size-3" />
                  )}
                  {category.name}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-[#f3f4f6] group-hover:opacity-100 dark:hover:bg-white/5"
                      aria-label={`Options for ${category.name}`}
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={handleMutation}>
                      Edit category name
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleMutation}
                    >
                      Delete category
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Project rows */}
              {isExpanded && (
                <div className="ml-2 flex flex-col gap-0.5">
                  {category.projects.map((project) => {
                    const isActive = project.id === activeProjectId
                    return (
                      <div
                        key={project.id}
                        className="group/proj flex items-center"
                      >
                        <button
                          onClick={() => onSelectProject(project.id)}
                          className={`flex flex-1 items-center rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-purple-50 font-medium text-[#7c3aed] dark:bg-purple-900/20 dark:text-purple-300"
                              : "text-muted-foreground hover:bg-[#f3f4f6] hover:text-foreground dark:hover:bg-white/5 dark:hover:text-white"
                          }`}
                        >
                          {project.name}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-[#f3f4f6] group-hover/proj:opacity-100 dark:hover:bg-white/5"
                              aria-label={`Options for ${project.name}`}
                            >
                              <MoreHorizontal className="size-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem onClick={handleMutation}>
                              Edit project name
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={handleMutation}
                            >
                              Delete project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New Category button */}
      <div className="border-t border-[#f3f4f6] p-2 dark:border-white/8">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMutation}
          className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground dark:hover:text-white"
        >
          <Plus className="size-4" />
          New Category
        </Button>
      </div>
    </aside>
  )
}
