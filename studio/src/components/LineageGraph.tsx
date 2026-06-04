import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { GraphNode, LineageModel } from '@/data/examples'

const HALF_NODE = 72 // px, half the node width — edge endpoints sit at the node edge

interface Pt {
  x: number
  y: number
}

function edgePath(a: Pt, b: Pt): string {
  const dx = Math.max(36, (b.x - a.x) * 0.5)
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`
}

function column(count: number, h: number): number[] {
  return Array.from({ length: count }, (_, i) => (h * (i + 1)) / (count + 1))
}

export function LineageGraph({
  model,
  active,
}: {
  model: LineageModel
  active: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const colX = [w * 0.14, w * 0.5, w * 0.86]
  const inY = column(model.inputs.length, h)
  const outY = column(model.outputs.length, h)
  const jobY = h / 2

  const edges: { a: Pt; b: Pt; key: string }[] = []
  if (w > 0) {
    model.inputs.forEach((_, i) => {
      edges.push({
        key: `i${i}`,
        a: { x: colX[0] + HALF_NODE, y: inY[i] },
        b: { x: colX[1] - HALF_NODE, y: jobY },
      })
    })
    model.outputs.forEach((_, i) => {
      edges.push({
        key: `o${i}`,
        a: { x: colX[1] + HALF_NODE, y: jobY },
        b: { x: colX[2] - HALF_NODE, y: outY[i] },
      })
    })
  }

  const rows = Math.max(model.inputs.length, model.outputs.length, 1)
  const boxHeight = Math.min(560, Math.max(200, rows * 66 + 28))

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ height: boxHeight }}
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {edges.map((e) => (
          <g key={e.key}>
            <path
              d={edgePath(e.a, e.b)}
              fill="none"
              stroke="var(--color-line-strong)"
              strokeWidth={1.5}
            />
            <path
              d={edgePath(e.a, e.b)}
              fill="none"
              stroke="var(--color-flow)"
              strokeWidth={1.75}
              strokeLinecap="round"
              className={cn('edge-flow', active && 'edge-flow--active')}
              style={{ opacity: active ? 0.95 : 0.45 }}
            />
          </g>
        ))}
      </svg>

      {w > 0 && (
        <>
          {model.inputs.map((n, i) => (
            <Node key={n.id} node={n} x={colX[0]} y={inY[i]} />
          ))}
          <Node node={model.job} x={colX[1]} y={jobY} active={active} />
          {model.outputs.map((n, i) => (
            <Node key={n.id} node={n} x={colX[2]} y={outY[i]} />
          ))}
        </>
      )}
    </div>
  )
}

function Node({
  node,
  x,
  y,
  active,
}: {
  node: GraphNode
  x: number
  y: number
  active?: boolean
}) {
  const isJob = node.kind === 'job'
  const dot =
    node.kind === 'input'
      ? 'bg-faint'
      : node.kind === 'job'
        ? 'bg-brand'
        : 'bg-flow'
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, transform: 'translate(-50%,-50%)', width: 144 }}
    >
      <div
        className={cn(
          'flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left',
          'transition-all duration-300',
          isJob
            ? 'border-brand/30 bg-brand-soft shadow-[0_8px_24px_-12px_rgba(36,86,246,0.5)]'
            : 'border-line bg-surface shadow-card',
          isJob && active && 'animate-[node-pulse_1.1s_ease-out_infinite]',
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className={cn('size-1.5 rounded-full', dot)} />
          <span
            className={cn(
              'truncate font-mono text-[12px] font-medium',
              isJob ? 'text-brand-strong' : 'text-ink',
            )}
            title={node.label}
          >
            {node.label}
          </span>
        </div>
        {node.sub && (
          <span className="truncate pl-3 text-[10.5px] text-faint" title={node.sub}>
            {node.sub}
          </span>
        )}
      </div>
    </div>
  )
}
