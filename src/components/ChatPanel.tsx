import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, PendingAction } from '../lib/chatTypes'
import { getChatHistory, getPendingActions, sendChatMessage } from '../lib/chatApi'
import { getOrCreateSessionId } from '../lib/chatSession'
import PendingActionCard from './PendingActionCard'
import Icon from './Icon'
import Twerp from './Twerp'
import ChatMarkdown from './ChatMarkdown'

type MessageWithActions = ChatMessage & { pendingActions?: PendingAction[] }

export default function ChatPanel({ onClose }: { onClose?: () => void }) {
  const [sessionId] = useState(getOrCreateSessionId)
  const [messages, setMessages] = useState<MessageWithActions[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([getChatHistory(sessionId), getPendingActions(sessionId)])
      .then(([history, pending]) => {
        const withActions: MessageWithActions[] = history.map((m) => ({ ...m }))
        if (pending.length && withActions.length) {
          withActions[withActions.length - 1].pendingActions = pending
        }
        setMessages(withActions)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
  }, [sessionId])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    setSending(true)
    setError(null)

    const userMessage: MessageWithActions = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const { reply, pendingActions } = await sendChatMessage(sessionId, text)
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}-a`, role: 'assistant', content: reply, createdAt: new Date().toISOString(), pendingActions },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="glass glass-blur pop flex h-[36rem] w-[420px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-tile">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Twerp size={34} fill={0.6} animate={false} />
          <div className="leading-tight">
            <p className="eyebrow">Assistant</p>
            <h2 className="text-[15px] font-semibold tracking-tight">Twerp</h2>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost h-8 w-8 rounded-full p-0"
            aria-label="Close"
          >
            <Icon name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
      <div className="mx-4 h-px bg-ink/10" />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-center text-sm text-muted">Loading…</p>}
        {!loading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Twerp size={72} fill={0.55} className="mb-1" />
            <p className="text-sm font-medium">Ask Twerp about your money</p>
            <p className="max-w-[220px] text-xs text-muted">
              Try “How much did I spend on food?” or “Add a ₱250 coffee expense.”
            </p>
          </div>
        )}
        {!loading && (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const mine = m.role === 'user'
              return (
                <div key={m.id} className="flex flex-col gap-2">
                  <div
                    className={`px-3.5 py-2 text-sm leading-relaxed ${
                      mine
                        ? 'ml-auto max-w-[85%] whitespace-pre-wrap rounded-[22px] rounded-br-[10px] bg-blue text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                        : 'max-w-[94%] rounded-[22px] rounded-bl-[10px] bg-ink/[0.06] text-ink ring-1 ring-inset ring-ink/10'
                    }`}
                  >
                    {mine ? m.content : <ChatMarkdown>{m.content}</ChatMarkdown>}
                  </div>
                  {m.pendingActions?.map((a) => <PendingActionCard key={a.id} action={a} />)}
                </div>
              )
            })}
            {sending && (
              <div className="flex w-fit items-center gap-2 rounded-[22px] rounded-bl-[10px] bg-ink/[0.06] px-3 py-2 ring-1 ring-inset ring-ink/10">
                <Twerp size={26} fill={0.5} mood="thinking" animate={false} />
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-[20px] bg-rust-light px-3.5 py-2 text-xs text-rust ring-1 ring-inset ring-rust/30">{error}</p>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-3">
        <input
          className="field rounded-full"
          placeholder="Ask about your spending…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn btn-primary h-10 w-10 shrink-0 rounded-full p-0"
          aria-label="Send"
        >
          <Icon name="send" className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}
