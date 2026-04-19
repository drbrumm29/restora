import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Local dev middleware — runs Vercel-style serverless handlers in /api/*.
// Lets /api/analyze-radiograph, /api/detect-smile-landmarks, /api/send-to-lab
// work during `vite dev` without spinning up Vercel CLI.
//
// Also loads .env / .env.local so ANTHROPIC_API_KEY etc. are available on
// process.env when each handler runs (Vite alone doesn't inject those for
// server-side code — only VITE_* vars into the client bundle).
function apiServerPlugin() {
  return {
    name: 'api-server',
    configureServer(server) {
      // Best-effort .env loader — avoids a dotenv dep for one value.
      const root = server.config.root
      for (const name of ['.env.local', '.env']) {
        const p = path.join(root, name)
        if (!fs.existsSync(p)) continue
        const txt = fs.readFileSync(p, 'utf8')
        for (const line of txt.split('\n')) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
          if (!m) continue
          const [, k, rawV] = m
          const v = rawV.replace(/^["']|["']$/g, '')
          if (!(k in process.env)) process.env[k] = v
        }
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const route = req.url.split('?')[0].replace(/^\/api\//, '').replace(/\/$/, '')
        const handlerPath = path.join(root, 'api', `${route}.js`)
        if (!fs.existsSync(handlerPath)) return next()

        try {
          // Collect the body so the handler sees req.body as an object,
          // matching Vercel's behavior.
          let body = ''
          for await (const chunk of req) body += chunk
          let parsed = {}
          if (body) {
            try { parsed = JSON.parse(body) } catch { parsed = body }
          }

          // Fresh import each request so edits to /api/*.js hot-reload.
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = mod.default || mod.handler
          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: `No default export in api/${route}.js` }))
            return
          }

          // Minimal Vercel-compatible req/res shim.
          req.body = parsed
          const resShim = {
            statusCode: 200,
            setHeader(k, v) { res.setHeader(k, v) },
            status(code) { this.statusCode = code; res.statusCode = code; return this },
            json(obj) {
              res.statusCode = this.statusCode
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(obj))
              return this
            },
            end(...args) { res.end(...args); return this },
          }
          await handler(req, resShim)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev API error', message: e.message, stack: e.stack }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiServerPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
