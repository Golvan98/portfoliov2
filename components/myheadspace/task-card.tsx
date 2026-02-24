"use client"

import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface TaskData {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
}

interface TaskCardProps {
  task: TaskData
  isSelected: boolean
  onSelect: (taskId: string) => void
  isAdmin: boolean
}

const GLASS_WALL_MSG =
  "This workspace is Gilvin's private area \u2014 only he can make changes."

export function TaskCard({ task, isSelected, onSelect, isAdmin }: TaskCardProps) {
  function handleMutation() {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG)
      return
    }
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
        <h4 className="font-display text-sm font-semibold text-foreground dark:text-white">
          {task.title}
        </h4>
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleMutation}>
              Edit title
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMutation}>
              Change status
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleMutation}>
              Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground dark:text-slate-400">
        {task.description}
      </p>
    </button>
  )
}
