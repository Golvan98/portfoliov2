"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/auth-modal"
import { Sparkles, X, ArrowRight, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { timeAgo } from "@/lib/time-ago"
import type { User } from "@supabase/supabase-js"

interface Source {
  source_type: string
  title: string
  snippet: string
  updated_at: string
  doc_id: string
  chunk_index: number
}

interface Message {
  id: number
  role: "agent" | "user"
  text: string
  sources?: Source[]
}

const starterMessage: Message = {
  id: 0,
  role: "agent",
  text: "Hi! Ask me anything about Gilvin\u2019s projects, experience, or stack.",
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([starterMessage])
  const [input, setInput] = useState("")
  const [idCounter, setIdCounter] = useState(1)
  const [isTyping, setIsTyping] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auth state + load chat history for logged-in users
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadHistory(user.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadHistory(session.user.id)
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for external "open-chat-widget" events (e.g. hero button)
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-chat-widget", handler)
    return () => window.removeEventListener("open-chat-widget", handler)
  }, [])

  async function loadHistory(userId: string) {
    const { data } = await createClient()
      .from("agent_chat_history")
      .select("role, content, sources")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20)
    if (!data || data.length === 0) return
    const loaded: Message[] = data.map((row, i) => ({
      id: i + 1,
      role: row.role === "user" ? "user" : "agent",
      text: row.content,
      sources: row.sources?.length ? row.sources : undefined,
    }))
    setMessages([starterMessage, ...loaded])
    setIdCounter(loaded.length + 1)
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isTyping || quotaExceeded) return

    const userMsg: Message = { id: idCounter, role: "user", text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      })

      if (res.status === 429) {
        const data = await res.json()
        setQuotaExceeded(true)
        setRemaining(0)
        setMessages((prev) => [
          ...prev,
          {
            id: idCounter + 1,
            role: "agent",
            text: data.message ?? "You\u2019ve used all your questions for today.",
          },
        ])
        setIdCounter((c) => c + 2)
        return
      }

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: idCounter + 1,
            role: "agent",
            text: "Sorry, something went wrong. Please try again.",
          },
        ])
        setIdCounter((c) => c + 2)
        return
      }

      const data = await res.json()
      setRemaining(data.remaining)

      if (data.remaining === 0) {
        setQuotaExceeded(true)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: idCounter + 1,
          role: "agent",
          text: data.answer,
          sources: data.sources,
        },
      ])
      setIdCounter((c) => c + 2)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: idCounter + 1,
          role: "agent",
          text: "Network error. Please check your connection and try again.",
        },
      ])
      setIdCounter((c) => c + 2)
    } finally {
      setIsTyping(false)
    }
  }

  // Determine if we should show the sign-in nudge
  // Anonymous: limit is 5. Show nudge when remaining <= 2 (3/5 used)
  const showSignInNudge =
    !user && remaining !== null && remaining <= 2 && !quotaExceeded

  function formatSourceDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return `updated ${timeAgo(dateStr)}`
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <Sparkles className="size-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed right-6 bottom-6 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl dark:border-white/10 dark:bg-[#0d0d18]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                Talk to my portfolio
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground dark:bg-white/[0.06]"
                      }`}
                    >
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    </div>
                  </div>
                  {/* Source citations below agent messages */}
                  {msg.role === "agent" &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <div className="mt-1.5 ml-1 flex flex-col gap-0.5">
                        {msg.sources
                          .filter(
                            (s, i, arr) =>
                              arr.findIndex((x) => x.doc_id === s.doc_id) === i
                          )
                          .slice(0, 4)
                          .map((s) => {
                            const date = formatSourceDate(s.updated_at)
                            return (
                              <p
                                key={`${s.doc_id}-${s.chunk_index}`}
                                className="text-[10px] leading-tight text-muted-foreground"
                              >
                                From {s.title}
                                {date ? ` (${date})` : ""}
                              </p>
                            )
                          })}
                      </div>
                    )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-3.5 py-3 dark:bg-white/[0.06]">
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Quota / sign-in nudge bar */}
          {(remaining !== null || showSignInNudge || quotaExceeded) && (
            <div className="border-t border-border px-4 py-2 dark:border-white/10">
              {quotaExceeded && !user ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Daily limit reached
                  </span>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <LogIn className="size-3" />
                    Sign in for 20/day
                  </button>
                </div>
              ) : quotaExceeded ? (
                <p className="text-xs text-muted-foreground">
                  You&apos;ve used all your questions for today.
                </p>
              ) : showSignInNudge ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {remaining} question{remaining !== 1 ? "s" : ""} left
                  </span>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <LogIn className="size-3" />
                    Sign in for 20 daily
                  </button>
                </div>
              ) : remaining !== null ? (
                <p className="text-xs text-muted-foreground">
                  {remaining} question{remaining !== 1 ? "s" : ""} remaining
                  today
                </p>
              ) : null}
            </div>
          )}

          {/* Input bar */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-border px-4 py-3 dark:border-white/10"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                quotaExceeded
                  ? "Daily limit reached"
                  : "Ask something..."
              }
              disabled={quotaExceeded || isTyping}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={quotaExceeded || isTyping || !input.trim()}
              className="shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ArrowRight className="size-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      )}

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  )
}
