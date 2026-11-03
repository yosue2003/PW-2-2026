const { spawn } = require('node:child_process')
const { mkdtempSync, rmSync, symlinkSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'lab02-vite-'))
const projectAlias = join(temporaryDirectory, 'project')
const projectRoot = process.cwd()
const viteExecutable = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const linkType = process.platform === 'win32' ? 'junction' : 'dir'

symlinkSync(projectRoot, projectAlias, linkType)

const viteProcess = spawn(
  process.execPath,
  [viteExecutable, resolve(projectAlias), ...process.argv.slice(2)],
  { cwd: projectAlias, stdio: 'inherit' },
)

let cleaned = false
const cleanUp = () => {
  if (cleaned) return
  cleaned = true
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => viteProcess.kill(signal))
}

viteProcess.on('error', (error) => {
  cleanUp()
  console.error(error)
  process.exitCode = 1
})

viteProcess.on('exit', (code, signal) => {
  cleanUp()
  process.exitCode = code ?? (signal ? 1 : 0)
})
