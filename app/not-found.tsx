import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
      <h1 className="font-display text-6xl font-extrabold tracking-tight text-foreground sm:text-8xl">
        404
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This page doesn&apos;t exist.
      </p>
      <Button asChild className="mt-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
        <Link href="/">Back to portfolio</Link>
      </Button>
    </main>
  )
}
