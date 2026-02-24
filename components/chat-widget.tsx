"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, X, ArrowRight } from "lucide-react"

interface Message {
  id: number
  role: "agent" | "user"
  text: string
}

const starterMessage: Message = {
  id: 0,
  role: "agent",
  text: "Hi! Ask me anything about Gilvin's projects, experience, or stack.",
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([starterMessage])
  const [input, setInput] = useState("")
  const [idCounter, setIdCounter] = useState(1)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSend(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const userMsg: Message = { id: idCounter, role: "user", text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIdCounter((c) => c + 1)

    // Simulate agent response
    setTimeout(() => {
      const agentMsg: Message = {
        id: idCounter + 1,
        role: "agent",
        text: "Thanks for your question! This is a placeholder response. When connected to an AI backend, I'll be able to answer questions about Gilvin's work, stack, and experience in detail.",
      }
      setMessages((prev) => [...prev, agentMsg])
      setIdCounter((c) => c + 2)
    }, 1200)
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
        <div className="fixed right-6 bottom-6 z-50 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl dark:border-white/10 dark:bg-[#0d0d18]">
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
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground dark:bg-white/[0.06]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input bar */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-border px-4 py-3 dark:border-white/10"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon-sm"
              className="shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ArrowRight className="size-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
