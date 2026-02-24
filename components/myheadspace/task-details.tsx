"use client"

import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { TaskData } from "./task-card"

interface TaskDetailsProps {
  task: TaskData | null
  noteText: string
  onNoteChange: (text: string) => void
  isAdmin: boolean
}

const GLASS_WALL_MSG =
  "This workspace is Gilvin's private area \u2014 only he can make changes."

const STATUS_LABEL: Record<TaskData["status"], string> = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "done": "Done",
}

const STATUS_COLOR: Record<TaskData["status"], string> = {
  "todo": "bg-[#f3f4f6] text-muted-foreground dark:bg-white/5 dark:text-slate-400",
  "in-progress": "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  "done": "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
}

export function TaskDetails({
  task,
  noteText,
  onNoteChange,
  isAdmin,
}: TaskDetailsProps) {
  function handleSave() {
    if (!isAdmin) {
      toast(GLASS_WALL_MSG)
      return
    }
  }

  if (!task) {
    return (
      <aside className="flex w-[300px] shrink-0 flex-col border-l border-[#f3f4f6] bg-[#fafafa] dark:border-white/8 dark:bg-[#0d0d18]">
        <div className="border-b border-[#f3f4f6] px-4 py-3 dark:border-white/8">
          <h2 className="font-display text-sm font-bold text-foreground dark:text-white">
            Task Details
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-sm text-muted-foreground dark:text-slate-400">
            Select a task to view details
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-[#f3f4f6] bg-[#fafafa] dark:border-white/8 dark:bg-[#0d0d18]">
      <div className="border-b border-[#f3f4f6] px-4 py-3 dark:border-white/8">
        <h2 className="font-display text-sm font-bold text-foreground dark:text-white">
          Task Details
        </h2>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {/* Task title */}
        <h3 className="font-display text-base font-semibold text-foreground dark:text-white">
          {task.title}
        </h3>

        {/* Status badge */}
        <div className="mt-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status]}`}
          >
            {STATUS_LABEL[task.status]}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground dark:text-slate-400">
          {task.description}
        </p>

        <Separator className="my-4 bg-[#f3f4f6] dark:bg-white/8" />

        {/* Notes */}
        <div className="flex flex-1 flex-col">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase dark:text-slate-500">
            Notes
          </span>
          <Textarea
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Write notes here..."
            className="mt-2 min-h-[160px] flex-1 resize-none border-[#f3f4f6] dark:border-white/8 dark:bg-white/5"
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleSave}
              size="sm"
              className="rounded-full bg-[#7c3aed] text-white hover:bg-[#7c3aed]/90"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
