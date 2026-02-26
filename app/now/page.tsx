import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { ChatWidget } from "@/components/chat-widget"
import { ActivityList } from "@/components/activity-list"

export default async function NowPage() {
  const supabase = await createClient()

  const { data: activities } = await supabase
    .from("public_activity")
    .select("id, action, entity_type, entity_title, created_at")
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 pt-28 pb-20">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {"What I'm up to"}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          A live log of everything I{"'"}m working on.
        </p>

        <ActivityList initialActivities={activities ?? []} />
      </div>

      <ChatWidget />
    </main>
  )
}
