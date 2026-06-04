import { useMemo, useState, type ReactNode } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
import { cn, copyText } from '@/lib/utils'
import type { OLRunEvent } from '@/lib/openlineage'
import type { AtlanSession } from '@/lib/session'
import { buildCurl } from '@/lib/sender'

const TOKEN_RE =
  /("(?:\\.|[^"\\])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

const COLOR = {
  key: '#7fb4ff',
  string: '#6fe0c0',
  number: '#f2b673',
  literal: '#c99bf5',
}

function highlightJson(line: string) {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  let k = 0
  while ((m = TOKEN_RE.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    const tok = m[0]
    let color = COLOR.number
    if (tok.startsWith('"')) color = m[2] ? COLOR.key : COLOR.string
    else if (tok === 'true' || tok === 'false' || tok === 'null')
      color = COLOR.literal
    out.push(
      <span key={k++} style={{ color }}>
        {tok}
      </span>,
    )
    last = m.index + tok.length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

interface Tab {
  label: string
  kind: 'json' | 'shell'
  content: string
}

export function PayloadPanel({
  events,
  session,
}: {
  events: OLRunEvent[]
  session: AtlanSession
}) {
  const [tab, setTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const tabs: Tab[] = useMemo(() => {
    const evTabs: Tab[] = events.map((e, i) => ({
      label: `${String(i + 1).padStart(2, '0')} · ${e.eventType}`,
      kind: 'json',
      content: JSON.stringify(e, null, 2),
    }))
    evTabs.push({ label: 'cURL', kind: 'shell', content: buildCurl(events, session) })
    return evTabs
  }, [events, session])

  const active = Math.min(tab, tabs.length - 1)
  const current = tabs[active]
  const lines = current.content.split('\n')

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-code-bg shadow-card">
      {/* header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-2.5 py-2">
        <div className="flex items-center gap-1">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide transition-colors',
                i === active
                  ? 'bg-white/10 text-white'
                  : 'text-code-faint hover:text-code-text',
              )}
            >
              {t.kind === 'shell' && <Terminal className="size-3" />}
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={async () => {
            if (await copyText(current.content)) {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-code-faint transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* body */}
      <div className="max-h-[348px] overflow-auto py-2 font-mono text-[12px] leading-[1.6]">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-10 shrink-0 select-none px-2 text-right text-[10.5px] text-white/20">
              {i + 1}
            </span>
            <code className="whitespace-pre pr-4 text-code-text">
              {current.kind === 'json' ? highlightJson(line) : line || ' '}
            </code>
          </div>
        ))}
      </div>
    </div>
  )
}
