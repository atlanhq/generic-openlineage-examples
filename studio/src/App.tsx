import { useCallback, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { ExampleView } from '@/components/ExampleView'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import { ConnectionSwitcher } from '@/components/ConnectionSwitcher'
import { AtlanMark, Mark } from '@/components/Mark'
import { getExample } from '@/data/examples'
import {
  isOnboarded,
  loadSession,
  switchConnection,
  type AtlanSession,
} from '@/lib/session'
import { listConnections, type AtlanConnection } from '@/lib/atlan-api'

const ATLAN_DOCS_URL =
  'https://docs.atlan.com/apps/connectors/lineage/generic-openlineage/how-tos/integrate-generic-openlineage'

function App() {
  const [session, setSession] = useState<AtlanSession>(() => loadSession())
  const initialOnboarded = isOnboarded()
  const [onboarded, setOnboarded] = useState(initialOnboarded)
  const [showOnboarding, setShowOnboarding] = useState(!initialOnboarded)
  const [connections, setConnections] = useState<AtlanConnection[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState(getExample('table-lineage').id)
  const example = getExample(selectedId)

  const refresh = useCallback(async () => {
    if (!session.apiToken) return
    setRefreshing(true)
    try {
      const conns = await listConnections(session.tenantHost, session.apiToken)
      setConnections(conns)
    } catch {
      /* surface in switcher could be added later */
    } finally {
      setRefreshing(false)
    }
  }, [session.tenantHost, session.apiToken])

  function handleOnboardDone(s: AtlanSession, conns: AtlanConnection[]) {
    setSession(s)
    setConnections(conns)
    setOnboarded(true)
    setShowOnboarding(false)
  }

  function handleSwitch(c: AtlanConnection) {
    setSession(switchConnection({ name: c.name, qualifiedName: c.qualifiedName }))
  }

  /** "Reconnect to a different Atlan" — open onboarding *without* clearing the
   *  current session, so the user can cancel back if they change their mind. */
  function handleReconnect() {
    setShowOnboarding(true)
  }

  function handleCancelOnboarding() {
    setShowOnboarding(false)
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onDone={handleOnboardDone}
        onCancel={onboarded ? handleCancelOnboarding : undefined}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col bg-canvas text-ink">
      <Header
        session={session}
        connections={connections}
        refreshing={refreshing}
        onSwitch={handleSwitch}
        onRefresh={refresh}
        onReconnect={handleReconnect}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[284px] shrink-0 border-r border-line bg-surface/50 lg:block">
          <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <main className="shell-glow relative flex-1 overflow-y-auto">
          <ExampleView
            example={example}
            session={session}
            connections={connections}
          />
        </main>
      </div>
    </div>
  )
}

function Header({
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
  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-lg border border-line bg-surface shadow-card">
          <Mark className="size-5" />
        </div>
        <div className="leading-none">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold tracking-tight text-ink">
              OpenLineage Studio
            </span>
            <span
              className="inline-flex items-center gap-1 text-[10.5px] text-faint"
              title="A free tool from Atlan"
            >
              <AtlanMark className="size-3 rounded-[3px]" />
              by Atlan
            </span>
          </div>
          <div className="mt-1 hidden text-[11px] text-faint sm:block">
            Send events. Watch lineage appear.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href={ATLAN_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-ink sm:inline-flex"
        >
          <BookOpen className="size-3.5" />
          Docs
        </a>
        <div className="h-5 w-px bg-line" />
        <ConnectionSwitcher
          session={session}
          connections={connections}
          refreshing={refreshing}
          onSwitch={onSwitch}
          onRefresh={onRefresh}
          onReconnect={onReconnect}
        />
      </div>
    </header>
  )
}

export default App
