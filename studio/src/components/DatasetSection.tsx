import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Input } from '@/components/ui'
import type { DatasetSpec } from '@/data/examples'

export function DatasetSection({
  title,
  tone,
  items,
  min,
  addLabel,
  emptyHint,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string
  tone: 'input' | 'output'
  items: DatasetSpec[]
  min: number
  addLabel: string
  emptyHint?: string
  onAdd: () => void
  onChange: (index: number, field: 'name' | 'namespace', value: string) => void
  onRemove: (index: number) => void
}) {
  const dot = tone === 'input' ? 'bg-faint' : 'bg-flow'
  const noun = tone === 'input' ? 'source' : 'target'
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('size-1.5 rounded-full', dot)} />
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
          <span className="rounded-full bg-canvas-deep px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
            {items.length}
          </span>
        </div>
        <Button size="sm" variant="secondary" icon={Plus} onClick={onAdd}>
          {addLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 py-3 text-[12px] text-faint">
          {emptyHint ?? `No ${noun}s yet.`}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-line bg-surface-2 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  {noun} {i + 1}
                </span>
                <button
                  onClick={() => onRemove(i)}
                  disabled={items.length <= min}
                  className="rounded-md p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                  aria-label={`Remove ${noun} ${i + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="grid gap-2">
                <MiniField label="name">
                  <Input
                    mono
                    value={item.name}
                    placeholder="DATABASE.SCHEMA.TABLE"
                    onChange={(e) => onChange(i, 'name', e.target.value)}
                  />
                </MiniField>
                <MiniField label="namespace">
                  <Input
                    mono
                    value={item.namespace}
                    placeholder="snowflake://account.snowflakecomputing.com"
                    onChange={(e) => onChange(i, 'namespace', e.target.value)}
                  />
                </MiniField>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function MiniField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
        {label}
      </span>
      {children}
    </label>
  )
}
