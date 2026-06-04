#!/usr/bin/env node
/**
 * Zero-dependency launcher for OpenLineage Studio.
 *
 *   node serve.mjs
 *
 * Serves the prebuilt `dist/` directory and forwards `/atlan-proxy/*` to
 * whatever tenant the browser names in the `X-Atlan-Target` header — the same
 * CORS workaround the Vite dev server uses, ported to Node std-lib so the
 * customer doesn't need `npm install`.
 *
 * Requires Node 20+ (uses global `fetch`).
 */
import { createServer } from 'node:http'
import { stat } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve, extname, normalize } from 'node:path'
import { exec } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, 'dist')
const PROXY_PREFIX = '/atlan-proxy'
const DEFAULT_PORT = Number(process.env.PORT) || 5174
const NO_OPEN =
  process.argv.includes('--no-open') || process.env.NO_OPEN === '1'

if (!existsSync(DIST)) {
  console.error('')
  console.error('  dist/ is missing.')
  console.error(
    '  If you cloned the source, build it once with: npm install && npm run build',
  )
  console.error(
    '  Or grab a prebuilt release that already includes dist/.',
  )
  console.error('')
  process.exit(1)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function safeJoin(root, urlPath) {
  const cleaned = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const resolved = normalize(join(root, cleaned))
  if (!resolved.startsWith(root)) return null
  return resolved
}

async function serveStatic(req, res) {
  let urlPath = req.url ?? '/'
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html'
  const filePath = safeJoin(DIST, urlPath)
  if (!filePath) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }
  try {
    const s = await stat(filePath)
    if (!s.isFile()) throw new Error('not a file')
    const ext = extname(filePath).toLowerCase()
    res.statusCode = 200
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')
    createReadStream(filePath).pipe(res)
  } catch {
    // SPA fallback — let the client router (none today, future-proof) take it.
    try {
      const fallback = join(DIST, 'index.html')
      res.statusCode = 200
      res.setHeader('Content-Type', MIME['.html'])
      createReadStream(fallback).pipe(res)
    } catch {
      res.statusCode = 404
      res.end('Not found')
    }
  }
}

async function proxyAtlan(req, res) {
  const targetHeader = req.headers['x-atlan-target']
  const target = Array.isArray(targetHeader) ? targetHeader[0] : targetHeader
  if (typeof target !== 'string' || !/^https?:\/\//.test(target)) {
    res.statusCode = 400
    res.end('Missing or invalid X-Atlan-Target header')
    return
  }
  try {
    const suffix = (req.url ?? '/').slice(PROXY_PREFIX.length) || '/'
    const url = target.replace(/\/$/, '') + suffix
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue
      if (
        k === 'host' ||
        k === 'x-atlan-target' ||
        k === 'connection' ||
        k === 'content-length' ||
        k.startsWith('sec-')
      )
        continue
      headers.set(k, Array.isArray(v) ? v.join(', ') : String(v))
    }
    const upstream = await fetch(url, {
      method: req.method ?? 'GET',
      headers,
      body:
        req.method && !['GET', 'HEAD'].includes(req.method) ? body : undefined,
    })
    res.statusCode = upstream.status
    upstream.headers.forEach((v, k) => {
      if (
        k === 'transfer-encoding' ||
        k === 'content-encoding' ||
        k.startsWith('access-control')
      )
        return
      res.setHeader(k, v)
    })
    res.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (err) {
    res.statusCode = 502
    res.end(err instanceof Error ? err.message : 'Proxy error')
  }
}

const server = createServer((req, res) => {
  if ((req.url ?? '').startsWith(PROXY_PREFIX)) {
    void proxyAtlan(req, res)
  } else {
    void serveStatic(req, res)
  }
})

function openInBrowser(url) {
  const platform = process.platform
  const cmd =
    platform === 'darwin'
      ? `open "${url}"`
      : platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`
  exec(cmd, () => {})
}

function tryListen(port, attemptsLeft) {
  function onError(err) {
    server.removeListener('listening', onListening)
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      tryListen(port + 1, attemptsLeft - 1)
    } else {
      console.error('Could not start server:', err.message || err)
      process.exit(1)
    }
  }
  function onListening() {
    server.removeListener('error', onError)
    const url = `http://localhost:${port}`
    console.log('')
    console.log('  OpenLineage Studio')
    console.log(`  → ${url}`)
    console.log('  press ctrl+c to stop')
    console.log('')
    if (!NO_OPEN) openInBrowser(url)
  }
  server.once('error', onError)
  server.once('listening', onListening)
  server.listen(port)
}

tryListen(DEFAULT_PORT, 10)
