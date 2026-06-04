import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  RefreshCw,
  Sparkles,
  Zap,
  Clock3,
  ArrowUpRight,
  Radio,
} from 'lucide-react'
import { Button, Card, Chip, Field, Input } from '@/components/ui'
import { LineageGraph } from '@/components/LineageGraph'
import { PayloadPanel } from '@/components/PayloadPanel'
import { ResultPanel } from '@/components/ResultPanel'
import { DatasetSection } from '@/components/DatasetSection'
import { ConnectionSelect } from '@/components/ConnectionSelect'
import { Mark } from '@/components/Mark'
import {
  buildLineageModel,
  type DatasetSpec,
  type Example,
} from '@/data/examples'
import { lineageEndpoint, type AtlanSession } from '@/lib/session'
import { sendEvents, type SendResult } from '@/lib/sender'
import { generateJobName, newRunId } from '@/lib/utils'
import type { AtlanConnection } from '@/lib/atlan-api'

const DURATION = 92_000
type Kind = 'input' | 'output'

interface DsState {
  id: string
  inputs: DatasetSpec[]
  outputs: DatasetSpec[]
}

export function ExampleView({
  example,
  session,
  connections,
}: {
  example: Example
  session: AtlanSession
  connections: AtlanConnection[]
}) {
  const [jobName, setJobName] = useState(() => generateJobName())
  const [jobNamespace, setJobNamespace] = useState(session.connection.name)
  const [ds, setDs] = useState<DsState>(() => ({
    id: example.id,
    inputs: example.defaultInputs,
    outputs: example.defaultOutputs,
  }))
  const [runId, setRunId] = useState(() => newRunId())
  const [stamp, setStamp] = useState(() => Date.now())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)

  useEffect(() => {
    setDs({
      id: example.id,
      inputs: example.defaultInputs,
      outputs: example.defaultOutputs,
    })
    setResult(null)
  }, [example.id, example.defaultInputs, example.defaultOutputs])

  // Track header-level connection switches: if the active connection changes,
  // pull the form field along so it stays in sync with the JSON preview.
  useEffect(() => {
    setJobNamespace(session.connection.name)
  }, [session.connection.qualifiedName, session.connection.name])

  // Always read against the current recipe so a switch never shows stale rows.
  const current: DsState =
    ds.id === example.id
      ? ds
      : { id: example.id, inputs: example.defaultInputs, outputs: example.defaultOutputs }
  const { inputs, outputs } = current

  function mutate(next: Partial<Pick<DsState, 'inputs' | 'outputs'>>) {
    setDs({ ...current, ...next, id: example.id })
  }

  function addDataset(kind: Kind) {
    const list = kind === 'input' ? inputs : outputs
    const ns = list.length ? list[list.length - 1].namespace : ''
    const row: DatasetSpec = { name: '', namespace: ns }
    mutate(kind === 'input' ? { inputs: [...inputs, row] } : { outputs: [...outputs, row] })
  }

  function removeDataset(kind: Kind, index: number) {
    const list = kind === 'input' ? inputs : outputs
    const next = list.filter((_, i) => i !== index)
    mutate(kind === 'input' ? { inputs: next } : { outputs: next })
  }

  function updateDataset(
    kind: Kind,
    index: number,
    field: 'name' | 'namespace',
    value: string,
  ) {
    const list = kind === 'input' ? inputs : outputs
    const next = list.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    mutate(kind === 'input' ? { inputs: next } : { outputs: next })
  }

  const ctx = useMemo(
    () => ({
      jobName,
      jobNamespace,
      runId,
      startTime: new Date(stamp - DURATION).toISOString(),
      endTime: new Date(stamp).toISOString(),
    }),
    [jobName, jobNamespace, runId, stamp],
  )

  const events = useMemo(
    () => example.build(inputs, outputs, ctx),
    [example, inputs, outputs, ctx],
  )
  const model = useMemo(
    () => buildLineageModel(inputs, outputs, example.jobLabel),
    [inputs, outputs, example.jobLabel],
  )

  async function handleSend() {
    const freshRun = newRunId()
    const freshStamp = Date.now()
    const sendCtx = {
      jobName,
      jobNamespace,
      runId: freshRun,
      startTime: new Date(freshStamp - DURATION).toISOString(),
      endTime: new Date(freshStamp).toISOString(),
    }
    const toSend = example.build(inputs, outputs, sendCtx)
    setRunId(freshRun)
    setStamp(freshStamp)
    setSending(true)
    setResult(null)
    try {
      setResult(await sendEvents(toSend, session))
    } finally {
      setSending(false)
    }
  }

  const eventCount = events.length
  const host = session.tenantHost.replace(/^https?:\/\//, '')

  return (
    <div className="relative z-[1] mx-auto w-full max-w-[1180px] px-6 py-8 lg:px-10">
      <header
        key={example.id}
        className="animate-[reveal_0.5s_cubic-bezier(0.2,0.7,0.2,1)_both]"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          <span>{example.category}</span>
          <span className="text-line-strong">/</span>
          <span className="font-mono lowercase tracking-normal text-flow-strong">
            {example.integration.toLowerCase()}
          </span>
        </div>
        <h1 className="mt-2 text-[27px] font-bold leading-tight tracking-[-0.02em] text-ink">
          {example.title}
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
          {example.description}
        </p>
      </header>

      {example.status === 'soon' ? (
        <ComingSoon example={example} />
      ) : (
        <div
          key={example.id + ':body'}
          className="mt-7 grid animate-[reveal_0.55s_cubic-bezier(0.2,0.7,0.2,1)_both] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)]"
        >
          {/* ---------------- left: configure + send ---------------- */}
          <div className="flex flex-col gap-5">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Configure</h2>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Prefilled — change anything you like.
                  </p>
                </div>
                <Chip tone="flow" icon={Sparkles}>
                  auto-filled
                </Chip>
              </div>

              <div className="flex flex-col gap-4">
                <Field
                  label="Run name"
                  htmlFor="jobName"
                  help="Auto-generated, ending in a random 6-digit suffix."
                  trailing={
                    <button
                      onClick={() => setJobName(generateJobName())}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand transition-colors hover:text-brand-strong"
                    >
                      <RefreshCw className="size-3" />
                      Regenerate
                    </button>
                  }
                >
                  <Input
                    id="jobName"
                    mono
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                  />
                </Field>

                <Field
                  label="Connection"
                  htmlFor="jobNs"
                  help="The Atlan connection events route to — also the OpenLineage job namespace."
                  trailing={
                    <span className="font-mono text-[11px] text-faint">
                      {session.connection.type}
                    </span>
                  }
                >
                  <ConnectionSelect
                    id="jobNs"
                    connections={connections}
                    value={jobNamespace}
                    onChange={setJobNamespace}
                  />
                </Field>

                <div className="my-1 h-px bg-line" />

                <DatasetSection
                  title="Sources"
                  tone="input"
                  items={inputs}
                  min={example.minInputs}
                  addLabel="Add source"
                  emptyHint={example.note ?? 'No sources — this run produces data from scratch.'}
                  onAdd={() => addDataset('input')}
                  onChange={(i, f, v) => updateDataset('input', i, f, v)}
                  onRemove={(i) => removeDataset('input', i)}
                />

                <div className="flex items-center gap-3 py-0.5">
                  <div className="h-px flex-1 bg-line" />
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-faint">
                    flows into
                  </span>
                  <div className="h-px flex-1 bg-line" />
                </div>

                <DatasetSection
                  title="Targets"
                  tone="output"
                  items={outputs}
                  min={example.minOutputs}
                  addLabel="Add target"
                  emptyHint="No targets yet."
                  onAdd={() => addDataset('output')}
                  onChange={(i, f, v) => updateDataset('output', i, f, v)}
                  onRemove={(i) => removeDataset('output', i)}
                />
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  icon={Zap}
                  loading={sending}
                  onClick={handleSend}
                  disabled={eventCount === 0}
                >
                  {sending
                    ? 'Sending…'
                    : `Send ${eventCount} event${eventCount === 1 ? '' : 's'} to Atlan`}
                </Button>
                {session.mode === 'live' ? (
                  <div className="inline-flex items-center gap-1.5 text-[12px] text-muted">
                    <Radio className="size-3.5 text-ok" />
                    Live — sending to <span className="font-mono text-ink-soft">{host}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-[12px] text-muted">
                    <KeyRound className="size-3.5 text-faint" />
                    Simulate mode — uses your Atlan login, no API key. Set a token to send for real.
                  </div>
                )}
              </div>

              {result && (
                <ResultPanel
                  result={result}
                  session={session}
                  onClose={() => setResult(null)}
                />
              )}
            </div>
          </div>

          {/* ---------------- right: live preview ---------------- */}
          <div className="flex flex-col gap-5 self-start lg:sticky lg:top-6">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="text-[12.5px] font-medium text-ink-soft">
                  Lineage preview
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-flow-strong">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-flow opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-flow" />
                  </span>
                  live
                </span>
              </div>
              <div className="canvas-grid px-3 py-2">
                <LineageGraph model={model} active={sending} />
              </div>
            </Card>

            <PayloadPanel events={events} session={session} />

            <div className="flex items-center gap-2 px-1 text-[11.5px] text-faint">
              <span className="font-medium text-muted">POST</span>
              <code className="truncate font-mono text-[11px] text-muted">
                {lineageEndpoint(session)}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ComingSoon({ example }: { example: Example }) {
  return (
    <Card className="mt-7 flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-xl border border-line bg-canvas">
        <Mark className="size-7" />
      </div>
      <div>
        <div className="flex items-center justify-center gap-2">
          <Clock3 className="size-4 text-faint" />
          <span className="text-[13px] font-semibold text-ink">Coming soon</span>
        </div>
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
          {example.description}
        </p>
      </div>
      <a
        href="https://docs.atlan.com/apps/connectors/lineage/generic-openlineage/how-tos/integrate-generic-openlineage"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand transition-colors hover:text-brand-strong"
      >
        Read the docs
        <ArrowUpRight className="size-3.5" />
      </a>
    </Card>
  )
}
