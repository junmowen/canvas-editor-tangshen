import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()
const sourceDir = path.join(rootDir, 'src')
const violationList = []

const ignoreDirSet = new Set(['.git', 'dist', 'node_modules'])
const textExtensions = new Set(['.ts', '.tsx'])
const importLikePattern =
  /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

const forbiddenSourcePathList = [
  normalizePath('src/main.ts'),
  normalizePath('src/mock.ts'),
  normalizePath('src/main'),
  normalizePath('src/assets'),
  normalizePath('src/utils'),
  normalizePath('src/plugins'),
  normalizePath('src/style.base.css'),
  normalizePath('src/style.css'),
  normalizePath('src/style.insert-menu.css'),
  normalizePath('src/style.layout-panel.css'),
  normalizePath('src/style.review-footer.css'),
  normalizePath('src/components/signature')
]

const forbiddenProjectRootPathList = [
  normalizePath('ENCODING_RULES.md'),
  normalizePath('pagecanvashost_dump.txt'),
  normalizePath('test-table-pagination.html'),
  normalizePath('test-table-position.html'),
  normalizePath('cypress/e2e/editor.cy.ts'),
  normalizePath('cypress/fixtures/example.json'),
  normalizePath('cypress/fixtures/test.png')
]

const coreBusinessModuleDirNameList = [
  'area',
  'background',
  'badge',
  'control',
  'group',
  'footer',
  'header',
  'image',
  'inline',
  'line-number',
  'list',
  'page-break',
  'page-number',
  'page-setup',
  'paragraph',
  'placeholder',
  'richtext',
  'row-drag',
  'search',
  'separator',
  'table',
  'title',
  'watermark'
]

const coreSharedDirNameList = [
  'traversal',
  'utils'
]

const coreRuntimeDirNameList = [
  'actuator',
  'contextmenu',
  'cursor',
  'history',
  'listener',
  'observer',
  'worker',
  'zone'
]

const coreExtensionDirNameList = [
  'i18n',
  'override',
  'plugin',
  'register',
  'shortcut'
]

const requiredProjectIndexPathList = [
  normalizePath('.github/README.md'),
  normalizePath('cypress/README.md'),
  normalizePath('cypress/e2e/README.md'),
  normalizePath('cypress/e2e/control/README.md'),
  normalizePath('cypress/e2e/issues/README.md'),
  normalizePath('cypress/e2e/menus/README.md'),
  normalizePath('cypress/e2e/performance/README.md'),
  normalizePath('cypress/e2e/render-backend/README.md'),
  normalizePath('cypress/e2e/smoke/README.md'),
  normalizePath('cypress/e2e/table/README.md'),
  normalizePath('cypress/e2e/table/pagination-input/README.md'),
  normalizePath('cypress/e2e/table/pagination-mock/README.md'),
  normalizePath('cypress/e2e/utils/README.md'),
  normalizePath('cypress/fixtures/README.md'),
  normalizePath('cypress/fixtures/examples/example.json'),
  normalizePath('cypress/fixtures/images/test.png'),
  normalizePath('cypress/fixtures/manual/pagecanvashost_dump.txt'),
  normalizePath('cypress/fixtures/manual/test-table-pagination.html'),
  normalizePath('cypress/fixtures/manual/test-table-position.html'),
  normalizePath('docs/README.md'),
  normalizePath('docs/encoding-rules.md'),
  normalizePath('docs/guide/index.md'),
  normalizePath('docs/guide/architecture/index.md'),
  normalizePath('docs/guide/issues/index.md'),
  normalizePath('docs/guide/render-backend/index.md'),
  normalizePath('docs/guide/table/index.md'),
  normalizePath('docs/issue-regression/index.md'),
  normalizePath('docs/issue-regression/data/README.md'),
  normalizePath('scripts/README.md'),
  normalizePath('src/README.md'),
  normalizePath('src/components/README.md'),
  normalizePath('src/demo/README.md'),
  normalizePath('src/editor/README.md'),
  normalizePath('src/editor/assets/README.md'),
  normalizePath('src/editor/core/README.md'),
  normalizePath('src/editor/core/modules/README.md'),
  normalizePath('src/editor/core/modules/background/README.md'),
  normalizePath('src/editor/core/modules/background/export/README.md'),
  normalizePath('src/editor/core/modules/background/render/README.md'),
  normalizePath('src/editor/core/modules/background/runtime/README.md'),
  normalizePath('src/editor/core/modules/badge/README.md'),
  normalizePath('src/editor/core/modules/badge/runtime/README.md'),
  normalizePath('src/editor/core/modules/block/README.md'),
  normalizePath('src/editor/core/modules/block/layout/README.md'),
  normalizePath('src/editor/core/modules/block/particle/README.md'),
  normalizePath('src/editor/core/modules/block/render/README.md'),
  normalizePath('src/editor/core/modules/control/README.md'),
  normalizePath('src/editor/core/modules/control/command/README.md'),
  normalizePath('src/editor/core/modules/control/contextmenu/README.md'),
  normalizePath('src/editor/core/modules/control/hittest/README.md'),
  normalizePath('src/editor/core/modules/control/interaction/README.md'),
  normalizePath('src/editor/core/modules/control/layout/README.md'),
  normalizePath('src/editor/core/modules/control/navigation/README.md'),
  normalizePath('src/editor/core/modules/control/particle/README.md'),
  normalizePath('src/editor/core/modules/control/policy/README.md'),
  normalizePath('src/editor/core/modules/control/render/README.md'),
  normalizePath('src/editor/core/modules/control/runtime/README.md'),
  normalizePath('src/editor/core/modules/control/selection/README.md'),
  normalizePath('src/editor/core/draw/README.md'),
  normalizePath('src/editor/core/event/README.md'),
  normalizePath('src/editor/core/modules/area/README.md'),
  normalizePath('src/editor/core/modules/area/render/README.md'),
  normalizePath('src/editor/core/modules/area/runtime/README.md'),
  normalizePath('src/editor/core/modules/footer/README.md'),
  normalizePath('src/editor/core/modules/footer/runtime/README.md'),
  normalizePath('src/editor/core/modules/group/README.md'),
  normalizePath('src/editor/core/modules/group/render/README.md'),
  normalizePath('src/editor/core/modules/group/runtime/README.md'),
  normalizePath('src/editor/core/modules/header/README.md'),
  normalizePath('src/editor/core/modules/header/runtime/README.md'),
  normalizePath('src/editor/core/modules/image/README.md'),
  normalizePath('src/editor/core/modules/image/clipboard/README.md'),
  normalizePath('src/editor/core/modules/image/command/README.md'),
  normalizePath('src/editor/core/modules/image/contextmenu/README.md'),
  normalizePath('src/editor/core/modules/image/hittest/README.md'),
  normalizePath('src/editor/core/modules/image/layout/README.md'),
  normalizePath('src/editor/core/modules/image/particle/README.md'),
  normalizePath('src/editor/core/modules/image/position/README.md'),
  normalizePath('src/editor/core/modules/image/render/README.md'),
  normalizePath('src/editor/core/modules/inline/README.md'),
  normalizePath('src/editor/core/modules/inline/command/README.md'),
  normalizePath('src/editor/core/modules/inline/contextmenu/README.md'),
  normalizePath('src/editor/core/modules/inline/particle/README.md'),
  normalizePath('src/editor/core/modules/inline/particle/date/README.md'),
  normalizePath('src/editor/core/modules/inline/render/README.md'),
  normalizePath('src/editor/core/modules/line-number/README.md'),
  normalizePath('src/editor/core/modules/line-number/runtime/README.md'),
  normalizePath('src/editor/core/modules/list/README.md'),
  normalizePath('src/editor/core/modules/list/command/README.md'),
  normalizePath('src/editor/core/modules/list/hittest/README.md'),
  normalizePath('src/editor/core/modules/list/particle/README.md'),
  normalizePath('src/editor/core/modules/list/render/README.md'),
  normalizePath('src/editor/core/modules/page-break/README.md'),
  normalizePath('src/editor/core/modules/page-break/command/README.md'),
  normalizePath('src/editor/core/modules/page-break/layout/README.md'),
  normalizePath('src/editor/core/modules/page-break/particle/README.md'),
  normalizePath('src/editor/core/modules/page-break/render/README.md'),
  normalizePath('src/editor/core/modules/page-number/README.md'),
  normalizePath('src/editor/core/modules/page-number/render/README.md'),
  normalizePath('src/editor/core/modules/page-number/runtime/README.md'),
  normalizePath('src/editor/core/modules/page-setup/README.md'),
  normalizePath('src/editor/core/modules/page-setup/render/README.md'),
  normalizePath('src/editor/core/modules/page-setup/runtime/README.md'),
  normalizePath('src/editor/core/modules/paragraph/README.md'),
  normalizePath('src/editor/core/modules/paragraph/clipboard/README.md'),
  normalizePath('src/editor/core/modules/paragraph/interaction/README.md'),
  normalizePath('src/editor/core/modules/paragraph/layout/README.md'),
  normalizePath('src/editor/core/modules/paragraph/render/README.md'),
  normalizePath('src/editor/core/modules/placeholder/README.md'),
  normalizePath('src/editor/core/modules/placeholder/render/README.md'),
  normalizePath('src/editor/core/modules/placeholder/runtime/README.md'),
  normalizePath('src/editor/core/modules/richtext/README.md'),
  normalizePath('src/editor/core/modules/richtext/command/README.md'),
  normalizePath('src/editor/core/modules/richtext/layout/README.md'),
  normalizePath('src/editor/core/modules/richtext/particle/README.md'),
  normalizePath('src/editor/core/modules/richtext/render/README.md'),
  normalizePath('src/editor/core/modules/richtext/runtime/README.md'),
  normalizePath('src/editor/core/range/selection/README.md'),
  normalizePath('src/editor/core/render-backend/README.md'),
  normalizePath('src/editor/core/modules/row-drag/README.md'),
  normalizePath('src/editor/core/modules/search/README.md'),
  normalizePath('src/editor/core/modules/search/range/README.md'),
  normalizePath('src/editor/core/modules/search/render/README.md'),
  normalizePath('src/editor/core/modules/search/runtime/README.md'),
  normalizePath('src/editor/core/modules/separator/README.md'),
  normalizePath('src/editor/core/modules/separator/command/README.md'),
  normalizePath('src/editor/core/modules/separator/layout/README.md'),
  normalizePath('src/editor/core/modules/separator/particle/README.md'),
  normalizePath('src/editor/core/modules/separator/render/README.md'),
  normalizePath('src/editor/core/shared/README.md'),
  normalizePath('src/editor/core/shared/traversal/README.md'),
  normalizePath('src/editor/core/shared/utils/README.md'),
  normalizePath('src/editor/core/modules/table/README.md'),
  normalizePath('src/editor/core/modules/table/contextmenu/README.md'),
  normalizePath('src/editor/core/modules/table/interaction/README.md'),
  normalizePath('src/editor/core/modules/table/layout/README.md'),
  normalizePath('src/editor/core/modules/table/layout/engine/README.md'),
  normalizePath('src/editor/core/modules/table/navigation/README.md'),
  normalizePath('src/editor/core/modules/table/particle/README.md'),
  normalizePath('src/editor/core/modules/table/position/README.md'),
  normalizePath('src/editor/core/modules/table/render/README.md'),
  normalizePath('src/editor/core/modules/table/selection/README.md'),
  normalizePath('src/editor/core/modules/table/target/README.md'),
  normalizePath('src/editor/core/modules/table/track-change/README.md'),
  normalizePath('src/editor/core/modules/title/README.md'),
  normalizePath('src/editor/core/modules/title/command/README.md'),
  normalizePath('src/editor/core/modules/watermark/README.md'),
  normalizePath('src/editor/core/modules/watermark/command/README.md'),
  normalizePath('src/editor/core/modules/watermark/runtime/README.md'),
  normalizePath('src/editor/core/extension/README.md'),
  normalizePath('src/editor/core/extension/i18n/README.md'),
  normalizePath('src/editor/core/extension/override/README.md'),
  normalizePath('src/editor/core/extension/plugin/README.md'),
  normalizePath('src/editor/core/extension/register/README.md'),
  normalizePath('src/editor/core/extension/shortcut/README.md'),
  normalizePath('src/editor/core/runtime/README.md'),
  normalizePath('src/editor/core/runtime/cursor/README.md'),
  normalizePath('src/editor/core/runtime/history/README.md'),
  normalizePath('src/editor/core/runtime/listener/README.md'),
  normalizePath('src/editor/core/runtime/observer/README.md'),
  normalizePath('src/editor/core/runtime/zone/README.md'),
  normalizePath('src/editor/dataset/README.md'),
  normalizePath('src/editor/interface/README.md'),
  normalizePath('src/editor/types/README.md'),
  normalizePath('src/editor/utils/README.md')
]

const projectTextRuleList = [
  {
    name: 'Cypress specs must visit explicit demo index.html',
    root: normalizePath('cypress/e2e'),
    extensionSet: new Set(['.ts']),
    pattern: /http:\/\/localhost:3000\/canvas-editor\/['"]/g
  }
]

const requiredChildReadmeDirList = [
  normalizePath('src/editor/core'),
  normalizePath('src/editor/core/extension'),
  normalizePath('src/editor/core/modules'),
  normalizePath('src/editor/core/runtime'),
  normalizePath('src/editor/core/shared')
]

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
  normalizePath('src/editor/core/draw/Draw.ts'),
  normalizePath('src/editor/core/modules/table/target/DrawTableTargetSnapshotResolver.ts'),
  normalizePath('src/editor/core/draw/runtime/DrawServiceRegistry.ts')
])

const allowTableHitTestServiceResolvePathSet = new Set([
  normalizePath('src/editor/core/modules/table/hittest/resolveTablePointerHit.ts')
])

const allowPositionContextObjectResolvePathSet = new Set([
  normalizePath('src/editor/core/modules/table/target/DrawTableTargetContextResolver.ts')
])

const allowObjectResolverSingleElementPathSet = new Set([
  normalizePath('src/editor/core/position/Position.ts'),
  normalizePath('src/editor/core/modules/table/target/DrawTableTargetContextResolver.ts')
])

const allowSpecialElementTreeTraversalPathSet = new Set([
  normalizePath('src/editor/core/modules/search/runtime/Search.ts'),
  normalizePath('src/editor/core/modules/control/runtime/controlTraversal.ts')
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
  {
    name: 'table pointer hit requests must use table/hittest resolver',
    pattern: /tableHitTestService\.resolve\(/g,
    isAllowed: relativePath =>
      allowTableHitTestServiceResolvePathSet.has(relativePath)
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
    relativePath.startsWith('src/editor/core/runtime/worker/') ||
    relativePath.startsWith('src/editor/core/modules/search/runtime/') ||
    relativePath.startsWith('src/editor/core/modules/control/runtime/') ||
    relativePath === normalizePath(
      'src/editor/core/modules/image/particle/ImageParticle.ts'
    )
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

function walkProjectTextRule(rule) {
  const rootPath = path.join(rootDir, rule.root)
  if (!fs.existsSync(rootPath)) return
  walkProjectTextRuleDirectory(rootPath, rule)
}

function walkProjectTextRuleDirectory(dirPath, rule) {
  const entryList = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entryList) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walkProjectTextRuleDirectory(fullPath, rule)
      continue
    }
    if (!entry.isFile() || !rule.extensionSet.has(path.extname(entry.name))) {
      continue
    }
    verifyProjectTextRuleFile(fullPath, rule)
  }
}

function verifyProjectTextRuleFile(fullPath, rule) {
  const relativePath = normalizePath(path.relative(rootDir, fullPath))
  const content = fs.readFileSync(fullPath, 'utf8')
  rule.pattern.lastIndex = 0
  let match = rule.pattern.exec(content)
  while (match) {
    violationList.push({
      rule: rule.name,
      path: relativePath,
      line: resolveLineNumberForIndex(content, match.index),
      text: match[0]
    })
    match = rule.pattern.exec(content)
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

  verifyImportBoundaries(relativePath, content)
}

function verifyImportBoundaries(relativePath, content) {
  importLikePattern.lastIndex = 0
  let match = importLikePattern.exec(content)
  while (match) {
    const source = match[1] || match[2]
    const targetPath = resolveImportPath(relativePath, source)
    if (
      targetPath &&
      targetPath.startsWith('src/demo/') &&
      !relativePath.startsWith('src/demo/')
    ) {
      violationList.push({
        rule: 'demo code must not be imported outside src/demo',
        path: relativePath,
        line: resolveLineNumberForIndex(content, match.index),
        text: source
      })
    }
    match = importLikePattern.exec(content)
  }
}

function resolveImportPath(relativePath, source) {
  if (source.startsWith('.')) {
    return normalizePath(path.normalize(path.join(path.dirname(relativePath), source)))
  }
  if (source.startsWith('src/')) {
    return normalizePath(source)
  }
  return ''
}

function resolveLineNumberForIndex(content, index) {
  let line = 1
  for (let i = 0; i < index; i++) {
    if (content[i] === '\n') line++
  }
  return line
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

for (const rule of projectTextRuleList) {
  walkProjectTextRule(rule)
}

for (const forbiddenPath of forbiddenSourcePathList) {
  if (fs.existsSync(path.join(rootDir, forbiddenPath))) {
    violationList.push({
      rule: 'demo-only source must stay under src/demo',
      path: forbiddenPath,
      line: 1,
      text: forbiddenPath
    })
  }
}

for (const forbiddenPath of forbiddenProjectRootPathList) {
  if (fs.existsSync(path.join(rootDir, forbiddenPath))) {
    violationList.push({
      rule: 'project files must stay in categorized directories',
      path: forbiddenPath,
      line: 1,
      text: forbiddenPath
    })
  }
}

for (const dirName of coreBusinessModuleDirNameList) {
  const legacyModulePath = normalizePath(`src/editor/core/${dirName}`)
  if (fs.existsSync(path.join(rootDir, legacyModulePath))) {
    violationList.push({
      rule: 'business modules must stay under src/editor/core/modules',
      path: legacyModulePath,
      line: 1,
      text: legacyModulePath
    })
  }
}

for (const dirName of coreSharedDirNameList) {
  const legacySharedPath = normalizePath(`src/editor/core/${dirName}`)
  if (fs.existsSync(path.join(rootDir, legacySharedPath))) {
    violationList.push({
      rule: 'shared helpers must stay under src/editor/core/shared',
      path: legacySharedPath,
      line: 1,
      text: legacySharedPath
    })
  }
}

for (const dirName of coreRuntimeDirNameList) {
  const legacyRuntimePath = normalizePath(`src/editor/core/${dirName}`)
  if (fs.existsSync(path.join(rootDir, legacyRuntimePath))) {
    violationList.push({
      rule: 'runtime services must stay under src/editor/core/runtime',
      path: legacyRuntimePath,
      line: 1,
      text: legacyRuntimePath
    })
  }
}

for (const dirName of coreExtensionDirNameList) {
  const legacyExtensionPath = normalizePath(`src/editor/core/${dirName}`)
  if (fs.existsSync(path.join(rootDir, legacyExtensionPath))) {
    violationList.push({
      rule: 'extension entrypoints must stay under src/editor/core/extension',
      path: legacyExtensionPath,
      line: 1,
      text: legacyExtensionPath
    })
  }
}

const drawLayoutDir = path.join(rootDir, 'src/editor/core/draw/layout')
if (fs.existsSync(drawLayoutDir)) {
  const misplacedTableLayoutFileList = fs
    .readdirSync(drawLayoutDir)
    .filter(fileName => /^Table.*\.ts$/.test(fileName))
  for (const fileName of misplacedTableLayoutFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/draw/layout/${fileName}`
    )
    violationList.push({
      rule: 'table layout engine files must stay under src/editor/core/modules/table/layout/engine',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const drawTableParticleDir = path.join(rootDir, 'src/editor/core/draw/particle/table')
if (fs.existsSync(drawTableParticleDir)) {
  const misplacedTableParticleFileList = fs
    .readdirSync(drawTableParticleDir)
    .filter(fileName => /\.ts$/.test(fileName))
  for (const fileName of misplacedTableParticleFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/draw/particle/table/${fileName}`
    )
    violationList.push({
      rule: 'table particle files must stay under src/editor/core/modules/table/particle',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const drawRenderDir = path.join(rootDir, 'src/editor/core/draw/render')
if (fs.existsSync(drawRenderDir)) {
  const misplacedTableRenderFileList = fs
    .readdirSync(drawRenderDir)
    .filter(fileName =>
      /^(?:RowTableRenderHelper|TableTypingRenderHelper)\.ts$/.test(fileName)
    )
  for (const fileName of misplacedTableRenderFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/draw/render/${fileName}`
    )
    violationList.push({
      rule: 'table render helper files must stay under src/editor/core/modules/table/render',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const rowRendererPath = path.join(rootDir, 'src/editor/core/draw/render/RowRenderer.ts')
if (fs.existsSync(rowRendererPath)) {
  const content = fs.readFileSync(rowRendererPath, 'utf8')
  if (/BlockType|DOMParser|HTML block|Embedded block|extractTextFromHtml/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'block export fallback rendering must stay under src/editor/core/modules/block/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/getControlHighlight|getHighlightMarginHeight|sourceElementList/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'row highlight rendering must stay under src/editor/core/modules/richtext/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/recordBorderInfo|control\.drawBorder|controlId !==/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'control row border rendering must stay under src/editor/core/modules/control/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/TEXTLIKE_ELEMENT_TYPE|element\.textDecoration|measureBasisWord/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'rich text row decoration rendering must stay under src/editor/core/modules/richtext/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/drawSpaceMarker|markerRadius|lineBreak\.color|ctx\.arc\(markerX/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'paragraph whitespace marker rendering must stay under src/editor/core/modules/paragraph/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/drawSelection|renderSelectionRange|getRenderSelectionRange|renderCrossRowColSelection|rangeMinWidth/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'row selection rendering must stay under src/editor/core/range/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/ImageDisplay|imgDisplay|FLOAT_TOP|FLOAT_BOTTOM|SURROUND|TIGHT/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'inline image rendering strategy must stay under src/editor/core/modules/image/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/ControlComponent|ElementType\.CHECKBOX|ElementType\.RADIO/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'checkable control row rendering must stay under src/editor/core/modules/control/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/ElementType\.HYPERLINK|ElementType\.DATE|dateId/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'inline business row rendering must stay under src/editor/core/modules/inline/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/ElementType\.(?:IMAGE|LATEX|SUPERSCRIPT|SUBSCRIPT|SEPARATOR|PAGE_BREAK|BLOCK)/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'business element row rendering must stay under matching src/editor/core/modules/*/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/ElementType\.TABLE|drawListStyle|curRow\.isList|lineBreakParticle\.render/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'table, list, and line break row rendering must stay under matching render modules',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/ElementType\.|RowFlex|PUNCTUATION_REG|trackChange|letterSpacing|\\u00A0/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'paragraph text run rendering must stay under src/editor/core/modules/paragraph/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/recordFillInfo|getGroup\(\)|groupParticle\.render/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/RowRenderer.ts')
    violationList.push({
      rule: 'group row rendering must stay under src/editor/core/modules/group/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const inlineElementLayoutPath = path.join(
  rootDir,
  'src/editor/core/draw/layout/InlineElementLayout.ts'
)
if (fs.existsSync(inlineElementLayoutPath)) {
  const content = fs.readFileSync(inlineElementLayoutPath, 'utf8')
  if (
    /ImageDisplay|BlockType|ControlComponent|ElementType\.(?:IMAGE|LATEX|SEPARATOR|PAGE_BREAK|RADIO|CHECKBOX|TAB|BLOCK|SUPERSCRIPT|SUBSCRIPT)|convertStringToBase64|imageObserver/.test(
      content
    )
  ) {
    const relativePath = normalizePath(
      'src/editor/core/draw/layout/InlineElementLayout.ts'
    )
    violationList.push({
      rule: 'business inline element measurement must stay under src/editor/core/modules/*/layout',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const rowLayoutEnginePath = path.join(
  rootDir,
  'src/editor/core/draw/layout/RowLayoutEngine.ts'
)
if (fs.existsSync(rowLayoutEnginePath)) {
  const content = fs.readFileSync(rowLayoutEnginePath, 'utf8')
  if (
    /\b(?:ImageDisplay|FlexDirection|RowFlex|ControlComponent|ControlIndentation|getIsBlockElement)\b|ElementType\.(?:TABLE|IMAGE|LATEX|SEPARATOR|PAGE_BREAK|BLOCK|TEXT|CHECKBOX|RADIO)/.test(
      content
    )
  ) {
    const relativePath = normalizePath(
      'src/editor/core/draw/layout/RowLayoutEngine.ts'
    )
    violationList.push({
      rule: 'business row layout policies must stay under src/editor/core/modules/*/layout or position policies',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const pagePartitionerPath = path.join(
  rootDir,
  'src/editor/core/draw/layout/PagePartitioner.ts'
)
if (fs.existsSync(pagePartitionerPath)) {
  const content = fs.readFileSync(pagePartitionerPath, 'utf8')
  if (/ElementType\.TABLE|tableDisplay/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/draw/layout/PagePartitioner.ts'
    )
    violationList.push({
      rule: 'table page partition policies must stay under src/editor/core/modules/table/layout',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const drawLayoutPipelinePath = path.join(
  rootDir,
  'src/editor/core/draw/layout/DrawLayoutPipeline.ts'
)
if (fs.existsSync(drawLayoutPipelinePath)) {
  const content = fs.readFileSync(drawLayoutPipelinePath, 'utf8')
  if (
    /ElementType\.(?:TABLE|IMAGE|LATEX|BLOCK|SEPARATOR|PAGE_BREAK)|forEachTableCell|imgFloatPosition/.test(
      content
    )
  ) {
    const relativePath = normalizePath(
      'src/editor/core/draw/layout/DrawLayoutPipeline.ts'
    )
    violationList.push({
      rule: 'business layout scanning policies must stay under src/editor/core/modules/*/layout or position policies',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const drawRenderFinalizeServicePath = path.join(
  rootDir,
  'src/editor/core/draw/render/DrawRenderFinalizeService.ts'
)
if (fs.existsSync(drawRenderFinalizeServicePath)) {
  const content = fs.readFileSync(drawRenderFinalizeServicePath, 'utf8')
  if (/ElementType\.TABLE|forEachTableCell|imgFloatPosition/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/draw/render/DrawRenderFinalizeService.ts'
    )
    violationList.push({
      rule: 'render finalize table and float policies must stay under src/editor/core/modules/*',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const textPatchPipelinePathList = [
  'src/editor/core/draw/layout/chunk/ChunkPatchGuard.ts',
  'src/editor/core/draw/layout/chunk/PageChunkRuntimePatcher.ts',
  'src/editor/core/draw/layout/chunk/TypingLinePatchPipeline.ts',
  'src/editor/core/draw/render/TypingPreviewRenderer.ts'
]
for (const textPatchPipelinePath of textPatchPipelinePathList) {
  const absolutePath = path.join(rootDir, textPatchPipelinePath)
  if (!fs.existsSync(absolutePath)) continue
  const content = fs.readFileSync(absolutePath, 'utf8')
  if (/ElementType\.(?:TEXT|HYPERLINK|DATE|SUBSCRIPT|SUPERSCRIPT|TAB|TABLE)/.test(content)) {
    const relativePath = normalizePath(textPatchPipelinePath)
    violationList.push({
      rule: 'typing text patch element whitelist must stay under src/editor/core/modules/paragraph/layout',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const drawDataMutationPathList = [
  'src/editor/core/draw/data/DrawInsertBatcher.ts',
  'src/editor/core/draw/data/DrawMutationService.ts'
]
for (const drawDataMutationPath of drawDataMutationPathList) {
  const absolutePath = path.join(rootDir, drawDataMutationPath)
  if (!fs.existsSync(absolutePath)) continue
  const content = fs.readFileSync(absolutePath, 'utf8')
  if (/ElementType\.TEXT|ControlComponent\.VALUE/.test(content)) {
    const relativePath = normalizePath(drawDataMutationPath)
    violationList.push({
      rule: 'draw data text/control business policies must stay under src/editor/core/modules',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const positionServiceRowFlexPath = path.join(
  rootDir,
  'src/editor/core/position/Position.ts'
)
if (fs.existsSync(positionServiceRowFlexPath)) {
  const content = fs.readFileSync(positionServiceRowFlexPath, 'utf8')
  if (/\bRowFlex\b/.test(content)) {
    const relativePath = normalizePath('src/editor/core/position/Position.ts')
    violationList.push({
      rule: 'paragraph row flex position policies must stay under src/editor/core/modules/paragraph/layout',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const pageContentPainterPath = path.join(
  rootDir,
  'src/editor/core/draw/render/PageContentPainter.ts'
)
if (fs.existsSync(pageContentPainterPath)) {
  const content = fs.readFileSync(pageContentPainterPath, 'utf8')
  if (
    /ImageDisplay|getBackground\(\)\.render|getArea\(\)\.render|getMargin\(\)\.render|renderHighlightList|getSearch\(\)|getIsOriginalMainPlaceholderAvailable|placeholder\.render|getBlockParticle\(\)\.clear/.test(
      content
    )
  ) {
    const relativePath = normalizePath(
      'src/editor/core/draw/render/PageContentPainter.ts'
    )
    violationList.push({
      rule: 'page-level business rendering must stay under src/editor/core/modules/*/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const pageRendererPath = path.join(rootDir, 'src/editor/core/draw/render/PageRenderer.ts')
if (fs.existsSync(pageRendererPath)) {
  const content = fs.readFileSync(pageRendererPath, 'utf8')
  if (/ElementType\.BLOCK|getBlockParticle\(\)\.render|blockParticle\.clearPage|getSearch\(\)/.test(content)) {
    const relativePath = normalizePath('src/editor/core/draw/render/PageRenderer.ts')
    violationList.push({
      rule: 'page-level block host rendering must stay under src/editor/core/modules/block/render',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const workerSnapshotDir = path.join(rootDir, 'src/editor/core/render-backend/worker')
if (fs.existsSync(workerSnapshotDir)) {
  const forbiddenWorkerSnapshotBusinessPattern =
    /ElementType\.|ControlComponent|ImageDisplay|\.imgDisplay\b|imgFloatPosition|\bRowFlex\b/
  const workerSnapshotFileList = fs
    .readdirSync(workerSnapshotDir)
    .filter(fileName => /^PageRenderSnapshot.*\.ts$/.test(fileName))
  for (const fileName of workerSnapshotFileList) {
    const absolutePath = path.join(workerSnapshotDir, fileName)
    const content = fs.readFileSync(absolutePath, 'utf8')
    if (!forbiddenWorkerSnapshotBusinessPattern.test(content)) continue
    const relativePath = normalizePath(
      `src/editor/core/render-backend/worker/${fileName}`
    )
    violationList.push({
      rule: 'worker snapshot business element policies must stay under src/editor/core/modules/*',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const paragraphIntentPathList = [
  'src/editor/core/event/pointer/intents/selection/SelectionWordRangeIntent.ts',
  'src/editor/core/event/pointer/intents/drag-drop/DragCommitMutationIntent.ts',
  'src/editor/core/event/keyboard/intents/TabIntent.ts'
]
for (const paragraphIntentPath of paragraphIntentPathList) {
  const absolutePath = path.join(rootDir, paragraphIntentPath)
  if (!fs.existsSync(absolutePath)) continue
  const content = fs.readFileSync(absolutePath, 'utf8')
  if (/ElementType\.|TEXTLIKE_ELEMENT_TYPE/.test(content)) {
    const relativePath = normalizePath(paragraphIntentPath)
    violationList.push({
      rule: 'paragraph event intent element policies must stay under src/editor/core/modules/paragraph/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const drawControlDir = path.join(rootDir, 'src/editor/core/draw/control')
if (fs.existsSync(drawControlDir)) {
  const misplacedPath = normalizePath('src/editor/core/draw/control')
  violationList.push({
    rule: 'control runtime files must stay under src/editor/core/modules/control/runtime',
    path: misplacedPath,
    line: 1,
    text: misplacedPath
  })
}

const drawFrameWatermarkPath = path.join(
  rootDir,
  'src/editor/core/draw/frame/Watermark.ts'
)
if (fs.existsSync(drawFrameWatermarkPath)) {
  const misplacedPath = normalizePath('src/editor/core/draw/frame/Watermark.ts')
  violationList.push({
    rule: 'watermark runtime files must stay under src/editor/core/modules/watermark/runtime',
    path: misplacedPath,
    line: 1,
    text: misplacedPath
  })
}

const drawFrameNumberFileList = [
  {
    fileName: 'Background.ts',
    rule: 'background runtime files must stay under src/editor/core/modules/background/runtime'
  },
  {
    fileName: 'Badge.ts',
    rule: 'badge runtime files must stay under src/editor/core/modules/badge/runtime'
  },
  {
    fileName: 'Footer.ts',
    rule: 'footer runtime files must stay under src/editor/core/modules/footer/runtime'
  },
  {
    fileName: 'Header.ts',
    rule: 'header runtime files must stay under src/editor/core/modules/header/runtime'
  },
  {
    fileName: 'PageNumber.ts',
    rule: 'page number runtime files must stay under src/editor/core/modules/page-number/runtime'
  },
  {
    fileName: 'LineNumber.ts',
    rule: 'line number runtime files must stay under src/editor/core/modules/line-number/runtime'
  },
  {
    fileName: 'Placeholder.ts',
    rule: 'placeholder runtime files must stay under src/editor/core/modules/placeholder/runtime'
  }
]
for (const frameNumberFile of drawFrameNumberFileList) {
  const legacyPath = path.join(
    rootDir,
    `src/editor/core/draw/frame/${frameNumberFile.fileName}`
  )
  if (fs.existsSync(legacyPath)) {
    const misplacedPath = normalizePath(
      `src/editor/core/draw/frame/${frameNumberFile.fileName}`
    )
    violationList.push({
      rule: frameNumberFile.rule,
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const drawFrameDir = path.join(rootDir, 'src/editor/core/draw/frame')
if (fs.existsSync(drawFrameDir)) {
  const misplacedPath = normalizePath('src/editor/core/draw/frame')
  violationList.push({
    rule: 'page setup runtime files must stay under src/editor/core/modules/page-setup/runtime',
    path: misplacedPath,
    line: 1,
    text: misplacedPath
  })
}

const drawSetupDir = path.join(rootDir, 'src/editor/core/draw/setup')
if (fs.existsSync(drawSetupDir)) {
  const misplacedPath = normalizePath('src/editor/core/draw/setup')
  violationList.push({
    rule: 'page setup services must stay under src/editor/core/modules/page-setup/runtime',
    path: misplacedPath,
    line: 1,
    text: misplacedPath
  })
}

const drawRichtextDir = path.join(rootDir, 'src/editor/core/draw/richtext')
if (fs.existsSync(drawRichtextDir)) {
  const misplacedPath = normalizePath('src/editor/core/draw/richtext')
  violationList.push({
    rule: 'rich text decoration runtime files must stay under src/editor/core/modules/richtext/runtime',
    path: misplacedPath,
    line: 1,
    text: misplacedPath
  })
}

const drawInteractiveAreaPath = path.join(
  rootDir,
  'src/editor/core/draw/interactive/Area.ts'
)
if (fs.existsSync(drawInteractiveAreaPath)) {
  const misplacedPath = normalizePath('src/editor/core/draw/interactive/Area.ts')
  violationList.push({
    rule: 'area runtime files must stay under src/editor/core/modules/area/runtime',
    path: misplacedPath,
    line: 1,
    text: misplacedPath
  })
}

const drawInteractiveDir = path.join(rootDir, 'src/editor/core/draw/interactive')
if (fs.existsSync(drawInteractiveDir)) {
  const misplacedPath = normalizePath('src/editor/core/draw/interactive')
  violationList.push({
    rule: 'business interactive runtime files must stay under src/editor/core/modules/*/runtime',
    path: misplacedPath,
    line: 1,
    text: misplacedPath
  })
}

const drawParticleDir = path.join(rootDir, 'src/editor/core/draw/particle')
if (fs.existsSync(drawParticleDir)) {
  const misplacedBusinessParticleRuleList = [
    {
      pattern: /^(?:CheckboxParticle|RadioParticle|checkableParticle)\.ts$/,
      rule: 'control particle files must stay under src/editor/core/modules/control/particle'
    },
    {
      pattern: /^ImageParticle\.ts$/,
      rule: 'image particle files must stay under src/editor/core/modules/image/particle'
    },
  {
      pattern: /^HyperlinkParticle\.ts$/,
      rule: 'inline particle files must stay under src/editor/core/modules/inline/particle'
    },
    {
      pattern: /^ListParticle\.ts$/,
      rule: 'list particle files must stay under src/editor/core/modules/list/particle'
    },
    {
      pattern: /^PageBreakParticle\.ts$/,
      rule: 'page break particle files must stay under src/editor/core/modules/page-break/particle'
    },
    {
      pattern: /^SeparatorParticle\.ts$/,
      rule: 'separator particle files must stay under src/editor/core/modules/separator/particle'
    },
    {
      pattern: /^(?:AbstractScriptParticle|SubscriptParticle|SuperscriptParticle)\.ts$/,
      rule: 'rich text script particle files must stay under src/editor/core/modules/richtext/particle'
    }
  ]
  const drawParticleFileList = fs.readdirSync(drawParticleDir)
  for (const businessParticleRule of misplacedBusinessParticleRuleList) {
    const misplacedParticleFileList = drawParticleFileList.filter(fileName =>
      businessParticleRule.pattern.test(fileName)
    )
    for (const fileName of misplacedParticleFileList) {
      const misplacedPath = normalizePath(
        `src/editor/core/draw/particle/${fileName}`
      )
      violationList.push({
        rule: businessParticleRule.rule,
        path: misplacedPath,
        line: 1,
        text: misplacedPath
      })
    }
  }
}

const drawParticleImageDirList = [
  {
    name: 'latex',
    rule: 'latex image particle files must stay under src/editor/core/modules/image/particle/latex'
  },
  {
    name: 'previewer',
    rule: 'image previewer particle files must stay under src/editor/core/modules/image/particle/previewer'
  }
]
for (const particleDir of drawParticleImageDirList) {
  const legacyImageParticleDir = path.join(
    rootDir,
    `src/editor/core/draw/particle/${particleDir.name}`
  )
  if (fs.existsSync(legacyImageParticleDir)) {
    const misplacedPath = normalizePath(
      `src/editor/core/draw/particle/${particleDir.name}`
    )
    violationList.push({
      rule: particleDir.rule,
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const drawParticleInlineDirList = [
  {
    name: 'block',
    rule: 'block particle files must stay under src/editor/core/modules/block/particle'
  },
  {
    name: 'date',
    rule: 'inline date particle files must stay under src/editor/core/modules/inline/particle/date'
  }
]
for (const particleDir of drawParticleInlineDirList) {
  const legacyInlineParticleDir = path.join(
    rootDir,
    `src/editor/core/draw/particle/${particleDir.name}`
  )
  if (fs.existsSync(legacyInlineParticleDir)) {
    const misplacedPath = normalizePath(
      `src/editor/core/draw/particle/${particleDir.name}`
    )
    violationList.push({
      rule: particleDir.rule,
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const drawDataDir = path.join(rootDir, 'src/editor/core/draw/data')
if (fs.existsSync(drawDataDir)) {
  const misplacedTableTargetFileList = fs
    .readdirSync(drawDataDir)
    .filter(fileName => /^DrawTableTarget.*\.ts$/.test(fileName))
  for (const fileName of misplacedTableTargetFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/draw/data/${fileName}`
    )
    violationList.push({
      rule: 'table target resolver files must stay under src/editor/core/modules/table/target',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const rangeDir = path.join(rootDir, 'src/editor/core/range')
if (fs.existsSync(rangeDir)) {
  const misplacedTableSelectionFileList = fs
    .readdirSync(rangeDir)
    .filter(fileName => /^TableSelection.*\.ts$/.test(fileName))
  for (const fileName of misplacedTableSelectionFileList) {
    const misplacedPath = normalizePath(`src/editor/core/range/${fileName}`)
    violationList.push({
      rule: 'table selection projection files must stay under src/editor/core/modules/table/selection',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const sharedUtilsDir = path.join(rootDir, 'src/editor/core/shared/utils')
if (fs.existsSync(sharedUtilsDir)) {
  const misplacedTraversalFileList = fs
    .readdirSync(sharedUtilsDir)
    .filter(fileName => /^ElementTreeTraversal\.ts$/.test(fileName))
  for (const fileName of misplacedTraversalFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/shared/utils/${fileName}`
    )
    violationList.push({
      rule: 'element tree traversal files must stay under src/editor/core/shared/traversal',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const contextMenuMenusDir = path.join(
  rootDir,
  'src/editor/core/runtime/contextmenu/menus'
)
if (fs.existsSync(contextMenuMenusDir)) {
  const misplacedTableMenuFileList = fs
    .readdirSync(contextMenuMenusDir)
    .filter(fileName => /^tableMenus\.ts$/.test(fileName))
  for (const fileName of misplacedTableMenuFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/runtime/contextmenu/menus/${fileName}`
    )
    violationList.push({
      rule: 'table context menu files must stay under src/editor/core/modules/table/contextmenu',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
  const misplacedImageMenuFileList = fs
    .readdirSync(contextMenuMenusDir)
    .filter(fileName => /^imageMenus\.ts$/.test(fileName))
  for (const fileName of misplacedImageMenuFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/runtime/contextmenu/menus/${fileName}`
    )
    violationList.push({
      rule: 'image context menu files must stay under src/editor/core/modules/image/contextmenu',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
  const misplacedControlMenuFileList = fs
    .readdirSync(contextMenuMenusDir)
    .filter(fileName => /^controlMenus\.ts$/.test(fileName))
  for (const fileName of misplacedControlMenuFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/runtime/contextmenu/menus/${fileName}`
    )
    violationList.push({
      rule: 'control context menu files must stay under src/editor/core/modules/control/contextmenu',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
  const misplacedInlineMenuFileList = fs
    .readdirSync(contextMenuMenusDir)
    .filter(fileName => /^hyperlinkMenus\.ts$/.test(fileName))
  for (const fileName of misplacedInlineMenuFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/runtime/contextmenu/menus/${fileName}`
    )
    violationList.push({
      rule: 'inline context menu files must stay under src/editor/core/modules/inline/contextmenu',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const keyboardSharedDir = path.join(rootDir, 'src/editor/core/event/keyboard/shared')
if (fs.existsSync(keyboardSharedDir)) {
  const misplacedTableKeyboardFileList = fs
    .readdirSync(keyboardSharedDir)
    .filter(fileName =>
      /^(?:applyTableToolState|clearCrossRowColSelection|handleControlDeletion|insertIntoActiveControl)\.ts$/.test(fileName)
    )
  for (const fileName of misplacedTableKeyboardFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/event/keyboard/shared/${fileName}`
    )
    violationList.push({
      rule: 'business keyboard helpers must stay under src/editor/core/modules/table or src/editor/core/modules/control',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const horizontalMoveSharedPath = path.join(
  rootDir,
  'src/editor/core/event/keyboard/shared/horizontalMove.ts'
)
if (fs.existsSync(horizontalMoveSharedPath)) {
  const content = fs.readFileSync(horizontalMoveSharedPath, 'utf8')
  const forbiddenControlBoundaryPattern =
    /ControlComponent|EditorMode\.FORM|initNextControl/
  if (forbiddenControlBoundaryPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/shared/horizontalMove.ts'
    )
    violationList.push({
      rule: 'control keyboard navigation details must stay under src/editor/core/modules/control/navigation',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenTableHorizontalBoundaryPattern =
    /tableNavigationService|resolveHorizontalBoundaryNavigation|applyTableToolState/
  if (forbiddenTableHorizontalBoundaryPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/shared/horizontalMove.ts'
    )
    violationList.push({
      rule: 'table horizontal keyboard navigation must stay under src/editor/core/modules/table/navigation',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const verticalNavigationIntentPath = path.join(
  rootDir,
  'src/editor/core/event/keyboard/intents/VerticalNavigationIntent.ts'
)
if (fs.existsSync(verticalNavigationIntentPath)) {
  const content = fs.readFileSync(verticalNavigationIntentPath, 'utf8')
  const forbiddenTableVerticalNavigationPattern =
    /tableNavigationService|resolveVerticalNavigation|resolveVerticalFragmentTransition|resolveVerticalEntryNavigation|ElementType\.TABLE|applyTableToolState/
  if (forbiddenTableVerticalNavigationPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/VerticalNavigationIntent.ts'
    )
    violationList.push({
      rule: 'table vertical keyboard navigation must stay under src/editor/core/modules/table/navigation',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const tabIntentPath = path.join(
  rootDir,
  'src/editor/core/event/keyboard/intents/TabIntent.ts'
)
if (fs.existsSync(tabIntentPath)) {
  const content = fs.readFileSync(tabIntentPath, 'utf8')
  const forbiddenControlNavigationPattern =
    /initNextControl|getActiveControl|getIsRangeWithinControl|MoveDirection/
  if (forbiddenControlNavigationPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/TabIntent.ts'
    )
    violationList.push({
      rule: 'control tab navigation details must stay under src/editor/core/modules/control/navigation',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenListTabPattern = /listId|getListParticle\(\)\.indentList/
  if (forbiddenListTabPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/TabIntent.ts'
    )
    violationList.push({
      rule: 'list tab indentation rules must stay under src/editor/core/modules/list',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const enterIntentPath = path.join(
  rootDir,
  'src/editor/core/event/keyboard/intents/EnterIntent.ts'
)
if (fs.existsSync(enterIntentPath)) {
  const content = fs.readFileSync(enterIntentPath, 'utf8')
  const forbiddenControlEnterPolicyPattern =
    /ControlComponent|ControlType|control\.getActiveControl/
  if (forbiddenControlEnterPolicyPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/EnterIntent.ts'
    )
    violationList.push({
      rule: 'control enter policies must stay under src/editor/core/modules/control/policy',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenListEnterPattern = /listId|listWrap|getListParticle\(\)\.unsetList/
  if (forbiddenListEnterPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/EnterIntent.ts'
    )
    violationList.push({
      rule: 'list enter rules must stay under src/editor/core/modules/list',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenAreaTitleEnterPattern = /areaId|titleId/
  if (forbiddenAreaTitleEnterPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/EnterIntent.ts'
    )
    violationList.push({
      rule: 'area/title enter boundary rules must stay under src/editor/core/modules/area or src/editor/core/modules/title',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

for (const keyboardDeletionIntentName of ['BackspaceIntent.ts', 'DeleteIntent.ts']) {
  const keyboardDeletionIntentPath = path.join(
    rootDir,
    `src/editor/core/event/keyboard/intents/${keyboardDeletionIntentName}`
  )
  if (!fs.existsSync(keyboardDeletionIntentPath)) continue
  const content = fs.readFileSync(keyboardDeletionIntentPath, 'utf8')
  const forbiddenControlDeletionPattern =
    /getIsRangeControlDeletionDisabled|getIsRangeCanCaptureEvent|getIsRangeWithinControl|control\.getActiveControl|control\.removeControl|\.controlId/
  if (forbiddenControlDeletionPattern.test(content)) {
    const relativePath = normalizePath(
      `src/editor/core/event/keyboard/intents/${keyboardDeletionIntentName}`
    )
    violationList.push({
      rule: 'control deletion details must stay under src/editor/core/modules/control',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const backspaceIntentPath = path.join(
  rootDir,
  'src/editor/core/event/keyboard/intents/BackspaceIntent.ts'
)
if (fs.existsSync(backspaceIntentPath)) {
  const content = fs.readFileSync(backspaceIntentPath, 'utf8')
  const forbiddenTableBackspacePattern =
    /resolveBackspaceNavigation|positionContext\.isTable|firstElement\.tableId/
  if (forbiddenTableBackspacePattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/BackspaceIntent.ts'
    )
    violationList.push({
      rule: 'table backspace navigation rules must stay under src/editor/core/modules/table/navigation',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenListBackspacePattern = /firstElement\.listId|getListParticle\(\)\.unsetList/
  if (forbiddenListBackspacePattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/BackspaceIntent.ts'
    )
    violationList.push({
      rule: 'list backspace rules must stay under src/editor/core/modules/list',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/rowFlex|value\s*===\s*ZERO/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/BackspaceIntent.ts'
    )
    violationList.push({
      rule: 'paragraph backspace context inheritance must stay under src/editor/core/modules/paragraph',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const deleteIntentPath = path.join(
  rootDir,
  'src/editor/core/event/keyboard/intents/DeleteIntent.ts'
)
if (fs.existsSync(deleteIntentPath)) {
  const content = fs.readFileSync(deleteIntentPath, 'utf8')
  if (/resolveFragmentTransitionIndex|tableNavigationService/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/intents/DeleteIntent.ts'
    )
    violationList.push({
      rule: 'table delete fragment navigation must stay under src/editor/core/modules/table/navigation',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const fastInputProcessorPath = path.join(
  rootDir,
  'src/editor/core/event/input/FastInputProcessor.ts'
)
if (fs.existsSync(fastInputProcessorPath)) {
  const content = fs.readFileSync(fastInputProcessorPath, 'utf8')
  const forbiddenControlInputMutationPattern =
    /control\.setValue|control\.emitControlContentChange|control\.getActiveControl/
  if (forbiddenControlInputMutationPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/input/FastInputProcessor.ts'
    )
    violationList.push({
      rule: 'control input mutations must stay under src/editor/core/modules/control/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const cutHandlerPath = path.join(rootDir, 'src/editor/core/event/handlers/cut.ts')
if (fs.existsSync(cutHandlerPath)) {
  const content = fs.readFileSync(cutHandlerPath, 'utf8')
  const forbiddenControlCutPattern =
    /control\.cut|control\.emitControlContentChange|control\.getIsRangeWithinControl/
  if (forbiddenControlCutPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/handlers/cut.ts')
    violationList.push({
      rule: 'control cut mutations must stay under src/editor/core/modules/control/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const dblclickHandlerPath = path.join(rootDir, 'src/editor/core/event/handlers/dblclick.ts')
if (fs.existsSync(dblclickHandlerPath)) {
  const content = fs.readFileSync(dblclickHandlerPath, 'utf8')
  const forbiddenTableDblclickSelectionPattern =
    /resolveLogicalTableById|resolveOriginalTableTdByIndex|getCellSlicesByCellKey|logicalTrIndex|logicalTdIndex/
  if (forbiddenTableDblclickSelectionPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/handlers/dblclick.ts')
    violationList.push({
      rule: 'table dblclick selection rules must stay under src/editor/core/modules/table/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/tdValueIndex/.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/handlers/dblclick.ts')
    violationList.push({
      rule: 'table pointer index mapping must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/previewer\.render\(|isImage\s*&&\s*positionContext\.isDirectHit/.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/handlers/dblclick.ts')
    violationList.push({
      rule: 'image dblclick preview rules must stay under src/editor/core/modules/image',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const removeHiddenElementsPath = path.join(
  rootDir,
  'src/editor/core/event/keyboard/shared/removeHiddenElements.ts'
)
if (fs.existsSync(removeHiddenElementsPath)) {
  const content = fs.readFileSync(removeHiddenElementsPath, 'utf8')
  const forbiddenHiddenControlRemovalPattern = /\.controlId|control\.removeControl/
  if (forbiddenHiddenControlRemovalPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/keyboard/shared/removeHiddenElements.ts'
    )
    violationList.push({
      rule: 'hidden control removal must stay under src/editor/core/modules/control/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const dragCommitMutationIntentPath = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/drag-drop/DragCommitMutationIntent.ts'
)
if (fs.existsSync(dragCommitMutationIntentPath)) {
  const content = fs.readFileSync(dragCommitMutationIntentPath, 'utf8')
  const forbiddenControlDragMutationPattern =
    /ControlComponent|\.controlId|getIsElementListContainFullControl|activeControl\.setValue|control\.getActiveControl\(\)\?\.cut/
  if (forbiddenControlDragMutationPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/drag-drop/DragCommitMutationIntent.ts'
    )
    violationList.push({
      rule: 'control drag-drop mutations must stay under src/editor/core/modules/control/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenTableDragMutationPattern =
    /resolveOriginalTableById|resolveOriginalTableTdByIndex|\.deletable/
  if (forbiddenTableDragMutationPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/drag-drop/DragCommitMutationIntent.ts'
    )
    violationList.push({
      rule: 'table drag source deletion rules must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenTableDragPositionContextPattern =
    /startElement\.tableId|cacheStartElement\.tableId/
  if (forbiddenTableDragPositionContextPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/drag-drop/DragCommitMutationIntent.ts'
    )
    violationList.push({
      rule: 'table drag-drop position context adjustment must stay under src/editor/core/modules/table/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/\.listId|LIST_CONTEXT_ATTR/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/drag-drop/DragCommitMutationIntent.ts'
    )
    violationList.push({
      rule: 'list drag-drop context copy rules must stay under src/editor/core/modules/list',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const dragCommitIntentPath = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/drag-drop/DragCommitIntent.ts'
)
if (fs.existsSync(dragCommitIntentPath)) {
  const content = fs.readFileSync(dragCommitIntentPath, 'utf8')
  if (/control\.emitControlContentChange|\.controlId/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/drag-drop/DragCommitIntent.ts'
    )
    violationList.push({
      rule: 'control drag-drop content change emission must stay under src/editor/core/modules/control/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/\.tdId/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/drag-drop/DragCommitIntent.ts'
    )
    violationList.push({
      rule: 'table drag-drop same-cell rules must stay under src/editor/core/modules/table/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const applyDragCursorIntentPath = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/drag-drop/ApplyDragCursorIntent.ts'
)
if (fs.existsSync(applyDragCursorIntentPath)) {
  const content = fs.readFileSync(applyDragCursorIntentPath, 'utf8')
  if (/tdValueIndex/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/drag-drop/ApplyDragCursorIntent.ts'
    )
    violationList.push({
      rule: 'table drag cursor index mapping must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const selectionStartIntentPath = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/selection/SelectionStartIntent.ts'
)
if (fs.existsSync(selectionStartIntentPath)) {
  const content = fs.readFileSync(selectionStartIntentPath, 'utf8')
  if (/\.controlId|EditorMode\.FORM/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/selection/SelectionStartIntent.ts'
    )
    violationList.push({
      rule: 'control selection boundary details must stay under src/editor/core/modules/control/selection or policy',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/\.tdId/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/selection/SelectionStartIntent.ts'
    )
    violationList.push({
      rule: 'table shift selection cell boundary rules must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/tdValueIndex/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/selection/SelectionStartIntent.ts'
    )
    violationList.push({
      rule: 'table selection start index mapping must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const mouseDownHandlerPath = path.join(
  rootDir,
  'src/editor/core/event/handlers/mousedown.ts'
)
if (fs.existsSync(mouseDownHandlerPath)) {
  const content = fs.readFileSync(mouseDownHandlerPath, 'utf8')
  if (/\.controlId/.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/handlers/mousedown.ts')
    violationList.push({
      rule: 'control-aware mousedown selection checks must use src/editor/core/modules/control/hittest',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/\.listId/.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/handlers/mousedown.ts')
    violationList.push({
      rule: 'list-aware mousedown selection checks must use src/editor/core/modules/list/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const globalEventPath = path.join(rootDir, 'src/editor/core/event/GlobalEvent.ts')
if (fs.existsSync(globalEventPath)) {
  const content = fs.readFileSync(globalEventPath, 'utf8')
  const forbiddenGlobalImageInlinePattern =
    /Previewer|HyperlinkParticle|DateParticle|ImageParticle|previewer|hyperlinkParticle|dateParticle|imageParticle|clearResizer|clearHyperlinkPopup|clearDatePicker|destroyFloatImage/
  if (forbiddenGlobalImageInlinePattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/GlobalEvent.ts')
    violationList.push({
      rule: 'global image/inline cleanup must stay under src/editor/core/modules/image or src/editor/core/modules/inline',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const copyHandlerPath = path.join(rootDir, 'src/editor/core/event/handlers/copy.ts')
if (fs.existsSync(copyHandlerPath)) {
  const content = fs.readFileSync(copyHandlerPath, 'utf8')
  const forbiddenTableCopyPattern =
    /ElementType\.TABLE|colgroup|trList|tdList|getRangeRowCol|zipElementList|ITr\b/
  if (forbiddenTableCopyPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/event/handlers/copy.ts')
    violationList.push({
      rule: 'table copy structure construction must stay under src/editor/core/modules/table/interaction',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const eventClipboardImagePath = path.join(
  rootDir,
  'src/editor/core/event/clipboard/pasteImageFile.ts'
)
if (fs.existsSync(eventClipboardImagePath)) {
  const relativePath = normalizePath(
    'src/editor/core/event/clipboard/pasteImageFile.ts'
  )
  violationList.push({
    rule: 'image clipboard insertion must stay under src/editor/core/modules/image/clipboard',
    path: relativePath,
    line: 1,
    text: relativePath
  })
}

const applyPasteElementsPath = path.join(
  rootDir,
  'src/editor/core/event/clipboard/applyPasteElements.ts'
)
if (fs.existsSync(applyPasteElementsPath)) {
  const content = fs.readFileSync(applyPasteElementsPath, 'utf8')
  if (/titleId|listId|VIRTUAL_ELEMENT_TYPE|ZERO/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/clipboard/applyPasteElements.ts'
    )
    violationList.push({
      rule: 'structured paragraph paste cleanup must stay under src/editor/core/modules/paragraph/clipboard',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const selectionDragRangePath = path.join(
  rootDir,
  'src/editor/core/range/selection/resolveSelectionDragRange.ts'
)
if (fs.existsSync(selectionDragRangePath)) {
  const content = fs.readFileSync(selectionDragRangePath, 'utf8')
  const forbiddenControlPlaceholderRangePattern =
    /ControlComponent|\.controlComponent|\.controlId/
  if (forbiddenControlPlaceholderRangePattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/range/selection/resolveSelectionDragRange.ts'
    )
    violationList.push({
      rule: 'control placeholder selection rules must stay under src/editor/core/modules/control/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const selectionDragIntentPath = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/selection/SelectionDragIntent.ts'
)
if (fs.existsSync(selectionDragIntentPath)) {
  const content = fs.readFileSync(selectionDragIntentPath, 'utf8')
  if (
    /range\.(?:tableId|startTdIndex|endTdIndex|startTrIndex|endTrIndex)/.test(
      content
    )
  ) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/selection/SelectionDragIntent.ts'
    )
    violationList.push({
      rule: 'table cross row-col selection detection must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const paragraphSelectionIntentPath = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/selection/ParagraphSelectionIntent.ts'
)
if (fs.existsSync(paragraphSelectionIntentPath)) {
  const content = fs.readFileSync(paragraphSelectionIntentPath, 'utf8')
  if (/listWrap|listId|titleId/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/event/pointer/intents/selection/ParagraphSelectionIntent.ts'
    )
    violationList.push({
      rule: 'paragraph selection boundary rules must stay under src/editor/core/modules/paragraph',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const rangeManagerEditPath = path.join(
  rootDir,
  'src/editor/core/range/RangeManagerEdit.ts'
)
if (fs.existsSync(rangeManagerEditPath)) {
  const content = fs.readFileSync(rangeManagerEditPath, 'utf8')
  const forbiddenRangeManagerControlPattern =
    /ControlComponent|\.controlComponent|\.controlId|initControl|destroyControl/
  if (forbiddenRangeManagerControlPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/range/RangeManagerEdit.ts')
    violationList.push({
      rule: 'range control business rules must stay under src/editor/core/modules/control',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const rangeManagerStatePath = path.join(
  rootDir,
  'src/editor/core/range/RangeManagerState.ts'
)
if (fs.existsSync(rangeManagerStatePath)) {
  const content = fs.readFileSync(rangeManagerStatePath, 'utf8')
  const forbiddenRangeManagerTableProjectionPattern =
    /resolveActiveLogicalTableCell|resolveActiveLogicalTableTd|resolveTableSliceByPositionContext|getCellSlicesByLogicalCell|resolveCellSliceByAbsoluteIndex|resolveCellSliceByPageNo/
  if (forbiddenRangeManagerTableProjectionPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/range/RangeManagerState.ts')
    violationList.push({
      rule: 'range table projection details must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const commandAdaptMediaPath = path.join(
  rootDir,
  'src/editor/core/command/CommandAdaptMedia.ts'
)
if (fs.existsSync(commandAdaptMediaPath)) {
  const content = fs.readFileSync(commandAdaptMediaPath, 'utf8')
  const forbiddenImageCommandPattern =
    /ElementType\.IMAGE|ImageDisplay\.(?:SURROUND|TIGHT|FLOAT_TOP|FLOAT_BOTTOM)|downloadFile|imgFloatPosition|imgDisplay/
  if (forbiddenImageCommandPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptMedia.ts'
    )
    violationList.push({
      rule: 'image command business rules must stay under src/editor/core/modules/image/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenInlineCommandPattern =
    /ElementType\.HYPERLINK|delete\s+element\.(?:type|url|hyperlinkId|underline)|\.url\s*=|valueList\?\.map/
  if (forbiddenInlineCommandPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptMedia.ts'
    )
    violationList.push({
      rule: 'inline command business rules must stay under src/editor/core/modules/inline/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenWatermarkCommandPattern =
    /defaultWatermarkOption|options\.watermark\.(?:data|type|width|height|color|size|opacity|font|repeat|numberType|gap)|options\.watermark\s*=/
  if (forbiddenWatermarkCommandPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptMedia.ts'
    )
    violationList.push({
      rule: 'watermark command business rules must stay under src/editor/core/modules/watermark/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenSeparatorCommandPattern =
    /ElementType\.SEPARATOR|dashArray|value\s*:\s*WRAP|startElement\?\.value\s*===\s*ZERO/
  if (forbiddenSeparatorCommandPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptMedia.ts'
    )
    violationList.push({
      rule: 'separator command business rules must stay under src/editor/core/modules/separator/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenPageBreakCommandPattern =
    /ElementType\.PAGE_BREAK|type:\s*ElementType\.PAGE_BREAK/
  if (forbiddenPageBreakCommandPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptMedia.ts'
    )
    violationList.push({
      rule: 'page break command business rules must stay under src/editor/core/modules/page-break/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const commandAdaptRichTextPath = path.join(
  rootDir,
  'src/editor/core/command/CommandAdaptRichText.ts'
)
if (fs.existsSync(commandAdaptRichTextPath)) {
  const content = fs.readFileSync(commandAdaptRichTextPath, 'utf8')
  if (/ElementType\.(?:SUPERSCRIPT|SUBSCRIPT|TEXT)/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptRichText.ts'
    )
    violationList.push({
      rule: 'richtext script command rules must stay under src/editor/core/modules/richtext/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const commandAdaptDomainPath = path.join(
  rootDir,
  'src/editor/core/command/CommandAdaptDomain.ts'
)
if (fs.existsSync(commandAdaptDomainPath)) {
  const content = fs.readFileSync(commandAdaptDomainPath, 'utf8')
  if (/ControlComponent|\.controlComponent/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptDomain.ts'
    )
    violationList.push({
      rule: 'control command location rules must stay under src/editor/core/modules/control/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const commandAdaptPageElementPath = path.join(
  rootDir,
  'src/editor/core/command/CommandAdaptPageElement.ts'
)
if (fs.existsSync(commandAdaptPageElementPath)) {
  const content = fs.readFileSync(commandAdaptPageElementPath, 'utf8')
  if (/ElementType\.(?:LIST|TITLE)/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/command/CommandAdaptPageElement.ts'
    )
    violationList.push({
      rule: 'list/title command query rules must stay under src/editor/core/modules/*/command',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const rangeManagerQueryPath = path.join(
  rootDir,
  'src/editor/core/range/RangeManagerQuery.ts'
)
if (fs.existsSync(rangeManagerQueryPath)) {
  const content = fs.readFileSync(rangeManagerQueryPath, 'utf8')
  const forbiddenRangeManagerTableSearchPattern =
    /EditorContext\.TABLE|range\.tableId|range\.startTdIndex|range\.endTdIndex|range\.startTrIndex|range\.endTrIndex/
  if (forbiddenRangeManagerTableSearchPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/range/RangeManagerQuery.ts')
    violationList.push({
      rule: 'range table search context mapping must stay under src/editor/core/modules/table/selection',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenRangeManagerParagraphBoundaryPattern =
    /listWrap|listId\s*!==|titleId\s*!==|value\s*===\s*ZERO/
  if (forbiddenRangeManagerParagraphBoundaryPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/range/RangeManagerQuery.ts')
    violationList.push({
      rule: 'range paragraph boundary rules must stay under src/editor/core/modules/paragraph',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const positionHitTestMethodsTablePath = path.join(
  rootDir,
  'src/editor/core/position/PositionHitTestMethods.ts'
)
if (fs.existsSync(positionHitTestMethodsTablePath)) {
  const content = fs.readFileSync(positionHitTestMethodsTablePath, 'utf8')
  const forbiddenControlHitTestPattern =
    /ControlComponent|\.controlComponent|\.controlId/
  if (forbiddenControlHitTestPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/position/PositionHitTestMethods.ts'
    )
    violationList.push({
      rule: 'control hit-test rules must stay under src/editor/core/modules/control/hittest',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  const forbiddenImageHitTestPattern =
    /ImageDisplay|ElementType\.(?:IMAGE|LATEX)|\.imgDisplay\b|imgFloatPosition/
  if (forbiddenImageHitTestPattern.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/position/PositionHitTestMethods.ts'
    )
    violationList.push({
      rule: 'image hit-test rules must stay under src/editor/core/modules/image/hittest',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
  if (/ListStyle|ElementType\.TAB|CHECKBOX|\.listStyle/.test(content)) {
    const relativePath = normalizePath(
      'src/editor/core/position/PositionHitTestMethods.ts'
    )
    violationList.push({
      rule: 'list checkbox hit-test rules must stay under src/editor/core/modules/list/hittest',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const positionServiceImagePath = path.join(rootDir, 'src/editor/core/position/Position.ts')
if (fs.existsSync(positionServiceImagePath)) {
  const content = fs.readFileSync(positionServiceImagePath, 'utf8')
  const forbiddenImagePositionPattern =
    /ImageDisplay|ElementType\.(?:IMAGE|LATEX)|\.imgDisplay\b|imgFloatPosition/
  if (forbiddenImagePositionPattern.test(content)) {
    const relativePath = normalizePath('src/editor/core/position/Position.ts')
    violationList.push({
      rule: 'image position rules must stay under src/editor/core/modules/image/position',
      path: relativePath,
      line: 1,
      text: relativePath
    })
  }
}

const pointerEffectsDir = path.join(rootDir, 'src/editor/core/event/pointer/effects')
if (fs.existsSync(pointerEffectsDir)) {
  const misplacedTablePointerFileList = fs
    .readdirSync(pointerEffectsDir)
    .filter(fileName => /^TableToolEffect\.ts$/.test(fileName))
  for (const fileName of misplacedTablePointerFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/event/pointer/effects/${fileName}`
    )
    violationList.push({
      rule: 'table pointer effects must stay under src/editor/core/modules/table/interaction',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
  const misplacedInlinePointerEffectList = fs
    .readdirSync(pointerEffectsDir)
    .filter(fileName => /^(?:PointerAuxiliaryEffect|PreviewerEffect)\.ts$/.test(fileName))
  for (const fileName of misplacedInlinePointerEffectList) {
    const misplacedPath = normalizePath(
      `src/editor/core/event/pointer/effects/${fileName}`
    )
    violationList.push({
      rule: 'image and inline pointer effects must stay under src/editor/core/modules/image or src/editor/core/modules/inline',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const pointerTableIntentDir = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/table'
)
if (fs.existsSync(pointerTableIntentDir)) {
  const misplacedTableIntentFileList = fs
    .readdirSync(pointerTableIntentDir)
    .filter(fileName => /\.ts$/.test(fileName))
  for (const fileName of misplacedTableIntentFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/event/pointer/intents/table/${fileName}`
    )
    violationList.push({
      rule: 'table pointer intents must stay under src/editor/core/modules/table/interaction',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const pointerControlIntentDir = path.join(
  rootDir,
  'src/editor/core/event/pointer/intents/controls'
)
if (fs.existsSync(pointerControlIntentDir)) {
  const misplacedControlIntentFileList = fs
    .readdirSync(pointerControlIntentDir)
    .filter(fileName => /\.ts$/.test(fileName))
  for (const fileName of misplacedControlIntentFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/event/pointer/intents/controls/${fileName}`
    )
    violationList.push({
      rule: 'control pointer business logic must stay under src/editor/core/modules/control',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const pointerControlPolicyDir = path.join(
  rootDir,
  'src/editor/core/event/pointer/policies'
)
if (fs.existsSync(pointerControlPolicyDir)) {
  const misplacedControlPolicyFileList = fs
    .readdirSync(pointerControlPolicyDir)
    .filter(fileName => /\.ts$/.test(fileName))
  for (const fileName of misplacedControlPolicyFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/event/pointer/policies/${fileName}`
    )
    violationList.push({
      rule: 'control pointer policies must stay under src/editor/core/modules/control/policy',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const pointerRowDragDir = path.join(rootDir, 'src/editor/core/event/pointer/row-drag')
if (fs.existsSync(pointerRowDragDir)) {
  const misplacedRowDragFileList = fs
    .readdirSync(pointerRowDragDir)
    .filter(fileName => /\.ts$/.test(fileName))
  for (const fileName of misplacedRowDragFileList) {
    const misplacedPath = normalizePath(
      `src/editor/core/event/pointer/row-drag/${fileName}`
    )
    violationList.push({
      rule: 'row drag business logic must stay under src/editor/core/modules/row-drag',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const eventUtilsDir = path.join(rootDir, 'src/editor/core/event/utils')
if (fs.existsSync(eventUtilsDir)) {
  const misplacedRangeUtilityFileList = fs
    .readdirSync(eventUtilsDir)
    .filter(fileName =>
      /^(?:resolveSelection(?:DragRange|StartState)|resolvePointerMouseDownIndex)\.ts$/.test(fileName)
    )
  for (const fileName of misplacedRangeUtilityFileList) {
    const misplacedPath = normalizePath(`src/editor/core/event/utils/${fileName}`)
    violationList.push({
      rule: 'selection range resolver files must stay under src/editor/core/range/selection',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }

  const misplacedPositionUtilityFileList = fs
    .readdirSync(eventUtilsDir)
    .filter(fileName => /^resolvePositionAtIndex\.ts$/.test(fileName))
  for (const fileName of misplacedPositionUtilityFileList) {
    const misplacedPath = normalizePath(`src/editor/core/event/utils/${fileName}`)
    violationList.push({
      rule: 'position index resolver files must stay under src/editor/core/position/utils',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }

  const misplacedPointerCoordinateFileList = fs
    .readdirSync(eventUtilsDir)
    .filter(fileName => /^PagePointTypes\.ts$/.test(fileName))
  for (const fileName of misplacedPointerCoordinateFileList) {
    const misplacedPath = normalizePath(`src/editor/core/event/utils/${fileName}`)
    violationList.push({
      rule: 'page pointer coordinate types must stay under src/editor/core/event/pointer/coordinates',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

const rangeSelectionDragResolverPath = path.join(
  rootDir,
  'src/editor/core/range/selection/resolveSelectionDragRange.ts'
)
if (fs.existsSync(rangeSelectionDragResolverPath)) {
  const content = fs.readFileSync(rangeSelectionDragResolverPath, 'utf8')
  if (
    /table\/(?:layout|navigation)\/(?:TableLayoutSnapshotTypes|TableNavigationAlgorithms)/.test(
      content
    )
  ) {
    violationList.push({
      rule: 'table drag selection internals must stay under src/editor/core/modules/table/selection',
      path: normalizePath(
        'src/editor/core/range/selection/resolveSelectionDragRange.ts'
      ),
      line: 1,
      text: 'range selection drag resolver imports table layout/navigation internals'
    })
  }
}

const positionServicePath = path.join(rootDir, 'src/editor/core/position/Position.ts')
if (fs.existsSync(positionServicePath)) {
  const content = fs.readFileSync(positionServicePath, 'utf8')
  if (
    /forEachTableCell|resolveTableTdByIndex|getCellSlicesByLogicalCell/.test(
      content
    )
  ) {
    violationList.push({
      rule: 'table position list resolution must stay under src/editor/core/modules/table/position',
      path: normalizePath('src/editor/core/position/Position.ts'),
      line: 1,
      text: 'Position.ts contains table position list resolution internals'
    })
  }
  if (/getTableCellContentInset|td\.positionList|tdPaddingHeight/.test(content)) {
    violationList.push({
      rule: 'table cell position calculation must stay under src/editor/core/modules/table/position',
      path: normalizePath('src/editor/core/position/Position.ts'),
      line: 1,
      text: 'Position.ts contains table cell position calculation internals'
    })
  }
  if (/ElementType\.TABLE|tableDisplay/.test(content)) {
    violationList.push({
      rule: 'table position element policies must stay under src/editor/core/modules/table/position',
      path: normalizePath('src/editor/core/position/Position.ts'),
      line: 1,
      text: 'Position.ts contains table element position policies'
    })
  }
}

const positionHitTestMethodsPath = path.join(
  rootDir,
  'src/editor/core/position/PositionHitTestMethods.ts'
)
if (fs.existsSync(positionHitTestMethodsPath)) {
  const content = fs.readFileSync(positionHitTestMethodsPath, 'utf8')
  if (/tdValueIndex|tdId:\s*element\.tdId|trId:\s*element\.trId/.test(content)) {
    violationList.push({
      rule: 'table float hit result construction must stay under src/editor/core/modules/table/hittest',
      path: normalizePath('src/editor/core/position/PositionHitTestMethods.ts'),
      line: 1,
      text: 'PositionHitTestMethods.ts constructs table float hit metadata'
    })
  }
}

const legacyMenuSpecDir = path.join(rootDir, 'cypress/e2e/menus')
if (fs.existsSync(legacyMenuSpecDir)) {
  const legacyTableSpecList = fs
    .readdirSync(legacyMenuSpecDir)
    .filter(fileName => /^table.*\.ts$/.test(fileName))
  for (const fileName of legacyTableSpecList) {
    const legacyPath = normalizePath(`cypress/e2e/menus/${fileName}`)
    violationList.push({
      rule: 'table Cypress specs must stay under cypress/e2e/table',
      path: legacyPath,
      line: 1,
      text: legacyPath
    })
  }
}

const tableSpecDir = path.join(rootDir, 'cypress/e2e/table')
if (fs.existsSync(tableSpecDir)) {
  const misplacedTablePartList = fs
    .readdirSync(tableSpecDir)
    .filter(fileName => /^table-pagination-(?:input|mock)\.part\d+\.ts$/.test(fileName))
  for (const fileName of misplacedTablePartList) {
    const misplacedPath = normalizePath(`cypress/e2e/table/${fileName}`)
    violationList.push({
      rule: 'large table pagination part specs must stay in dedicated subdirectories',
      path: misplacedPath,
      line: 1,
      text: misplacedPath
    })
  }
}

for (const requiredPath of requiredProjectIndexPathList) {
  if (!fs.existsSync(path.join(rootDir, requiredPath))) {
    violationList.push({
      rule: 'project directories must keep index documentation',
      path: requiredPath,
      line: 1,
      text: requiredPath
    })
  }
}

for (const parentDir of requiredChildReadmeDirList) {
  const parentPath = path.join(rootDir, parentDir)
  if (!fs.existsSync(parentPath)) continue
  const childDirList = fs
    .readdirSync(parentPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
  for (const childDir of childDirList) {
    const readmePath = normalizePath(`${parentDir}/${childDir.name}/README.md`)
    if (!fs.existsSync(path.join(rootDir, readmePath))) {
      violationList.push({
        rule: 'core child directories must keep README documentation',
        path: readmePath,
        line: 1,
        text: readmePath
      })
    }
  }
}

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
