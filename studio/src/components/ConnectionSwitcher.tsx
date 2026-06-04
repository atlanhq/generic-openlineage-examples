import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  LogOut,
  Plug,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import type { AtlanConnection } from '@/lib/atlan-api'
import type { AtlanSession } from '@/lib/session'

export function ConnectionSwitcher({
  session,
  connections,
  refreshing,
  onSwitch,
  onRefresh,
  onReconnect,
}: {
  session: AtlanSession
  connections: AtlanConnection[]
  refreshing: boolean
  onSwitch: (c: AtlanConnection) => void
  onRefresh: () => void
  onReconnect: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const host = session.tenantHost.replace(/^https?:\/\//, '')

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex h-9 items-center gap-2.5 rounded-lg border px-2.5 transition-all',
          open
            ? 'border-faint bg-canvas-deep'
            : 'border-line bg-surface hover:border-faint',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="grid size-6 place-items-center rounded-md bg-brand-soft text-brand">
          <Plug className="size-3" />
        </span>
        <span className="hidden text-right leading-tight sm:block">
          <span className="block text-[12.5px] font-semibold text-ink">
            {session.connection.name}
          </span>
          <span className="block font-mono text-[10px] text-faint">
            {host}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-[320px] origin-top-right animate-[pop_0.22s_cubic-bezier(0.2,0.9,0.3,1.3)_both] overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
              Switch connection
            </div>
            <button
              onClick={onRefresh}
              className="rounded-md p-1 text-faint transition-colors hover:bg-canvas-deep hover:text-ink"
              aria-label="Refresh connections"
            >
              <RefreshCw
                className={cn('size-3.5', refreshing && 'spin')}
              />
            </button>
          </div>

          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {connections.length === 0 ? (
              <div className="px-3 py-4 text-[12px] text-muted">
                No connections cached. Tap the refresh icon to fetch.
              </div>
            ) : (
              connections.map((c, i) => {
                const active = c.qualifiedName === session.connection.qualifiedName
                return (
                  <button
                    key={c.guid || c.qualifiedName || i}
                    onClick={() => {
                      onSwitch(c)
                      setOpen(false)
                    }}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                      'animate-[rise_0.35s_cubic-bezier(0.2,0.7,0.2,1)_both]',
                      active ? 'bg-brand-soft' : 'hover:bg-canvas-deep',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-7 place-items-center rounded-md border transition-colors',
                        active
                          ? 'border-brand/30 bg-surface text-brand'
                          : 'border-line bg-surface text-muted',
                      )}
                    >
                      <Plug className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-[13px] font-medium',
                          active ? 'text-brand-strong' : 'text-ink',
                        )}
                      >
                        {c.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {c.createdAt ? `created ${timeAgo(c.createdAt)}` : ''}
                      </span>
                    </span>
                    {active && <Check className="size-4 text-brand" />}
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-line p-1.5">
            <button
              onClick={() => {
                setOpen(false)
                onReconnect()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-ink-soft transition-colors hover:bg-canvas-deep"
            >
              <LogOut className="size-3.5 text-muted" />
              Reconnect to a different Atlan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
