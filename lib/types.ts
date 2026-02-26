export interface Category {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export interface Project {
  id: string
  owner_id: string
  category_id: string | null
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  owner_id: string
  project_id: string
  title: string
  status: "todo" | "in_progress" | "done"
  priority: number | null
  created_at: string
  updated_at: string
}

export interface TaskNote {
  id: string
  owner_id: string
  task_id: string
  body: string
  created_at: string
  updated_at: string
}
