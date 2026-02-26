"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Task } from "@/lib/types"

interface TaskCardProps {
  task: Task
  isSelected: boolean
  onSelect: (taskId: string) => void
  isAdmin: boolean
  onRename: (id: string, title: string) => Promise<void>
  onChangeStatus: (id: string, status: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const GLASS_WALL_MSG =
  "This workspace is Gilvin\u2019s private area \u2014 only he can make changes."

const STATUS_OPTIONS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
]

export function TaskCard({
  task,
  isSelected,
  onSelect,
  isAdmin,
  onRename,
  onChangeStatus,
  onDelete,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function guardToast() {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG, { duration: 3000 })
      return true
    }
    return false
  }

  function startEdit() {
    if (guardToast()) return
    setEditValue(task.title)
    setIsEditing(true)
  }

  async function commitEdit() {
    if (editValue.trim() && editValue.trim() !== task.title) {
      await onRename(task.id, editValue.trim())
    }
    setIsEditing(false)
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditValue(task.title)
  }

  return (
    <button
      onClick={() => onSelect(task.id)}
      className={`group w-full rounded-lg border bg-[#ffffff] p-3 text-left transition-all hover:shadow-sm dark:bg-[#0d0d18] ${
        isSelected
          ? "border-l-2 border-l-[#7c3aed] border-t-[#f3f4f6] border-r-[#f3f4f6] border-b-[#f3f4f6] dark:border-t-white/8 dark:border-r-white/8 dark:border-b-white/8"
          : "border-[#f3f4f6] dark:border-white/8"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === "Enter") commitEdit()
              if (e.key === "Escape") cancelEdit()
            }}
            onBlur={commitEdit}
            className="h-6 text-sm"
          />
        ) : (
          <h4 className="font-display text-sm font-semibold text-foreground dark:text-white">
            {task.title}
          </h4>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.stopPropagation()
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-[#f3f4f6] group-hover:opacity-100 dark:hover:bg-white/5"
              aria-label={`Options for ${task.title}`}
            >
              <MoreHorizontal className="size-3.5" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={startEdit}>Edit title</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {STATUS_OPTIONS.filter((s) => s.key !== task.status).map(
                  (s) => (
                    <DropdownMenuItem
                      key={s.key}
                      onClick={() =>
                        guardToast() || onChangeStatus(task.id, s.key)
                      }
                    >
                      {s.label}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => guardToast() || onDelete(task.id)}
            >
              Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </button>
  )
}
