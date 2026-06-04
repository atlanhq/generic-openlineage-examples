import { cn } from '@/lib/utils'
import { CATEGORY_ORDER, EXAMPLES, type Example } from '@/data/examples'

export function Sidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="px-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Examples
        </div>
        <p className="mt-1 text-[12px] leading-snug text-muted">
          Pick a scenario to send. Every field is prefilled.
        </p>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const items = EXAMPLES.filter((e) => e.category === category)
        if (!items.length) return null
        return (
          <div key={category} className="flex flex-col gap-1">
            <div className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint/80">
              {category}
            </div>
            {items.map((ex) => (
              <SidebarItem
                key={ex.id}
                example={ex}
                selected={ex.id === selectedId}
                onSelect={() => onSelect(ex.id)}
              />
            ))}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarItem({
  example,
  selected,
  onSelect,
}: {
  example: Example
  selected: boolean
  onSelect: () => void
}) {
  const Icon = example.icon
  const soon = example.status === 'soon'
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group relative flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors',
        selected ? 'bg-brand-soft' : 'hover:bg-canvas-deep',
      )}
    >
      {selected && (
        <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-brand" />
      )}
      <span
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border transition-colors',
          selected
            ? 'border-brand/25 bg-surface text-brand'
            : 'border-line bg-surface text-muted group-hover:text-ink',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'truncate text-[13px] font-medium',
              selected ? 'text-brand-strong' : 'text-ink',
            )}
          >
            {example.title}
          </span>
          {soon && (
            <span className="rounded-full bg-canvas-deep px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-faint">
              Soon
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted">
          {example.blurb}
        </span>
      </span>
    </button>
  )
}
