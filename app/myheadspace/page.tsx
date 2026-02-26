import { getAdminStatus } from "@/lib/auth/is-admin"
import { createClient } from "@/lib/supabase/server"
import { TopNavbar } from "@/components/myheadspace/top-navbar"
import { Workspace } from "@/components/myheadspace/workspace"
import type { Category, Project } from "@/lib/types"

export default async function MyHeadSpacePage() {
  const { isAdmin, userId } = await getAdminStatus()
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true })

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true })

  return (
    <div className="flex h-screen flex-col bg-[#ffffff] dark:bg-[#080810]">
      <TopNavbar />
      <Workspace
        isAdmin={isAdmin}
        userId={userId}
        initialCategories={(categories as Category[]) ?? []}
        initialProjects={(projects as Project[]) ?? []}
      />
    </div>
  )
}
