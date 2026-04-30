import http from 'http'
import { spawn } from 'child_process'

const ISSUE_SPECS = {
  41: {
    title: '表格分页',
    specs: [
      'cypress/e2e/menus/table-selection-nonpaged.cy.ts',
      'cypress/e2e/menus/table-pagination-input.cy.ts',
      'cypress/e2e/menus/table-pagination-merged.cy.ts',
      'cypress/e2e/menus/table-pagination-mock.cy.ts',
      'cypress/e2e/menus/table-pagination-multicell.cy.ts',
      'cypress/e2e/menus/table-pagination-border.cy.ts',
      'cypress/e2e/menus/table-pagination-adjacent-cell.cy.ts',
      'cypress/e2e/menus/table-pagination-adjacent-highlight.cy.ts',
      'cypress/e2e/menus/table-pagination-empty-last-row.cy.ts',
      'cypress/e2e/menus/table-pagination-merge-highlight.cy.ts'
    ]
  },
  94: {
    title: '连页模式数据比较多时显示白屏',
    specs: ['cypress/e2e/issues/issue-94-continuity-large-doc.cy.ts']
  },
  390: {
    title: '是否可以生成如下的表格',
    manual: true,
    note: '标题过泛，需先读取 issue 具体表格结构再补验证样例。'
  },
  425: {
    title: '文本控件内容中，再插入控件，页面{}显示有问题。',
    specs: ['cypress/e2e/control/text.cy.ts'],
    note: '现有 spec 仅作相关链路回归，不能完全等价覆盖 issue 场景。'
  },
  440: {
    title: '文档列表内容内无法取消或者增加子列表',
    specs: ['cypress/e2e/menus/text.cy.ts', 'cypress/e2e/menus/row.cy.ts'],
    note: '现有 spec 偏文本/段落，建议后续补子列表专项场景。'
  },
  446: {
    title: '格式刷未携带所有格式',
    specs: ['cypress/e2e/menus/painter.cy.ts']
  },
  621: {
    title: '支持序号元素或段落拖拽',
    manual: true,
    note: '当前没有明确针对段落拖拽的菜单级自动化 spec。'
  },
  692: {
    title: '标点符号排版优化',
    manual: true,
    note: '更适合做像素/文本布局专项样例，当前没有现成自动化 spec。'
  },
  725: {
    title: '排版缩进',
    specs: ['cypress/e2e/menus/row.cy.ts', 'cypress/e2e/menus/text.cy.ts']
  },
  813: {
    title: '光标位置',
    specs: [
      'cypress/e2e/menus/pointer-debug-selection.cy.ts',
      'cypress/e2e/menus/plain-text-selection.cy.ts'
    ]
  },
  837: {
    title: '大文本计算性能优化',
    manual: true,
    note: '当前没有大文本性能自动化基线；建议补脚本化性能样例。'
  },
  877: {
    title: '分页符行为优化',
    specs: ['cypress/e2e/menus/pagebreak.cy.ts']
  },
  1053: {
    title: '单元格框线设置',
    specs: [
      'cypress/e2e/menus/table.cy.ts',
      'cypress/e2e/menus/table-pagination-border.cy.ts'
    ]
  },
  1163: {
    title: '表格前如何添加文字',
    specs: [
      'cypress/e2e/menus/table.cy.ts',
      'cypress/e2e/issues/issue-inline-table-label.cy.ts',
      'cypress/e2e/issues/issue-1163-text-before-table.cy.ts',
      'cypress/e2e/issues/issue-left-blank-after-table-click.cy.ts'
    ]
  },
  1190: {
    title: 'tab缩进更多场景',
    manual: true,
    note: '当前 Tab 主链不能通过稳定的 Cypress DOM 事件可靠驱动，暂保留为人工验证。'
  },
  1200: {
    title: 'Smart Word Wrapping Around Images ("SURROUND")',
    specs: ['cypress/e2e/menus/image.cy.ts'],
    note: '仅覆盖图片主链；复杂环绕行为仍建议人工复验。'
  },
  1372: {
    title: '图片浮动文字之上问题',
    specs: ['cypress/e2e/menus/image.cy.ts'],
    note: '仅覆盖图片主链；浮动压字问题仍建议人工复验。'
  },
  1385: {
    title: '官网的demo中 在文本、列举控件中 插入下划线 显示异常',
    specs: ['cypress/e2e/menus/format.cy.ts']
  },
  1399: {
    title: '选中CONTROL类型的内容，向前删除executeBackspace无效',
    specs: ['cypress/e2e/issues/issue-1399-control-backspace.cy.ts']
  },
  1404: {
    title: '插入表格的时候当colgroup未传入时，默认使用编辑器宽度平分',
    specs: ['cypress/e2e/menus/table.cy.ts'],
    note: '现有表格 spec 仅作相关链路回归，建议后续补 colgroup 缺省专项场景。'
  }
}

const CURRENT_ISSUES = [
  41, 1385, 1404, 440, 425,
  837, 1372, 1200, 1190, 1053, 877, 725, 692, 621, 390
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

function getIssueConfig(issueNo) {
  return ISSUE_SPECS[issueNo] || null
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
          ['/d', '/s', '/c', 'npm run dev -- --host 127.0.0.1 --port 3000 --strictPort'],
          {
            stdio: 'inherit'
          }
        )
      : spawn(
          'npm',
          ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '3000', '--strictPort'],
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
    console.log('No issues selected. Use --current, --issue 41,94,813, or --list.')
    return
  }

  const { specs, manualIssues, unknownIssues } = resolveSpecs(issueList)
  if (unknownIssues.length) {
    console.log(`Unknown issues: ${unknownIssues.map(no => `#${no}`).join(', ')}`)
  }
  if (manualIssues.length) {
    console.log(`Manual-only issues: ${manualIssues.map(no => `#${no}`).join(', ')}`)
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
