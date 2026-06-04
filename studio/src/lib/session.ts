/**
 * The Atlan session.
 *
 * In production this page is opened *from inside Atlan* right after a connection
 * is created, so everything is already known and injected as
 * `window.__ATLAN_SESSION__`:
 *   - tenant host, API token (from the logged-in session — never pasted),
 *     the connection just created, and the user.
 *
 * Resolution order: injected (prod)  >  local testing override (localStorage)
 *   >  Vite env  >  a clearly-labelled demo session.
 *
 * The localStorage override exists ONLY for testing / demoing this page outside
 * Atlan (see the "Session settings" panel). It is not part of the shipped flow.
 */

export type SessionMode = 'live' | 'simulate'

export interface AtlanConnection {
  name: string
  type: string
  qualifiedName: string
}

export interface AtlanUser {
  name: string
  email: string
}

export interface AtlanSession {
  tenantHost: string
  apiToken: string
  user: AtlanUser
  connection: AtlanConnection
  /** 'live' actually POSTs to the tenant; 'simulate' fakes a successful round-trip. */
  mode: SessionMode
  isDemo: boolean
}

export interface SessionOverride {
  tenantHost?: string
  apiToken?: string
  connectionName?: string
  connectionQualifiedName?: string
  userName?: string
  /** When true (and a token is set), actually send to the tenant. */
  live?: boolean
}

interface InjectedSession {
  tenantHost?: string
  apiToken?: string
  user?: Partial<AtlanUser>
  connection?: Partial<AtlanConnection>
}

declare global {
  interface Window {
    __ATLAN_SESSION__?: InjectedSession
  }
}

const OVERRIDE_KEY = 'olstudio.session.override'
const ONBOARDED_KEY = 'olstudio.onboarded'

const DEMO = {
  tenantHost: 'https://playground.atlan.com',
  apiToken: '',
  user: { name: 'Demo User', email: 'demo@example.com' },
  connection: {
    name: 'default',
    type: 'generic-openlineage',
    qualifiedName: 'default/generic-openlineage/1730000000',
  },
}

function fromEnv() {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  return {
    tenantHost: env.VITE_ATLAN_HOST,
    apiToken: env.VITE_ATLAN_TOKEN,
    connectionName: env.VITE_ATLAN_CONNECTION,
    connectionQualifiedName: env.VITE_ATLAN_CONNECTION_QN,
  }
}

export function getStoredOverride(): SessionOverride | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    return raw ? (JSON.parse(raw) as SessionOverride) : null
  } catch {
    return null
  }
}

export function loadSession(): AtlanSession {
  const injected =
    typeof window !== 'undefined' ? window.__ATLAN_SESSION__ : undefined
  const ov = getStoredOverride()
  const env = fromEnv()

  const apiToken =
    injected?.apiToken ?? ov?.apiToken ?? env.apiToken ?? DEMO.apiToken
  const mode: SessionMode = injected?.apiToken
    ? 'live'
    : ov?.live && ov.apiToken
      ? 'live'
      : 'simulate'

  return {
    tenantHost:
      injected?.tenantHost ?? ov?.tenantHost ?? env.tenantHost ?? DEMO.tenantHost,
    apiToken,
    user: {
      name: injected?.user?.name ?? ov?.userName ?? DEMO.user.name,
      email: injected?.user?.email ?? DEMO.user.email,
    },
    connection: {
      name:
        injected?.connection?.name ??
        ov?.connectionName ??
        env.connectionName ??
        DEMO.connection.name,
      type: injected?.connection?.type ?? DEMO.connection.type,
      qualifiedName:
        injected?.connection?.qualifiedName ??
        ov?.connectionQualifiedName ??
        env.connectionQualifiedName ??
        DEMO.connection.qualifiedName,
    },
    mode,
    isDemo: mode === 'simulate',
  }
}

export function saveOverride(patch: SessionOverride): AtlanSession {
  const next = { ...(getStoredOverride() ?? {}), ...patch }
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return loadSession()
}

export function clearOverride(): AtlanSession {
  try {
    localStorage.removeItem(OVERRIDE_KEY)
  } catch {
    /* ignore */
  }
  return loadSession()
}

/** True once the user has completed the first-run onboarding wizard. */
export function isOnboarded(): boolean {
  if (typeof window !== 'undefined' && window.__ATLAN_SESSION__?.apiToken) {
    return true
  }
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

export interface OnboardingResult {
  tenantHost: string
  apiToken: string
  connection: { name: string; qualifiedName: string; guid?: string }
}

/** Persist the onboarding selection and mark first-run as done. */
export function completeOnboarding(r: OnboardingResult): AtlanSession {
  saveOverride({
    tenantHost: r.tenantHost,
    apiToken: r.apiToken,
    connectionName: r.connection.name,
    connectionQualifiedName: r.connection.qualifiedName,
    live: true,
  })
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    /* ignore */
  }
  return loadSession()
}

/** Wipe everything — used by the "Reconnect to a different Atlan" action. */
export function resetOnboarding(): AtlanSession {
  try {
    localStorage.removeItem(ONBOARDED_KEY)
    localStorage.removeItem(OVERRIDE_KEY)
  } catch {
    /* ignore */
  }
  return loadSession()
}

/** Swap just the connection on an already-onboarded session. */
export function switchConnection(c: {
  name: string
  qualifiedName: string
}): AtlanSession {
  return saveOverride({
    connectionName: c.name,
    connectionQualifiedName: c.qualifiedName,
  })
}

/** The OpenLineage ingest endpoint for this tenant + connector. */
export function lineageEndpoint(s: AtlanSession): string {
  return `${s.tenantHost.replace(/\/$/, '')}/events/openlineage/${s.connection.type}/api/v1/lineage`
}

/**
 * Deep link to the Atlan assets list, filtered to generic-openlineage and
 * sorted by latest modified — so the assets the studio just produced surface
 * at the top. Atlan's UI expects `filterCriteria` to be a *double*
 * URL-encoded JSON blob.
 */
const ASSETS_FILTER = {
  filters: {
    hierarchy: {
      connectorName: 'generic-openlineage',
      attributeValue: '',
      attributeName: '',
    },
  },
  sortingOptions: '__modificationTimestamp-desc',
}
const ASSETS_QS = encodeURIComponent(
  encodeURIComponent(JSON.stringify(ASSETS_FILTER)),
)

export function assetsDeepLink(s: AtlanSession): string {
  return `${s.tenantHost.replace(/\/$/, '')}/assets?filterCriteria=${ASSETS_QS}`
}
