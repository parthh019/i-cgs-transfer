import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(rootDir, '..')
const distDir = path.join(projectRoot, 'frontend', 'dist')
const preferredPorts = [80, 3000]
const apiTarget = 'http://127.0.0.1:8000'

if (!existsSync(distDir)) {
  console.error(`Frontend build output not found at ${distDir}`)
  console.error('Run `npm run build --prefix frontend` first, or restore frontend/dist.')
  process.exit(1)
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.map', 'application/json; charset=utf-8'],
])

function contentTypeFor(filePath) {
  return mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream'
}

function sendFile(res, filePath) {
  const stream = createReadStream(filePath)
  res.writeHead(200, {
    'Content-Type': contentTypeFor(filePath),
    'Cache-Control': 'no-cache',
  })
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    }
    res.end('Failed to read file')
  })
  stream.pipe(res)
}

async function proxyRequest(req, res) {
  const targetUrl = new URL(req.url ?? '/', apiTarget)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      headers.set(key, value.join(','))
    } else {
      headers.set(key, value)
    }
  }
  headers.delete('host')

  const init = {
    method: req.method,
    headers,
    redirect: 'manual',
  }

  if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) {
    init.body = req
    // node fetch requires duplex for streamed request bodies
    init.duplex = 'half'
  }

  const response = await fetch(targetUrl, init)
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
  if (req.method === 'HEAD' || response.body == null) {
    res.end()
    return
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}

async function serveSpa(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const pathname = decodeURIComponent(requestUrl.pathname)
  const safePath = pathname === '/' ? '/index.html' : pathname
  const filePath = path.normalize(path.join(distDir, safePath))
  const relativeToDist = path.relative(distDir, filePath)
  if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  try {
    const fileStat = await stat(filePath)
    if (fileStat.isFile()) {
      sendFile(res, filePath)
      return
    }
  } catch {
    // Fall through to SPA index fallback.
  }

  sendFile(res, path.join(distDir, 'index.html'))
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Bad request')
      return
    }

    if (req.url.startsWith('/api/')) {
      await proxyRequest(req, res)
      return
    }

    const assetPath = new URL(req.url, 'http://localhost').pathname
    if (assetPath.startsWith('/assets/') || assetPath === '/vite.svg' || path.extname(assetPath)) {
      await serveSpa(req, res)
      return
    }

    await serveSpa(req, res)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`Frontend server error: ${error?.message ?? 'unknown error'}`)
  }
})

function listenOn(portIndex = 0) {
  const port = preferredPorts[portIndex]
  server.once('error', error => {
    if ((error?.code === 'EADDRINUSE' || error?.code === 'EACCES') && portIndex + 1 < preferredPorts.length) {
      console.log(`Port ${port} unavailable, retrying on ${preferredPorts[portIndex + 1]}...`)
      listenOn(portIndex + 1)
      return
    }

    console.error(`Frontend server failed to start on port ${port}: ${error?.message ?? error}`)
    process.exit(1)
  })

  server.listen(port, () => {
    console.log(`Frontend serving http://localhost${port === 80 ? '' : `:${port}`}`)
    console.log(`Proxying /api to ${apiTarget}`)
  })
}

listenOn()
