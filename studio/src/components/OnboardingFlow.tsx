import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { AtlanMark, Mark } from '@/components/Mark'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import {
  AtlanApiError,
  classifyToken,
  createConnectionUrl,
  generateApiKeyUrl,
  listConnections,
  normalizeHost,
  type AtlanConnection,
} from '@/lib/atlan-api'
import { completeOnboarding, type AtlanSession } from '@/lib/session'

type StepId = 'tenant' | 'token' | 'connection'

const TENANT_RE = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/

export function OnboardingFlow({
  onDone,
  onCancel,
}: {
  onDone: (s: AtlanSession, connections: AtlanConnection[]) => void
  /** Bail-out shown only when the user has a previous session to fall back to. */
  onCancel?: () => void
}) {
  const [step, setStep] = useState<StepId>('tenant')
  const [prefix, setPrefix] = useState('')
  const [token, setToken] = useState('')
  const [tokenIssue, setTokenIssue] = useState<string | null>(null)
  const [connections, setConnections] = useState<AtlanConnection[] | null>(null)
  const [chosenGuid, setChosenGuid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const host = useMemo(() => normalizeHost(prefix), [prefix])
  const tenantValid = TENANT_RE.test(prefix.trim().toLowerCase())
  const tokenClassified = token ? classifyToken(token) : null
  const tokenLooksOk = !!tokenClassified?.ok

  function back() {
    setError(null)
    if (step === 'token') setStep('tenant')
    else if (step === 'connection') setStep('token')
  }

  async function verifyTokenAndContinue() {
    setError(null)
    const t = classifyToken(token)
    if (!t.ok) {
      setTokenIssue(t.reason)
      return
    }
    setTokenIssue(null)
    setBusy(true)
    try {
      const conns = await listConnections(host, token.trim())
      setConnections(conns)
      setChosenGuid(conns[0]?.guid ?? null)
      setStep('connection')
    } catch (e) {
      if (e instanceof AtlanApiError) {
        if (e.status === 401 || e.status === 403) {
          setError(
            "Atlan rejected this token. Make sure it's a current API key for this tenant.",
          )
        } else if (e.status === 502 || e.status === 504) {
          setError(
            `Couldn't reach Atlan (HTTP ${e.status}). The local proxy timed out talking to ${host} — check the URL, your network, and any corporate TLS proxy.${e.body ? ` Upstream said: ${e.body.slice(0, 200)}` : ''}`,
          )
        } else {
          setError(
            `Atlan responded with HTTP ${e.status}.${e.body ? ` Body: ${e.body.slice(0, 300)}` : ''}`,
          )
        }
      } else {
        setError(
          `Couldn't reach Atlan. ${e instanceof Error ? e.message : 'Network error.'} Check the URL and your network.`,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    setBusy(true)
    setError(null)
    try {
      const conns = await listConnections(host, token.trim())
      setConnections(conns)
      if (conns.length && !conns.find((c) => c.guid === chosenGuid)) {
        setChosenGuid(conns[0].guid)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach Atlan.")
    } finally {
      setBusy(false)
    }
  }

  function finish() {
    const chosen = connections?.find((c) => c.guid === chosenGuid)
    if (!chosen) return
    const next = completeOnboarding({
      tenantHost: host,
      apiToken: token.trim(),
      connection: {
        name: chosen.name,
        qualifiedName: chosen.qualifiedName,
        guid: chosen.guid,
      },
    })
    onDone(next, connections ?? [])
  }

  const idx = step === 'tenant' ? 0 : step === 'token' ? 1 : 2

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-canvas text-ink">
      <div className="onboarding-bg pointer-events-none absolute inset-0" />

      <header className="relative z-10 flex items-center justify-between px-8 pb-2 pt-7">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg border border-line bg-surface shadow-card">
            <Mark className="size-5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13.5px] font-semibold tracking-tight text-ink">
              OpenLineage Studio
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px] text-faint">
              <AtlanMark className="size-3 self-center rounded-[3px]" />
              by Atlan
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StepIndicator index={idx} total={3} />
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-md p-1 text-faint transition-colors hover:bg-canvas-deep hover:text-ink"
              aria-label="Cancel and keep current session"
              title="Keep current session"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div
          key={step}
          className="w-full max-w-[480px] animate-[step-in_0.55s_cubic-bezier(0.2,0.7,0.2,1)_both]"
        >
          {step === 'tenant' && (
            <StepTenant
              prefix={prefix}
              setPrefix={setPrefix}
              valid={tenantValid}
              onContinue={() => setStep('token')}
            />
          )}
          {step === 'token' && (
            <StepToken
              host={host}
              token={token}
              setToken={(v) => {
                setToken(v)
                setTokenIssue(null)
                setError(null)
              }}
              tokenIssue={tokenIssue}
              tokenLooksOk={tokenLooksOk}
              error={error}
              busy={busy}
              onBack={back}
              onContinue={verifyTokenAndContinue}
            />
          )}
          {step === 'connection' && (
            <StepConnection
              host={host}
              connections={connections ?? []}
              chosenGuid={chosenGuid}
              setChosen={setChosenGuid}
              busy={busy}
              error={error}
              onRefresh={refresh}
              onBack={back}
              onFinish={finish}
            />
          )}
        </div>
      </main>
    </div>
  )
}

/* ============================== UI ================================ */

function StepIndicator({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 rounded-full transition-all duration-500 ease-out',
            i < index && 'w-6 bg-brand/60',
            i === index && 'w-12 bg-brand',
            i > index && 'w-6 bg-line-strong',
          )}
        />
      ))}
    </div>
  )
}

function Heading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string
  title: string
  sub: ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flow-strong">
        {eyebrow}
      </div>
      <h1 className="mt-3 text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-ink">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{sub}</p>
    </div>
  )
}

function Footer({
  onBack,
  primary,
}: {
  onBack?: () => void
  primary: ReactNode
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        )}
      </div>
      {primary}
    </div>
  )
}

function ErrorBubble({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 animate-[rise_0.35s_cubic-bezier(0.2,0.7,0.2,1)_both] rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-[12.5px] leading-snug text-danger">
      {children}
    </div>
  )
}

/* --------------------------- step 1 ------------------------------- */

function StepTenant({
  prefix,
  setPrefix,
  valid,
  onContinue,
}: {
  prefix: string
  setPrefix: (v: string) => void
  valid: boolean
  onContinue: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onContinue()
      }}
    >
      <Heading
        eyebrow="Step 1 of 3"
        title="Where's your Atlan?"
        sub="Type the part before .atlan.com — like acme or pipelines08."
      />

      <div
        className={cn(
          'group flex items-center rounded-xl border bg-surface px-5 py-4 shadow-card transition-all duration-200',
          'border-line-strong focus-within:border-brand',
        )}
      >
        <input
          autoFocus
          value={prefix}
          onChange={(e) =>
            setPrefix(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))
          }
          placeholder="your-tenant"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-mono text-[22px] tracking-tight text-ink placeholder:text-faint/60 focus:outline-none"
        />
        <span className="ml-1 select-none font-mono text-[22px] text-faint">
          .atlan.com
        </span>
      </div>
      <p className="mt-2 pl-1 text-[12px] text-faint">
        Letters, numbers, and dashes.
      </p>

      <Footer
        primary={
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => valid && onContinue()}
            className="hover:-translate-y-px"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        }
      />
    </form>
  )
}

/* --------------------------- step 2 ------------------------------- */

function StepToken({
  host,
  token,
  setToken,
  tokenIssue,
  tokenLooksOk,
  error,
  busy,
  onBack,
  onContinue,
}: {
  host: string
  token: string
  setToken: (v: string) => void
  tokenIssue: string | null
  tokenLooksOk: boolean
  error: string | null
  busy: boolean
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div>
      <Heading
        eyebrow="Step 2 of 3"
        title="Connect with an API key"
        sub={
          <>
            Paste an Atlan <strong className="font-semibold text-ink-soft">API key</strong>{' '}
            (not a short-lived UI session token). It stays on your machine.
          </>
        }
      />

      <div className="flex flex-col gap-2">
        <div
          className={cn(
            'rounded-xl border bg-surface shadow-card transition-all duration-200',
            tokenIssue
              ? 'border-danger/50 ring-4 ring-danger-soft'
              : tokenLooksOk
                ? 'border-ok/50 ring-4 ring-ok-soft/60'
                : 'border-line-strong focus-within:border-brand',
          )}
        >
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={4}
            placeholder="eyJhbGciOiJSUzI1NiIs..."
            spellCheck={false}
            autoComplete="off"
            className="block h-[112px] w-full resize-none rounded-xl bg-transparent px-4 py-3 font-mono text-[12.5px] leading-relaxed tracking-tight text-ink placeholder:text-faint/60 focus:outline-none"
          />
          {tokenLooksOk && (
            <div className="flex items-center gap-1.5 border-t border-line px-4 py-2 text-[11.5px] text-ok">
              <ShieldCheck className="size-3.5" />
              Looks like a valid API key.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <a
            href={generateApiKeyUrl(host)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand transition-colors hover:text-brand-strong"
          >
            <Plus className="size-3.5" />
            Generate a new API key
            <ArrowUpRight className="size-3" />
          </a>
        </div>

        {tokenIssue && <ErrorBubble>{tokenIssue}</ErrorBubble>}
        {error && <ErrorBubble>{error}</ErrorBubble>}
      </div>

      <Footer
        onBack={onBack}
        primary={
          <Button
            variant="primary"
            disabled={!token || busy}
            loading={busy}
            onClick={onContinue}
            className="hover:-translate-y-px"
          >
            {busy ? 'Verifying' : 'Verify & continue'}
            {!busy && <ArrowRight className="size-4" />}
          </Button>
        }
      />
    </div>
  )
}

/* --------------------------- step 3 ------------------------------- */

function StepConnection({
  host,
  connections,
  chosenGuid,
  setChosen,
  busy,
  error,
  onRefresh,
  onBack,
  onFinish,
}: {
  host: string
  connections: AtlanConnection[]
  chosenGuid: string | null
  setChosen: (guid: string) => void
  busy: boolean
  error: string | null
  onRefresh: () => void
  onBack: () => void
  onFinish: () => void
}) {
  const empty = connections.length === 0
  return (
    <div>
      <Heading
        eyebrow="Step 3 of 3"
        title={empty ? 'No connections yet' : 'Pick a connection'}
        sub={
          empty
            ? 'No generic-openlineage connections exist in this Atlan yet. Create one and come back.'
            : `Found ${connections.length} generic-openlineage connection${
                connections.length === 1 ? '' : 's'
              } in your Atlan.`
        }
      />

      {empty ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <div className="grid size-12 place-items-center rounded-xl border border-line bg-canvas">
            <Plug className="size-5 text-faint" />
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted">
            Create a generic-openlineage connection in Atlan, then click refresh
            below.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href={createConnectionUrl(host)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[12.5px] font-medium text-white shadow-brand transition-transform hover:-translate-y-px"
            >
              Open Atlan to create one
              <ArrowUpRight className="size-3.5" />
            </a>
            <Button
              size="sm"
              variant="secondary"
              icon={busy ? Loader2 : RefreshCw}
              loading={busy}
              onClick={onRefresh}
            >
              {busy ? 'Checking' : 'I created one, refresh'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex max-h-[44vh] flex-col gap-2 overflow-y-auto pr-1">
          {connections.map((c, i) => (
            <ConnectionCard
              key={c.guid || c.qualifiedName || i}
              connection={c}
              selected={c.guid === chosenGuid}
              onSelect={() => setChosen(c.guid)}
              delayMs={i * 40}
            />
          ))}
        </div>
      )}

      {error && <ErrorBubble>{error}</ErrorBubble>}

      <Footer
        onBack={onBack}
        primary={
          empty ? (
            <Button
              variant="secondary"
              icon={busy ? Loader2 : RefreshCw}
              loading={busy}
              onClick={onRefresh}
            >
              Refresh
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!chosenGuid}
              onClick={onFinish}
              icon={Sparkles}
              className="hover:-translate-y-px"
            >
              Finish setup
            </Button>
          )
        }
      />
    </div>
  )
}

function ConnectionCard({
  connection,
  selected,
  onSelect,
  delayMs,
}: {
  connection: AtlanConnection
  selected: boolean
  onSelect: () => void
  delayMs: number
}) {
  return (
    <button
      onClick={onSelect}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-left shadow-card transition-all duration-200',
        'animate-[rise_0.45s_cubic-bezier(0.2,0.7,0.2,1)_both]',
        'hover:-translate-y-px hover:border-faint',
        selected
          ? 'border-brand ring-4 ring-brand-ring/40'
          : 'border-line-strong',
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg border transition-colors',
          selected
            ? 'border-brand/30 bg-brand-soft text-brand'
            : 'border-line bg-canvas text-muted',
        )}
      >
        <Plug className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">
          {connection.name}
        </span>
        <span className="block truncate text-[12px] text-muted">
          {connection.createdAt
            ? `created ${timeAgo(connection.createdAt)}`
            : 'generic-openlineage connection'}
        </span>
      </span>
      <span
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-full border transition-all duration-200',
          selected
            ? 'scale-100 border-brand bg-brand text-white'
            : 'scale-90 border-line-strong text-transparent group-hover:border-faint',
        )}
        aria-hidden
      >
        <Check className="size-3.5" />
      </span>
    </button>
  )
}
