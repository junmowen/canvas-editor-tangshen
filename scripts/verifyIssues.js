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
    specs: ['cypress/e2e/issues/issue-390-dynamic-table-data.cy.ts'],
    note: '仅验证应用层动态构造 trList/tdList 后可 setValue 渲染；模板绑定数据源自动展开仍属于未内置能力。'
  },
  425: {
    title: '文本控件内容中，再插入控件，页面{}显示有问题。',
    specs: [
      'cypress/e2e/issues/issue-425-control-in-text-control.cy.ts',
      'cypress/e2e/control/text.cy.ts'
    ]
  },
  1146: {
    title: '文本控件内嵌控件回写后保留 prefix/postfix',
    specs: ['cypress/e2e/issues/issue-425-control-in-text-control.cy.ts']
  },
  440: {
    title: '文档列表内容内无法取消或者增加子列表',
    specs: ['cypress/e2e/issues/issue-440-list-sublevel.cy.ts']
  },
  446: {
    title: '格式刷未携带所有格式',
    specs: ['cypress/e2e/menus/painter.cy.ts']
  },
  605: {
    title: '按段落设置行布局方式',
    specs: ['cypress/e2e/issues/issue-605-paragraph-row-layout.cy.ts']
  },
  604: {
    title: 'executeInsertElementList 插入标题保留 conceptId',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  621: {
    title: '支持序号元素或段落拖拽',
    specs: ['cypress/e2e/issues/issue-621-list-drag-reorder.cy.ts']
  },
  692: {
    title: '标点符号排版优化',
    specs: ['cypress/e2e/issues/issue-692-punctuation-hanging.cy.ts']
  },
  725: {
    title: '排版缩进',
    specs: [
      'cypress/e2e/issues/issue-725-row-indent.cy.ts',
      'cypress/e2e/menus/row.cy.ts'
    ]
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
    specs: [
      'cypress/e2e/issues/issue-837-large-document-performance.cy.ts',
      'cypress/e2e/issues/issue-94-continuity-large-doc.cy.ts'
    ]
  },
  877: {
    title: '分页符行为优化',
    specs: [
      'cypress/e2e/issues/issue-877-pagebreak-behavior.cy.ts',
      'cypress/e2e/menus/pagebreak.cy.ts'
    ]
  },
  1053: {
    title: '单元格框线设置',
    specs: [
      'cypress/e2e/issues/issue-1053-table-cell-border.cy.ts',
      'cypress/e2e/issues/issue-1053-single-cell-drag-selection.cy.ts',
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
    specs: [
      'cypress/e2e/issues/issue-1190-tab-indent-text.cy.ts',
      'cypress/e2e/issues/issue-440-list-sublevel.cy.ts'
    ]
  },
  942: {
    title: 'Tab占位后，设置样式无效（字体字号加粗等）',
    specs: ['cypress/e2e/issues/issue-1190-tab-indent-text.cy.ts']
  },
  974: {
    title: 'Tab占位后，设置样式无效（字体字号加粗等）',
    specs: ['cypress/e2e/issues/issue-1190-tab-indent-text.cy.ts']
  },
  1200: {
    title: 'Smart Word Wrapping Around Images ("SURROUND")',
    specs: ['cypress/e2e/issues/issue-1372-1200-image-surround.cy.ts']
  },
  1202: {
    title: 'getValue 获取表格 id',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1212: {
    title: 'executeLocationArea OUTER_AFTER 定位到区域外部',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1216: {
    title: 'getCatalog 支持表格单元格内标题',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1147: {
    title: 'area setValue/getValue 保留内部样式',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1119: {
    title: '只读和打印模式下普通编辑命令不能修改 AREA 内容',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1410: {
    title: '隐藏元素导出时整行不占位',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1305: {
    title: '表格内触发全选时选中整篇文档',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1317: {
    title: 'AREA 元素支持在表格单元格中保留',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1194: {
    title: '图片元素隐藏设置',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1180: {
    title: '区域末尾追加内容',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1195: {
    title: 'executeLocationArea AFTER 后追加到区域末尾',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1223: {
    title: 'executeInsertArea 支持按光标插入并保留 id',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1281: {
    title: 'executeInsertElementList 插入 area 后可 executeSetAreaValue',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1243: {
    title: '按 areaId 批量更新区域内控件值',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1261: {
    title: '表格单元格内按 range 插入 AREA 保留 area 属性',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1227: {
    title: 'executeSetRange 表格参数可选中单元格文字并添加批注',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1368: {
    title: 'executeInsertElementList 可插入 AREA',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1377: {
    title: '按 id 删除指定 AREA 区域',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1381: {
    title: '表格单元格首个列表不产生额外前导换行',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1372: {
    title: '图片浮动文字之上问题',
    specs: ['cypress/e2e/issues/issue-1372-1200-image-surround.cy.ts']
  },
  1387: {
    title: '希望表格可以添加根据内容自动调整的功能',
    specs: ['cypress/e2e/menus/table.cy.ts']
  },
  1385: {
    title: '官网的demo中 在文本、列举控件中 插入下划线 显示异常',
    specs: [
      'cypress/e2e/issues/issue-1385-control-underline.cy.ts',
      'cypress/e2e/menus/format.cy.ts'
    ]
  },
  1399: {
    title: '选中CONTROL类型的内容，向前删除executeBackspace无效',
    specs: [
      'cypress/e2e/issues/issue-1399-control-backspace.cy.ts',
      'cypress/e2e/issues/issue-form-control-deletion-disabled.cy.ts'
    ]
  },
  1400: {
    title: '选中CONTROL类型的内容，向前删除executeBackspace无效',
    specs: ['cypress/e2e/issues/issue-1399-control-backspace.cy.ts']
  },
  1404: {
    title: '插入表格的时候当colgroup未传入时，默认使用编辑器宽度平分',
    specs: [
      'cypress/e2e/issues/issue-1404-table-colgroup-default.cy.ts',
      'cypress/e2e/menus/table.cy.ts'
    ]
  },
  1398: {
    title: '列表内元素按 id 获取和更新',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1393: {
    title: '表格背景色导出后没了',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1357: {
    title: 'HTML 导入导出保留 groupIds',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1365: {
    title: '自定义粘贴可委托非图片内容走内置流程',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1369: {
    title: 'iframe block 内部 HTML 变更后 getValue 同步 srcdoc',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1354: {
    title: 'HTML 转元素时图片继承 rowFlex',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1335: {
    title: '存在选区时执行搜索不抢光标',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1336: {
    title: '支持在选定内容内搜索',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1346: {
    title: '单选控件候选文字搜索不影响后续匹配',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1311: {
    title: 'executeInsertElementList rowFlex option not working',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1308: {
    title: '搜索支持正则表达式',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1296: {
    title: 'Element 里的 id 属性保留',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1282: {
    title: 'executeHyperlink 插入链接保留文字样式',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1286: {
    title: 'getElementListByHTML 支持无 options 解析表格',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1260: {
    title: 'iframe block 支持 fullscreen 与 popup 跳转权限',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1264: {
    title: 'executeSetHTML 保留 font-family',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1088: {
    title: 'executeSetHTML 回显保留 font-family',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  305: {
    title: 'executeSetControlValue 支持表格内控件',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  988: {
    title: 'executeSetControlValue 支持 null 清空控件值',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  323: {
    title: 'executeSetControlExtension 支持表格内控件',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  628: {
    title: 'getControlList 返回表格内控件',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  653: {
    title: 'executeSetControlProperties 支持表格内控件',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  884: {
    title: '表格内控件 executeSetControlValue 不报错并生效',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1140: {
    title: 'number/select 控件值高亮处理',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1319: {
    title: 'NUMBER 控件阻止回车写入换行',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1360: {
    title: 'getRangeContext 返回段落起始索引',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1353: {
    title: 'disabled 控件定位不聚焦到 postfix',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1150: {
    title: 'getRangeContext 返回起止列号',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1219: {
    title: '控件支持空 prefix/postfix 去掉括号',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1225: {
    title: '加载列举、复选、单选控件时展示已选文字',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1136: {
    title: 'date 控件支持 IElement[] 值样式',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1143: {
    title: '表单模式下控件结构删除保护',
    specs: ['cypress/e2e/issues/issue-form-control-deletion-disabled.cy.ts']
  },
  1128: {
    title: '未选中 checkbox 控件值保持为空',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1073: {
    title: 'getHTML 仅输出 checkbox 已选项',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1071: {
    title: '控件全局 prefix/postfix 为空字符串时可正常插入和设值',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1037: {
    title: '批量设置控件属性和值',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1251: {
    title: 'executeSetHTML 保留表格行高',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1135: {
    title: 'getHTML 导出段落行距样式',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1039: {
    title: '列表元素 getValue 保留 extension/externalId',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1067: {
    title: 'getValueAsync 返回与 getValue 一致的数据结构',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1049: {
    title: 'getValue 保留 titleId',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1389: {
    title: '相邻列表 setValue/getValue 不插入额外换行',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  }
}

const CURRENT_ISSUES = [
  41, 1399, 1385, 1404, 440, 425, 813,
  837, 1372, 1200, 1190, 1053, 877, 725, 692, 621, 605, 390,
  1387
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
