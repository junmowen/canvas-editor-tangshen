import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const rootDir = process.cwd()
const isAllMode = process.argv.includes('--all')
const isStagedMode = process.argv.includes('--staged')

const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.yml',
  '.yaml',
  '.svg',
  '.txt'
])

const ignoreDirSet = new Set([
  '.git',
  '.idea',
  '.cypress-serve',
  'dist',
  'node_modules',
  'tmp'
])

const violationList = []

function walk(dirPath) {
  const entryList = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entryList) {
    if (ignoreDirSet.has(entry.name)) {
      continue
    }
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    const ext = path.extname(entry.name).toLowerCase()
    if (!textExtensions.has(ext)) {
      continue
    }
    verifyFile(fullPath)
  }
}

function shouldIgnorePath(filePath) {
  const relativePath = path.relative(rootDir, filePath)
  const partList = relativePath.split(path.sep)
  return partList.some(part => ignoreDirSet.has(part))
}

function readGitFileList(command) {
  try {
    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    return output ? output.split(/\r?\n/).filter(Boolean) : []
  } catch {
    return []
  }
}

function collectChangedFiles() {
  const stagedList = readGitFileList(
    'git diff --cached --name-only --diff-filter=ACMR'
  )
  const workingTreeList = readGitFileList(
    'git diff --name-only --diff-filter=ACMR'
  )
  const untrackedList = readGitFileList(
    'git ls-files --others --exclude-standard'
  )
  return [...new Set([...stagedList, ...workingTreeList, ...untrackedList])]
}

function collectStagedFiles() {
  return readGitFileList('git diff --cached --name-only --diff-filter=ACMR')
}

function collectTargetFiles() {
  if (isAllMode) {
    walk(rootDir)
    return
  }

  const relativeFileList = isStagedMode
    ? collectStagedFiles()
    : collectChangedFiles()

  for (const relativePath of relativeFileList) {
    const fullPath = path.join(rootDir, relativePath)
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      continue
    }
    if (shouldIgnorePath(fullPath)) {
      continue
    }
    const ext = path.extname(fullPath).toLowerCase()
    if (!textExtensions.has(ext)) {
      continue
    }
    verifyFile(fullPath)
  }
}

function verifyFile(filePath) {
  const buffer = fs.readFileSync(filePath)
  const relativePath = path.relative(rootDir, filePath)
  const hasBom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  if (hasBom) {
    violationList.push(`${relativePath}: contains UTF-8 BOM`)
  }

  const text = buffer.toString('utf8')
  if (text.includes('\r')) {
    violationList.push(`${relativePath}: contains CRLF/CR line endings`)
  }
  if (text.includes('\uFFFD')) {
    violationList.push(`${relativePath}: contains replacement character (possible encoding corruption)`)
  }
}

collectTargetFiles()

if (violationList.length) {
  console.error('Encoding check failed:')
  violationList.forEach(item => console.error(`- ${item}`))
  process.exit(1)
}

if (!isAllMode && !violationList.length) {
  console.log('Encoding check passed for changed files.')
} else {
  console.log('Encoding check passed: UTF-8 without BOM, LF line endings.')
}
