/**
 * Calls into a real Atlan tenant from the browser.
 *
 * Whenever the target tenant's origin differs from our own (the localhost case
 * — Vite dev, `node serve.mjs`, or the Electron wrapper) we route through the
 * /atlan-proxy/* middleware with an `X-Atlan-Target` header so cross-origin
 * requests don't get blocked by CORS. When the page is served from the same
 * origin as the tenant (the embedded-in-Atlan production case), we fall back
 * to direct fetch — same-origin, no proxy needed.
 */

function shouldProxy(host: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URL(host).origin !== window.location.origin
  } catch {
    return true
  }
}

export function atlanFetch(
  host: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  const cleanHost = host.replace(/\/$/, '')
  if (shouldProxy(cleanHost)) {
    headers.set('X-Atlan-Target', cleanHost)
    return fetch(`/atlan-proxy${path}`, { ...init, headers })
  }
  return fetch(`${cleanHost}${path}`, { ...init, headers })
}

/* ----------------------------- JWT --------------------------------- */

export interface JwtClaims {
  exp?: number
  azp?: string
  iss?: string
  preferred_username?: string
  [k: string]: unknown
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as JwtClaims
  } catch {
    return null
  }
}

/**
 * Atlan's API keys are JWTs whose `azp` claim starts with `apikey-`. Short-lived
 * UI session tokens have a different `azp` and an expiry minutes from now.
 */
export function classifyToken(
  token: string,
):
  | { ok: true; claims: JwtClaims }
  | { ok: false; reason: string } {
  const t = token.trim()
  if (!t) return { ok: false, reason: 'Paste an API key to continue.' }
  const claims = decodeJwt(t)
  if (!claims) return { ok: false, reason: "That doesn't look like a JWT." }
  const azp = claims.azp
  if (typeof azp !== 'string' || !azp.startsWith('apikey-')) {
    return {
      ok: false,
      reason:
        'This looks like a short-lived UI session token. Please generate a long-lived API key (Atlan → /admin/api-access).',
    }
  }
  if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
    return { ok: false, reason: 'This API key has expired. Generate a new one.' }
  }
  return { ok: true, claims }
}

/* -------------------------- Connections ---------------------------- */

export interface AtlanConnection {
  guid: string
  name: string
  qualifiedName: string
  createdAt?: number
}

interface RawEntity {
  guid?: string
  createTime?: number
  attributes?: Record<string, unknown>
}

interface IndexSearchResponse {
  entities?: RawEntity[]
}

/** Body cribbed from the Postman example the user provided. */
const CONNECTION_SEARCH_BODY = {
  attributes: [
    'defaultCredentialGuid',
    'name',
    'connectorName',
    'qualifiedName',
  ],
  suppressLogs: true,
  excludeClassifications: true,
  excludeMeanings: true,
  showSearchScore: false,
  dsl: {
    size: 1000,
    query: {
      bool: {
        filter: {
          bool: {
            must: [
              { terms: { connectorName: ['generic-openlineage'] } },
              { term: { __state: 'ACTIVE' } },
              { term: { '__typeName.keyword': 'Connection' } },
            ],
          },
        },
      },
    },
  },
} as const

export class AtlanApiError extends Error {
  status: number
  body: string
  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'AtlanApiError'
    this.status = status
    this.body = body
  }
}

export async function listConnections(
  host: string,
  token: string,
): Promise<AtlanConnection[]> {
  const res = await atlanFetch(host, '/api/meta/search/indexsearch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(CONNECTION_SEARCH_BODY),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new AtlanApiError(
      `Atlan returned HTTP ${res.status}`,
      res.status,
      body,
    )
  }
  const data = (await res.json()) as IndexSearchResponse
  return (data.entities ?? []).map((e) => {
    const a = (e.attributes ?? {}) as Record<string, unknown>
    const created =
      typeof a.createTime === 'number'
        ? a.createTime
        : typeof e.createTime === 'number'
          ? e.createTime
          : undefined
    return {
      guid: typeof e.guid === 'string' ? e.guid : '',
      name: typeof a.name === 'string' ? a.name : '(unnamed)',
      qualifiedName:
        typeof a.qualifiedName === 'string' ? a.qualifiedName : '',
      createdAt: created,
    }
  })
}

/* ------------------------ deep links ------------------------------- */

export function generateApiKeyUrl(host: string): string {
  return `${host.replace(/\/$/, '')}/admin/api-access`
}

export function createConnectionUrl(host: string): string {
  return `${host.replace(/\/$/, '')}/workflows/setup/atlan-generic-openlineage`
}

export function normalizeHost(prefix: string): string {
  const p = prefix.trim().toLowerCase()
  if (!p) return ''
  if (p.startsWith('http')) return p.replace(/\/$/, '')
  if (p.includes('.')) return `https://${p.replace(/\/$/, '')}`
  return `https://${p}.atlan.com`
}
