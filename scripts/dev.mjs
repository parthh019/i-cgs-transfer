import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(rootDir, '..')
const args = process.argv.slice(2)

const runBackendOnly = args.includes('backend')

const isWindows = process.platform === 'win32'
const backendPythonCandidates = isWindows
  ? [
      path.join(projectRoot, 'backend', 'venv', 'Scripts', 'python.exe'),
      path.join(projectRoot, 'backend', 'venv', 'Scripts', 'python'),
      'python',
      'py',
    ]
  : [
      path.join(projectRoot, 'backend', 'venv', 'bin', 'python'),
      path.join(projectRoot, 'backend', 'venv', 'bin', 'python3'),
      'python3',
      'python',
    ]

function pickPython() {
  for (const candidate of backendPythonCandidates.slice(0, 2)) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return isWindows ? 'python' : 'python3'
}

function spawnProcess(command, commandArgs, options = {}) {
  const child = spawn(command, commandArgs, {
    cwd: options.cwd ?? projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  })

  child.on('exit', code => {
    if (code !== 0) {
      process.exitCode = code ?? 1
      console.error(`${options.label ?? command} exited with code ${code ?? 1}`)
    }
  })

  return child
}

const processes = []

function stopAll() {
  for (const proc of processes) {
    if (!proc.killed) {
      proc.kill()
    }
  }
}

process.on('SIGINT', () => {
  stopAll()
  process.exit(130)
})

process.on('SIGTERM', () => {
  stopAll()
  process.exit(143)
})

if (!runBackendOnly) {
  processes.push(
    spawnProcess(process.execPath, [path.join(projectRoot, 'scripts', 'frontend-dev.mjs')], {
      cwd: projectRoot,
      label: 'frontend',
    }),
  )
}

const pythonCommand = pickPython()
const backendArgs = [
  '-m',
  'uvicorn',
  'app.main:app',
  '--port',
  '8000',
]

processes.push(
  spawnProcess(pythonCommand, backendArgs, {
    cwd: path.join(projectRoot, 'backend'),
    label: 'backend',
  }),
)
