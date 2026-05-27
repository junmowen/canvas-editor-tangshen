import { ISSUE_SPECS_PART_1 } from './issueSpecs.part1.js'
import { ISSUE_SPECS_PART_2 } from './issueSpecs.part2.js'
import http from 'http'
import { spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const ISSUE_SPECS = {
  ...ISSUE_SPECS_PART_1,
  ...ISSUE_SPECS_PART_2
}
const CURRENT_ISSUES = [
  41, 1399, 1385, 1404, 440, 425, 813, 837, 1372, 1200, 1190, 1053, 877, 725,
  692, 621, 605, 390, 1387
]

function parseArgs(argv) {
  const args = {
    list: false,
    current: false,
    issues: [],
    specs: []
  }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--list') {
      args.list = true
      continue
    }
    if (arg === '--current') {
      args.current = true
      continue
    }
    if (arg === '--issue' || arg === '--issues') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error(`${arg} requires a comma-separated value.`)
      }
      args.issues.push(
        ...nextValue
          .split(',')
          .map(value => Number(value.trim()))
          .filter(Number.isFinite)
      )
      index++
      continue
    }
    if (arg === '--spec') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('--spec requires a comma-separated value.')
      }
      args.specs.push(
        ...nextValue
          .split(',')
          .map(value => value.trim())
          .filter(Boolean)
      )
      index++
      continue
    }
  }
  return args
}

function resolveIssueList(args) {
  if (args.issues.length) {
    return dedupe(args.issues)
  }
  if (args.current) {
    return CURRENT_ISSUES
  }
  return []
}

function dedupe(list) {
  return [...new Set(list)]
}

let coverageIssueSpecs = null

function loadCoverageIssueSpecs() {
  if (coverageIssueSpecs) {
    return coverageIssueSpecs
  }
  coverageIssueSpecs = new Map()
  const coveragePath = resolve(
    process.cwd(),
    'docs/issue-regression/data/cypress-issue-coverage.json'
  )
  try {
    const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'))
    for (const entry of coverage) {
      const spec = resolveCoverageSpec(entry.spec)
      for (const issueNo of entry.issueNumbers || []) {
        if (!coverageIssueSpecs.has(issueNo)) {
          coverageIssueSpecs.set(issueNo, [])
        }
        coverageIssueSpecs.get(issueNo).push(spec)
      }
    }
  } catch {
    // Hard-coded ISSUE_SPECS remains the source of truth if the generated
    // coverage index is not available in a downstream checkout.
  }
  return coverageIssueSpecs
}

function resolveCoverageSpec(spec) {
  if (spec?.startsWith('cypress/')) {
    return spec
  }
  const issueSpec = `cypress/e2e/issues/${spec}`
  if (existsSync(resolve(process.cwd(), issueSpec))) {
    return issueSpec
  }
  const menuSpec = `cypress/e2e/menus/${spec}`
  if (existsSync(resolve(process.cwd(), menuSpec))) {
    return menuSpec
  }
  return issueSpec
}

function getIssueConfig(issueNo) {
  const config = ISSUE_SPECS[issueNo]
  if (config) {
    return config
  }
  const specs = loadCoverageIssueSpecs().get(issueNo)
  if (!specs?.length) {
    return null
  }
  return {
    title: `Issue #${issueNo}`,
    specs: dedupe(specs)
  }
}

function printList() {
  console.log('Issue verification map:\n')
  for (const issueNo of CURRENT_ISSUES) {
    const config = getIssueConfig(issueNo)
    if (!config) continue
    const mode = config.manual ? 'manual-only' : 'auto'
    console.log(`#${issueNo} [${mode}] ${config.title}`)
    if (config.specs?.length) {
      console.log(`  specs: ${config.specs.join(', ')}`)
    }
    if (config.note) {
      console.log(`  note: ${config.note}`)
    }
  }
}

function resolveSpecs(issueList) {
  const specs = []
  const manualIssues = []
  const unknownIssues = []

  for (const issueNo of issueList) {
    const config = getIssueConfig(issueNo)
    if (!config) {
      unknownIssues.push(issueNo)
      continue
    }
    if (config.manual || !config.specs?.length) {
      manualIssues.push(issueNo)
      continue
    }
    specs.push(...config.specs)
  }

  return {
    specs: dedupe(specs),
    manualIssues,
    unknownIssues
  }
}

function spawnCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === 'win32'
        ? spawn('cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], {
            stdio: 'inherit',
            ...options
          })
        : spawn(command, args, {
            stdio: 'inherit',
            shell: false,
            ...options
          })

    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) {
        resolve(code)
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForUrl(url, timeoutMs = 60000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const ok = await pingUrl(url)
    if (ok) {
      return
    }
    await sleep(1000)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function pingUrl(url) {
  return new Promise(resolve => {
    const req = http.get(url, res => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(3000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

function startDevServer() {
  const child =
    process.platform === 'win32'
      ? spawn(
          'cmd.exe',
          [
            '/d',
            '/s',
            '/c',
            'npm run dev -- --host 127.0.0.1 --port 3000 --strictPort'
          ],
          {
            stdio: 'inherit'
          }
        )
      : spawn(
          'npm',
          [
            'run',
            'dev',
            '--',
            '--host',
            '127.0.0.1',
            '--port',
            '3000',
            '--strictPort'
          ],
          {
            stdio: 'inherit',
            shell: false
          }
        )
  return child
}

function stopProcess(child) {
  if (!child || child.killed) return
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/d', '/s', '/c', `taskkill /pid ${child.pid} /T /F`], {
      stdio: 'ignore',
      shell: false
    })
    return
  }
  child.kill('SIGTERM')
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  if (args.list) {
    printList()
    return
  }

  const issueList = resolveIssueList(args)
  if (args.specs.length) {
    await runSpecs(dedupe(args.specs))
    return
  }
  if (!issueList.length) {
    console.log(
      'No issues selected. Use --current, --issue 41,94,813, or --list.'
    )
    return
  }

  const { specs, manualIssues, unknownIssues } = resolveSpecs(issueList)
  if (unknownIssues.length) {
    console.log(
      `Unknown issues: ${unknownIssues.map(no => `#${no}`).join(', ')}`
    )
  }
  if (manualIssues.length) {
    console.log(
      `Manual-only issues: ${manualIssues.map(no => `#${no}`).join(', ')}`
    )
    for (const issueNo of manualIssues) {
      const config = getIssueConfig(issueNo)
      if (config?.note) {
        console.log(`  #${issueNo}: ${config.note}`)
      }
    }
  }
  if (!specs.length) {
    console.log('No automated specs resolved for the selected issues.')
    return
  }
  await runSpecs(specs)
}

async function runSpecs(specs) {
  console.log(`Resolved specs (${specs.length}):`)
  for (const spec of specs) {
    console.log(`  - ${spec}`)
  }

  let devServer = null
  try {
    const targetUrl = 'http://127.0.0.1:3000/canvas-editor/'
    const hasExistingServer = await pingUrl(targetUrl)
    if (!hasExistingServer) {
      devServer = startDevServer()
      await waitForUrl(targetUrl)
    }
    const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    await spawnCommand(npxCommand, [
      'cypress',
      'run',
      '--spec',
      specs.join(',')
    ])
  } finally {
    stopProcess(devServer)
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
