import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Dev-only proxy that routes /atlan-proxy/* to whatever tenant the client
 * names in the X-Atlan-Target header. Lets the studio talk to any
 * <name>.atlan.com without browser CORS getting in the way.
 */
const atlanDynamicProxy: Plugin = {
  name: 'atlan-dynamic-proxy',
  configureServer(server) {
    server.middlewares.use('/atlan-proxy', async (req, res) => {
      const targetHeader = req.headers['x-atlan-target']
      const target = Array.isArray(targetHeader) ? targetHeader[0] : targetHeader
      if (typeof target !== 'string' || !/^https?:\/\//.test(target)) {
        res.statusCode = 400
        res.end('Missing or invalid X-Atlan-Target header')
        return
      }
      try {
        const path = req.url ?? '/'
        const url = target.replace(/\/$/, '') + path
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const body = chunks.length ? Buffer.concat(chunks) : undefined
        const fwd = new Headers()
        for (const [k, v] of Object.entries(req.headers)) {
          if (!v) continue
          if (
            k === 'host' ||
            k === 'x-atlan-target' ||
            k === 'connection' ||
            k === 'content-length' ||
            k.startsWith('sec-')
          ) {
            continue
          }
          fwd.set(k, Array.isArray(v) ? v.join(', ') : String(v))
        }
        const upstream = await fetch(url, {
          method: req.method ?? 'GET',
          headers: fwd,
          body:
            req.method && !['GET', 'HEAD'].includes(req.method)
              ? body
              : undefined,
        })
        res.statusCode = upstream.status
        upstream.headers.forEach((v, k) => {
          if (
            k === 'transfer-encoding' ||
            k === 'content-encoding' ||
            k.startsWith('access-control')
          ) {
            return
          }
          res.setHeader(k, v)
        })
        res.end(Buffer.from(await upstream.arrayBuffer()))
      } catch (err) {
        res.statusCode = 502
        res.end(err instanceof Error ? err.message : 'Proxy error')
      }
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), atlanDynamicProxy],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
})
