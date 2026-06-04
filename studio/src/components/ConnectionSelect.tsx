import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import type { AtlanConnection } from '@/lib/atlan-api'

/**
 * Per-example connection picker. Looks like our Input field, opens a dropdown
 * sourced from the cached connections list, and bubbles the chosen name back
 * up. The value is the *connection name* (which is the OpenLineage job
 * namespace by convention).
 */
export function ConnectionSelect({
  connections,
  value,
  onChange,
  id,
}: {
  connections: AtlanConnection[]
  value: string
  onChange: (name: string) => void
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-surface-2 px-3 text-left transition-all duration-150',
          open
            ? 'border-brand bg-surface ring-4 ring-brand-ring/40'
            : 'border-line-strong hover:border-faint',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate font-mono text-[12.5px] tracking-tight text-ink">
          {value || '(none)'}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-faint transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 origin-top animate-[pop_0.22s_cubic-bezier(0.2,0.9,0.3,1.3)_both] overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <div className="max-h-[260px] overflow-y-auto p-1.5">
            {connections.length === 0 ? (
              <div className="px-3 py-3 text-[12px] text-muted">
                No connections cached.
              </div>
            ) : (
              connections.map((c, i) => {
                const active = c.name === value
                return (
                  <button
                    key={c.guid || c.qualifiedName || i}
                    type="button"
                    onClick={() => {
                      onChange(c.name)
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
        </div>
      )}
    </div>
  )
}
