import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()
const sourceDir = path.join(rootDir, 'src')
const violationList = []

const ignoreDirSet = new Set(['.git', 'dist', 'node_modules'])
const textExtensions = new Set(['.ts', '.tsx'])

const allowInternalPositionPathSet = new Set([
  normalizePath('src/editor/core/draw/coordinate/DrawCoordinateService.ts')
])

const allowThisPositionPathSet = new Set([
  normalizePath('src/editor/core/position/Position.ts')
])

const allowListIndexPathSet = new Set([
  normalizePath('src/editor/core/draw/data/DrawObjectResolverService.ts')
])

const allowDataAccessPathSet = new Set([
  normalizePath('src/editor/core/draw/data/DrawObjectResolverService.ts'),
  normalizePath('src/editor/core/draw/runtime/DrawServiceRegistry.ts')
])

const allowRuntimeObjectListPathSet = new Set([
  normalizePath('src/editor/core/draw/data/DrawObjectResolverService.ts')
])

const allowTableSnapshotAccessorPathSet = new Set([
  normalizePath('src/editor/core/draw/data/DrawTableTargetSnapshotResolver.ts'),
  normalizePath('src/editor/core/draw/runtime/DrawServiceRegistry.ts')
])

const allowPositionContextObjectResolvePathSet = new Set([
  normalizePath('src/editor/core/draw/data/DrawTableTargetContextResolver.ts')
])

const allowObjectResolverSingleElementPathSet = new Set([
  normalizePath('src/editor/core/position/Position.ts'),
  normalizePath('src/editor/core/draw/data/DrawTableTargetContextResolver.ts')
])

const allowSpecialElementTreeTraversalPathSet = new Set([
  normalizePath('src/editor/core/draw/interactive/Search.ts'),
  normalizePath('src/editor/core/draw/control/controlTraversal.ts')
])

const ruleList = [
  // 坐标体系：业务代码只能通过 CoordinateService 访问位置相关能力。
  {
    name: 'components.position must stay behind CoordinateService',
    pattern: /components\.position/g,
    isAllowed: () => false
  },
  {
    name: 'getComponents().position must stay behind CoordinateService',
    pattern: /getComponents\(\)\.position/g,
    isAllowed: () => false
  },
  {
    name: 'draw.getPosition() old facade must not be used',
    pattern: /\b(?:this\.)?draw\.getPosition\(\)/g,
    isAllowed: () => false
  },
  {
    name: 'draw.getInternalPosition() must stay behind CoordinateService',
    pattern: /\b(?:this\.)?draw\.getInternalPosition\(\)/g,
    isAllowed: relativePath => allowInternalPositionPathSet.has(relativePath)
  },
  {
    name: 'getDraw().getPosition() must stay behind CoordinateService',
    pattern: /getDraw\(\)\.getPosition\(\)/g,
    isAllowed: () => false
  },
  {
    name: 'Position internals must not leak through this.position',
    pattern: /\bthis\.position\./g,
    isAllowed: relativePath => allowThisPositionPathSet.has(relativePath)
  },
  // 对象体系：业务代码只能通过 ObjectResolver 获取对象列表和对象数据。
  {
    name: 'business code must not index object lists directly',
    pattern:
      /get(?:OriginalElementList|OriginalMainElementList|LayoutMainElementList|ElementList|HeaderElementList|FooterElementList|OriginalRowList|RowList|MainElementList)\(\)\s*\[/g,
    isAllowed: relativePath => allowListIndexPathSet.has(relativePath)
  },
  {
    name: 'dataAccess must stay behind ObjectResolver',
    pattern: /dataAccess/g,
    isAllowed: relativePath => allowDataAccessPathSet.has(relativePath)
  },
  {
    name: 'runtime object lists must stay behind ObjectResolver',
    pattern: /getRuntime\(\)\.get(?:OriginalMainElementList|LayoutMainElementList)\(\)/g,
    isAllowed: relativePath =>
      allowRuntimeObjectListPathSet.has(relativePath)
  },
  {
    name: 'header/footer lists must be consumed through editor data or zone list',
    pattern: /getObjectResolver\(\)\.get(?:Header|Footer)ElementList\(\)/g,
    isAllowed: () => false
  },
  {
    name: 'main element boundary helpers must stay behind ObjectResolver',
    pattern:
      /getObjectResolver\(\)\.(?:getOriginalMainElement\(|getOriginalMainElementList\(\)\.length)/g,
    isAllowed: () => false
  },
  {
    name: 'command code must not consume raw original main list',
    pattern: /getObjectResolver\(\)\.getOriginalMainElementList\(\)/g,
    isAllowed: relativePath =>
      !relativePath.startsWith('src/editor/core/command/')
  },
  {
    name: 'single element object lookup must stay behind resolvers',
    pattern: /getObjectResolver\(\)\.get(?:Element|OriginalElement)\(/g,
    isAllowed: relativePath =>
      allowObjectResolverSingleElementPathSet.has(relativePath)
  },
  {
    name: 'positionContext.index must not resolve objects directly',
    pattern:
      /getOriginal(?:Main)?Element\(\s*(?:current)?positionContext\.index/g,
    isAllowed: relativePath =>
      allowPositionContextObjectResolvePathSet.has(relativePath)
  },
  // 目标体系：与当前对象、命中和表格上下文相关的解析都要走 TargetResolver。
  {
    name: 'table snapshot accessor must stay behind TargetResolver',
    pattern:
      /getTableLayoutSnapshotAccessor\(\)|tableLayoutSnapshotAccessor/g,
    isAllowed: relativePath =>
      allowTableSnapshotAccessorPathSet.has(relativePath)
  },
  // 表格遍历：通用单元格遍历必须放在 table/utils，避免 worker/command 反向依赖 draw/data。
  {
    name: 'table cell traversal must stay in table/utils',
    pattern:
      /DrawTableCellTraversal|forEachDrawTableCell|resolveDrawTableCellByIndex/g,
    isAllowed: () => false
  },
  {
    name: 'plain element tree traversal must use ElementTreeTraversal',
    pattern: /forEachTableCell\(/g,
    isAllowed: relativePath =>
      !isPlainElementTreeTraversalPath(relativePath) ||
      allowSpecialElementTreeTraversalPathSet.has(relativePath)
  },
  {
    name: 'plain element tree traversal must not read table structure directly',
    pattern: /\.(?:trList|tdList)\b/g,
    isAllowed: relativePath => !isPlainElementTreeTraversalPath(relativePath)
  }
]

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/')
}

function isPlainElementTreeTraversalPath(relativePath) {
  return (
    relativePath.startsWith('src/editor/core/command/') ||
    relativePath.startsWith('src/editor/core/worker/') ||
    relativePath.startsWith('src/editor/core/draw/interactive/') ||
    relativePath.startsWith('src/editor/core/draw/control/') ||
    relativePath === normalizePath('src/editor/core/draw/particle/ImageParticle.ts')
  )
}

function walk(dirPath) {
  const entryList = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entryList) {
    if (ignoreDirSet.has(entry.name)) continue
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name))) {
      continue
    }
    verifyFile(fullPath)
  }
}

function verifyFile(fullPath) {
  const relativePath = normalizePath(path.relative(rootDir, fullPath))
  const content = fs.readFileSync(fullPath, 'utf8')
  const lineStartList = [0]
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      lineStartList.push(i + 1)
    }
  }

  for (const rule of ruleList) {
    rule.pattern.lastIndex = 0
    let match = rule.pattern.exec(content)
    while (match) {
      if (!rule.isAllowed(relativePath)) {
        violationList.push({
          rule: rule.name,
          path: relativePath,
          line: resolveLineNumber(lineStartList, match.index),
          text: match[0]
        })
      }
      match = rule.pattern.exec(content)
    }
  }
}

function resolveLineNumber(lineStartList, index) {
  let left = 0
  let right = lineStartList.length - 1
  let result = 0
  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    if (lineStartList[middle] <= index) {
      result = middle
      left = middle + 1
    } else {
      right = middle - 1
    }
  }
  return result + 1
}

walk(sourceDir)

if (violationList.length) {
  console.error('Architecture check failed:')
  for (const violation of violationList) {
    console.error(
      `- ${violation.path}:${violation.line} ${violation.rule} (${violation.text})`
    )
  }
  process.exit(1)
}

console.log('Architecture check passed.')
