import { Suspense, lazy, useState } from 'react'
import Icon from './Icon'
import Twerp from './Twerp'

// The chat panel pulls in react-markdown and friends; load that chunk only
// when someone actually opens the chat.
const ChatPanel = lazy(() => import('./ChatPanel'))

export default function ChatBubble() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <Suspense
          fallback={
            <div className="glass glass-blur pop flex h-[36rem] w-[420px] max-w-[calc(100vw-3rem)] items-center justify-center rounded-tile text-sm text-muted">
              Loading…
            </div>
          }
        >
          <ChatPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass glass-blur flex h-14 w-14 items-center justify-center rounded-full text-ink transition-all duration-300 ease-spring hover:scale-105 active:scale-95"
        aria-label={open ? 'Close chat with Twerp' : 'Chat with Twerp'}
        aria-expanded={open}
      >
        {open ? <Icon name="close" className="h-6 w-6" strokeWidth={1.9} /> : <Twerp size={38} fill={0.6} animate={false} />}
      </button>
    </div>
  )
}
