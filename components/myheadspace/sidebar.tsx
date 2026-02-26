"use client"

import { useState, useRef, useEffect } from "react"
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  activeProjectId: string | null
  onSelectProject: (projectId: string) => void
  isAdmin: boolean
  onCreateCategory: (name: string) => Promise<void>
  onRenameCategory: (id: string, name: string) => Promise<void>
  onDeleteCategory: (id: string) => Promise<void>
  onCreateProject: (categoryId: string, title: string) => Promise<void>
  onRenameProject: (id: string, title: string) => Promise<void>
  onDeleteProject: (id: string) => Promise<void>
}

const GLASS_WALL_MSG =
  "This workspace is Gilvin\u2019s private area \u2014 only he can make changes."

export function Sidebar({
  categories,
  activeProjectId,
  onSelectProject,
  isAdmin,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: SidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id))
  )

  // Inline editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryValue, setEditCategoryValue] = useState("")
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editProjectValue, setEditProjectValue] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [creatingInCategoryId, setCreatingInCategoryId] = useState<string | null>(null)
  const [newProjectTitle, setNewProjectTitle] = useState("")

  const catInputRef = useRef<HTMLInputElement>(null)
  const projInputRef = useRef<HTMLInputElement>(null)
  const newCatInputRef = useRef<HTMLInputElement>(null)
  const newProjInputRef = useRef<HTMLInputElement>(null)

  // Keep expanded set in sync when categories change
  useEffect(() => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      categories.forEach((c) => {
        if (!prev.has(c.id) && prev.size === 0) next.add(c.id)
      })
      // Add any new categories
      categories.forEach((c) => next.add(c.id))
      return next
    })
  }, [categories])

  // Auto-focus refs
  useEffect(() => {
    if (editingCategoryId) catInputRef.current?.focus()
  }, [editingCategoryId])
  useEffect(() => {
    if (editingProjectId) projInputRef.current?.focus()
  }, [editingProjectId])
  useEffect(() => {
    if (isCreatingCategory) newCatInputRef.current?.focus()
  }, [isCreatingCategory])
  useEffect(() => {
    if (creatingInCategoryId) newProjInputRef.current?.focus()
  }, [creatingInCategoryId])

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function guardToast() {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG, { duration: 3000 })
      return true
    }
    return false
  }

  // --- Category inline editing ---
  function startEditCategory(id: string, currentName: string) {
    if (guardToast()) return
    setEditingCategoryId(id)
    setEditCategoryValue(currentName)
  }

  async function commitEditCategory() {
    if (editingCategoryId && editCategoryValue.trim()) {
      await onRenameCategory(editingCategoryId, editCategoryValue.trim())
    }
    setEditingCategoryId(null)
    setEditCategoryValue("")
  }

  function cancelEditCategory() {
    setEditingCategoryId(null)
    setEditCategoryValue("")
  }

  // --- New category ---
  function startCreateCategory() {
    if (guardToast()) return
    setIsCreatingCategory(true)
    setNewCategoryName("")
  }

  async function commitCreateCategory() {
    if (newCategoryName.trim()) {
      await onCreateCategory(newCategoryName.trim())
    }
    setIsCreatingCategory(false)
    setNewCategoryName("")
  }

  function cancelCreateCategory() {
    setIsCreatingCategory(false)
    setNewCategoryName("")
  }

  // --- Project inline editing ---
  function startEditProject(id: string, currentName: string) {
    if (guardToast()) return
    setEditingProjectId(id)
    setEditProjectValue(currentName)
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

  // --- New project under category ---
  function startCreateProject(categoryId: string) {
    if (guardToast()) return
    setCreatingInCategoryId(categoryId)
    setNewProjectTitle("")
    // Ensure category is expanded
    setExpandedCategories((prev) => new Set(prev).add(categoryId))
  }

  async function commitCreateProject() {
    if (creatingInCategoryId && newProjectTitle.trim()) {
      await onCreateProject(creatingInCategoryId, newProjectTitle.trim())
    }
    setCreatingInCategoryId(null)
    setNewProjectTitle("")
  }

  function cancelCreateProject() {
    setCreatingInCategoryId(null)
    setNewProjectTitle("")
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
        {categories.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No categories yet
          </p>
        )}
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id)
          const isEditingThis = editingCategoryId === category.id
          return (
            <div key={category.id} className="mb-1">
              {/* Category header */}
              <div className="group flex items-center rounded-md px-2 py-1.5">
                {isEditingThis ? (
                  <Input
                    ref={catInputRef}
                    value={editCategoryValue}
                    onChange={(e) => setEditCategoryValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEditCategory()
                      if (e.key === "Escape") cancelEditCategory()
                    }}
                    onBlur={commitEditCategory}
                    className="h-6 text-xs"
                  />
                ) : (
                  <>
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
                        <DropdownMenuItem
                          onClick={() =>
                            startEditCategory(category.id, category.name)
                          }
                        >
                          Edit category name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => startCreateProject(category.id)}
                        >
                          Add project
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            guardToast() || onDeleteCategory(category.id)
                          }
                        >
                          Delete category
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              {/* Project rows */}
              {isExpanded && (
                <div className="ml-2 flex flex-col gap-0.5">
                  {category.projects.map((project) => {
                    const isActive = project.id === activeProjectId
                    const isEditingProj = editingProjectId === project.id
                    return (
                      <div
                        key={project.id}
                        className="group/proj flex items-center"
                      >
                        {isEditingProj ? (
                          <Input
                            ref={projInputRef}
                            value={editProjectValue}
                            onChange={(e) =>
                              setEditProjectValue(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEditProject()
                              if (e.key === "Escape") cancelEditProject()
                            }}
                            onBlur={commitEditProject}
                            className="mx-1 h-7 text-sm"
                          />
                        ) : (
                          <>
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
                              <DropdownMenuContent
                                align="start"
                                className="w-40"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    startEditProject(project.id, project.name)
                                  }
                                >
                                  Edit project name
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    guardToast() || onDeleteProject(project.id)
                                  }
                                >
                                  Delete project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Inline new project input */}
                  {creatingInCategoryId === category.id && (
                    <div className="mx-1">
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
                        className="h-7 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Inline new category input */}
        {isCreatingCategory && (
          <div className="px-2 py-1">
            <Input
              ref={newCatInputRef}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreateCategory()
                if (e.key === "Escape") cancelCreateCategory()
              }}
              onBlur={commitCreateCategory}
              placeholder="Category name..."
              className="h-6 text-xs"
            />
          </div>
        )}
      </div>

      {/* New Category button */}
      <div className="border-t border-[#f3f4f6] p-2 dark:border-white/8">
        <Button
          variant="ghost"
          size="sm"
          onClick={startCreateCategory}
          className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground dark:hover:text-white"
        >
          <Plus className="size-4" />
          New Category
        </Button>
      </div>
    </aside>
  )
}
