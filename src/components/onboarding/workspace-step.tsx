"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { SendIcon, Loader2Icon, SparklesIcon, MicIcon, MicOffIcon } from "lucide-react"

interface WorkspaceStepProps {
  onComplete: (workspaceId: string, slug: string) => void
}

interface Message {
  role: "assistant" | "user"
  content: string
}

interface ExtractedData {
  name: string
  address: string
  timezone: string
  contactEmail: string
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function WorkspaceStep({ onComplete }: WorkspaceStepProps) {
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedData | null>(null)
  const [error, setError] = useState("")
  const [listening, setListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const clean = text.replace(/[*#_`]/g, "").replace(/\bhttps?:\/\/\S+/g, "")
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setListening(false)
      sendMessage(transcript)
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    if (!started) return
    const last = messages[messages.length - 1]
    if (last?.role === "assistant" && last.content) {
      speak(last.content)
    }
  }, [messages, started])

  async function handleStart() {
    setStarted(true)
    setLoading(true)

    // Unlock speech with a silent utterance on user click
    const silent = new SpeechSynthesisUtterance("")
    silent.volume = 0
    window.speechSynthesis?.speak(silent)

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      })
      const data = await res.json()
      const greeting =
        res.ok && data.reply
          ? data.reply
          : "Hey there! Welcome to CareOps. Let's set up your workspace. What's the name of your business?"
      setMessages([{ role: "assistant", content: greeting }])
      if (data.extracted) setExtracted(data.extracted)
    } catch {
      setMessages([
        {
          role: "assistant",
          content:
            "Hey there! Welcome to CareOps. Let's set up your workspace. What's the name of your business?",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      })
      const data = await res.json()
      if (!res.ok || !data.reply) {
        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: "Sorry, I had trouble understanding that. Could you try again?",
          },
        ])
        return
      }
      setMessages([...updatedMessages, { role: "assistant", content: data.reply }])
      if (data.extracted) setExtracted(data.extracted)
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Could you try again?",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    sendMessage(input)
  }

  async function handleCreate() {
    if (!extracted) return
    setLoading(true)
    setError("")

    try {
      const slug = slugify(extracted.name)
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: extracted.name,
          slug,
          address: extracted.address,
          timezone: extracted.timezone,
          contactEmail: extracted.contactEmail,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create workspace")
      }

      const data = await res.json()
      onComplete(data.id, data.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Create Your Workspace
          </CardTitle>
          <CardDescription>
            Our AI assistant will guide you through setting up your workspace
            with a quick conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <MicIcon className="h-10 w-10 text-primary" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Click start and the AI will ask you a few questions about your
            business. It will also speak the questions out loud!
          </p>
          <Button onClick={handleStart} size="lg" className="gap-2">
            <SparklesIcon className="h-4 w-4" />
            Start Conversation
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5" />
          Create Your Workspace
        </CardTitle>
        <CardDescription>
          Tell us about your business and we&apos;ll set everything up for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-80 overflow-y-auto rounded-lg border p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground max-w-[80%] rounded-lg px-3 py-2 text-sm">
                <Loader2Icon className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Type your answer..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button
            type="button"
            size="icon"
            variant={listening ? "destructive" : "outline"}
            onClick={listening ? stopListening : startListening}
            disabled={loading}
          >
            {listening ? (
              <MicOffIcon className="h-4 w-4" />
            ) : (
              <MicIcon className="h-4 w-4" />
            )}
          </Button>
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>

        {extracted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span> {extracted.name}
              </div>
              <div>
                <span className="text-muted-foreground">Address:</span> {extracted.address}
              </div>
              <div>
                <span className="text-muted-foreground">Timezone:</span> {extracted.timezone}
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span> {extracted.contactEmail}
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Workspace"}
              </Button>
            </CardContent>
          </Card>
        )}

        {error && !extracted && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
