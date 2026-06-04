import { ArrowUpRight, CircleAlert, CircleCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SendResult } from '@/lib/sender'
import { assetsDeepLink, type AtlanSession } from '@/lib/session'

export function ResultPanel({
  result,
  session,
  onClose,
}: {
  result: SendResult
  session: AtlanSession
  onClose: () => void
}) {
  const ok = result.ok
  return (
    <div
      className={cn(
        'animate-[rise_0.4s_cubic-bezier(0.2,0.7,0.2,1)_both] relative overflow-hidden rounded-xl border p-4',
        ok ? 'border-ok/25 bg-ok-soft' : 'border-danger/25 bg-danger-soft',
      )}
    >
      <button
        onClick={onClose}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-ink-soft/50 transition-colors hover:bg-black/5 hover:text-ink"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
            ok ? 'bg-ok/12 text-ok' : 'bg-danger/12 text-danger',
          )}
        >
          {ok ? (
            <CircleCheck className="size-5" />
          ) : (
            <CircleAlert className="size-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">
            {ok ? 'Events accepted by Atlan' : 'Something went wrong'}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
            {result.accepted}/{result.total} events delivered
            {result.status ? ` · HTTP ${result.status}` : ''}. {result.message}
          </p>

          {result.detail && (
            <pre className="mt-2.5 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-code-bg px-3 py-2.5 font-mono text-[11px] leading-relaxed text-code-text">
              {result.detail}
            </pre>
          )}

          {ok && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={assetsDeepLink(session)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-[12.5px] font-medium text-white transition-transform hover:-translate-y-px"
              >
                View assets in Atlan
                <ArrowUpRight className="size-3.5" />
              </a>
              {result.demo && (
                <span className="text-[11.5px] text-ink-soft/70">
                  Demo mode — no live tenant connected.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
