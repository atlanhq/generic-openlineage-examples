import type { OLRunEvent } from './openlineage'
import type { AtlanSession } from './session'
import { lineageEndpoint } from './session'
import { atlanFetch } from './atlan-api'

export interface SendResult {
  ok: boolean
  accepted: number
  total: number
  status?: number
  message: string
  /** Raw / parsed response body shown to the user on failure. */
  detail?: string
  demo: boolean
}

/** Pull a human message + a pretty body out of an error response. */
function parseError(body?: string): { message?: string; detail?: string } {
  if (!body) return {}
  try {
    const j = JSON.parse(body) as Record<string, unknown>
    const raw = j.error_message ?? j.message ?? j.error ?? j.error_code
    return {
      message: typeof raw === 'string' ? raw : undefined,
      detail: JSON.stringify(j, null, 2),
    }
  } catch {
    return { detail: body }
  }
}

/** The exact curl(s) a customer could paste into a terminal — bridges the old flow. */
export function buildCurl(events: OLRunEvent[], session: AtlanSession): string {
  const endpoint = lineageEndpoint(session)
  return events
    .map((evt) => {
      const body = JSON.stringify(evt, null, 2)
      return [
        `curl --location '${endpoint}' \\`,
        `--header 'Content-Type: application/json' \\`,
        `--header 'Authorization: Bearer ${session.apiToken}' \\`,
        `--data '${body}'`,
      ].join('\n')
    })
    .join('\n\n')
}

/**
 * Send the events to Atlan. In a real (injected) session this POSTs to the
 * tenant's OpenLineage endpoint using the logged-in token. In demo/local mode
 * there is no live tenant, so we simulate a realistic round-trip instead.
 */
export async function sendEvents(
  events: OLRunEvent[],
  session: AtlanSession,
): Promise<SendResult> {
  if (session.mode === 'simulate') {
    await delay(420 + events.length * 320)
    return {
      ok: true,
      accepted: events.length,
      total: events.length,
      status: 200,
      demo: true,
      message: 'Simulated — set a token and enable Live in session settings to ingest for real.',
    }
  }

  const path = `/events/openlineage/${session.connection.type}/api/v1/lineage`
  let accepted = 0
  let lastStatus: number | undefined
  let failBody: string | undefined
  try {
    for (const evt of events) {
      const res = await atlanFetch(session.tenantHost, path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.apiToken}`,
        },
        body: JSON.stringify(evt),
      })
      lastStatus = res.status
      if (res.ok) {
        accepted++
        continue
      }
      try {
        failBody = await res.text()
      } catch {
        /* ignore */
      }
      break
    }
  } catch (err) {
    return {
      ok: false,
      accepted,
      total: events.length,
      status: lastStatus,
      demo: false,
      message: err instanceof Error ? err.message : 'Network error',
      detail:
        'The request never reached Atlan. From localhost this is usually CORS or DNS, not a problem with the payload.',
    }
  }

  if (accepted === events.length) {
    return {
      ok: true,
      accepted,
      total: events.length,
      status: lastStatus,
      demo: false,
      message: 'All events accepted by Atlan.',
    }
  }

  const parsed = parseError(failBody)
  return {
    ok: false,
    accepted,
    total: events.length,
    status: lastStatus,
    demo: false,
    message: parsed.message ?? `Atlan rejected the request (HTTP ${lastStatus ?? '—'}).`,
    detail: parsed.detail,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
