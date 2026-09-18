import { useState } from 'react'
import type { PendingAction } from '../lib/chatTypes'
import { confirmPendingAction } from '../lib/chatApi'
import Icon from './Icon'

const STATUS_LABEL: Record<string, string> = {
  pending: '',
  confirmed: 'Done',
  cancelled: 'Cancelled',
  expired: 'Expired',
  failed: 'Failed',
}

export default function PendingActionCard({
  action,
  onSettled,
}: {
  action: PendingAction
  onSettled?: (status: string) => void
}) {
  const [status, setStatus] = useState(action.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(decision: 'confirm' | 'cancel') {
    setBusy(true)
    setError(null)
    try {
      const res = await confirmPendingAction(action.id, decision)
      setStatus(res.status as typeof status)
      onSettled?.(res.status)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const settled = status !== 'pending'

  return (
    <div
      className={`max-w-[85%] rounded-[22px] p-3.5 text-sm ring-1 ring-inset ${
        settled ? 'bg-ink/[0.05] ring-ink/10' : 'bg-chart-amber/[0.14] ring-chart-amber/30'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`glass-badge h-6 w-6 shrink-0 ${settled ? 'text-muted' : 'text-chart-amber'}`}>
          <Icon name={status === 'confirmed' ? 'check' : 'pencil'} className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        <p className="leading-snug">{action.summary}</p>
      </div>
      {error && <p className="mt-2 text-xs text-rust">{error}</p>}
      {status === 'pending' ? (
        <div className="mt-3 flex gap-2">
          <button onClick={() => handle('confirm')} disabled={busy} className="btn btn-primary btn-sm">
            Confirm
          </button>
          <button onClick={() => handle('cancel')} disabled={busy} className="btn btn-glass btn-sm">
            Cancel
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-muted">{STATUS_LABEL[status] ?? status}</p>
      )}
    </div>
  )
}
