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
  1397: {
    title: '连页模式下水印仍然生效',
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
  1153: {
    title: '构造函数 options 中的宽高生效',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1156: {
    title: '内部输入事件通过 eventBus.input 回调',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1160: {
    title: '图片 mousedown 事件回调携带图片元素',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1164: {
    title: '页眉页脚可分别配置正文激活时透明度',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1314: {
    title: '打印导出可禁用页面背景',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1240: {
    title: '更新页边距后 getCursorPosition 坐标同步刷新',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1218: {
    title: 'getImage 打印模式导出不包含页边距指示器',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1016: {
    title: 'executeSize 后 rangeStyleChange 立即返回更新后的字号',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1181: {
    title: '水印可在添加时调整尺寸',
    specs: ['cypress/e2e/menus/watermark.cy.ts']
  },
  440: {
    title: '文档列表内容内无法取消或者增加子列表',
    specs: ['cypress/e2e/issues/issue-440-list-sublevel.cy.ts']
  },
  446: {
    title: '格式刷未携带所有格式',
    specs: ['cypress/e2e/menus/painter.cy.ts']
  },
  225: {
    title: 'getHTML 可导出分页符信息并可回显解析',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  261: {
    title: 'getHTML 支持分页符标识',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  273: {
    title: 'readonly 模式初始化内容不空白',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  369: {
    title: 'executeSetValue 可多次切换模板数据',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  605: {
    title: '按段落设置行布局方式',
    specs: ['cypress/e2e/issues/issue-605-paragraph-row-layout.cy.ts']
  },
  622: {
    title: 'executeUpdateOptions 可更新纸张宽高',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  664: {
    title: 'executeSetHTML 单次导入 base64 图片',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  677: {
    title: 'executeSetHTML 支持 base64 图片',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  683: {
    title: 'getControlList 返回标题和列表内的控件',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  704: {
    title: 'executeSetHTML 不注入 rgba(0,0,0,0.65) 文本颜色',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  754: {
    title: 'executeInsertElementList 插入元素保留右对齐 rowFlex',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  771: {
    title: '文档开头换行可多轮 getValue/setValue 保留',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  812: {
    title: 'getCatalog 返回标题页码',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  819: {
    title: '公开工具支持不实例化编辑器进行 JSON/HTML/Text 转换',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  862: {
    title: '输入后 getWordCount 更新为当前内容字数',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  890: {
    title: '编辑器 JSON 与 HTML 可通过工具互转',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  906: {
    title: 'executePageScale 支持设置指定缩放值',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  536: {
    title: 'getTitleValue 可按标题 conceptId 获取对应内容',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  715: {
    title: 'executeSetValue 支持 isSetCursor 将光标定位到末尾',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  738: {
    title: 'getCatalog 返回标题 id、层级和页码',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  917: {
    title: '正文和区域徽章 API 可配置',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  918: {
    title: '文档状态徽章 API 可配置',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  919: {
    title: '区域 badge 支持文本 value',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
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
  1186: {
    title: 'Tab 后复选框列表仍可勾选',
    specs: ['cypress/e2e/issues/issue-1190-tab-indent-text.cy.ts']
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
  1059: {
    title: 'HTML 表格字符串可解析为编辑器表格数据',
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
  1014: {
    title: 'AREA 支持不可删除配置',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1134: {
    title: '成组内容支持不可删除配置',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1010: {
    title: 'getPositionContextByEvent 可返回表格行列信息',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1076: {
    title: 'AREA 保留 placeholder 配置',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1079: {
    title: 'AREA 插入时内部内容不产生额外前导换行',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1084: {
    title: 'executeUpdateElementById 可更新 AREA 内图片',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1095: {
    title: 'getPositionContextByEvent 可获取 AREA 命中元素信息',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1091: {
    title: '插入 AREA 后可定位到区域外继续插入文本',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1098: {
    title: 'executeInsertArea 支持按光标位置插入 AREA',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1127: {
    title: '文档数据可显式插入分页符',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1139: {
    title: 'AREA 支持隐藏并保留 extension 元数据',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1248: {
    title: '表格回显保留低于默认配置的显式行高',
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
  989: {
    title: 'executeImage 返回插入图片 id',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  959: {
    title: 'executeUpdateElementById 更新控件附近图片后仍可更新控件',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1003: {
    title: 'executeDeleteElementById 按 id 删除元素',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  951: {
    title: 'getElementById 和 executeUpdateElementById 支持表格内元素',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  958: {
    title: 'getElementById 可按 id 获取图片等元素',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1086: {
    title: 'listener.saved 保存数据保留控件 id',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1245: {
    title: '通过 executeUpdateElementById 动态切换图片隐藏状态',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1234: {
    title: 'getValue 数据可直接用于 setValue 回显',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1241: {
    title: 'getHTML 导出页眉、正文、页脚 HTML',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1201: {
    title: '图片元素自定义元数据可通过 getValue 获取',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1182: {
    title: '页边距变化后图片保存回显保持原始宽高',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1215: {
    title: 'executeInsertElementList 插入图片后可从 getValue 读取 id 并按 id 删除',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1393: {
    title: '表格背景色导出后没了',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1392: {
    title: 'Ctrl+Shift+左右按词选择而不是整行选择',
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
  1359: {
    title: '粘贴普通 HTML 不继承 Bootstrap 全局灰色文本颜色',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1361: {
    title: '支持 Home 和 End 键盘导航及行内选择',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1369: {
    title: 'iframe block 内部 HTML 变更后 getValue 同步 srcdoc',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1373: {
    title: '只读和打印模式下 iframe block 内部元素禁止交互',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1374: {
    title: '打印模式下 block 位置保持正常',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1375: {
    title: 'iframe block 支持打印导出',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1376: {
    title: '多行段落方向键可回到视觉行首位置',
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
  1267: {
    title: 'executeAddWatermark 支持图片水印类型参数',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  380: {
    title: 'executeSetHTML 保留 font-family',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  488: {
    title: 'HTML 字体样式导入回显生效',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1088: {
    title: 'executeSetHTML 回显保留 font-family',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1094: {
    title: '标题 valueList 与标题正文值保持独立',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1097: {
    title: 'getTitleValue 返回标题内容且标题 valueList 可按 id 更新',
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
  902: {
    title: '控件支持 preText/postText 前后文本',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  905: {
    title: '批量删除控件支持表格内外匹配项',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  925: {
    title: '支持 NUMBER 数值控件基础 API',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1140: {
    title: 'number/select 控件值高亮处理',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1125: {
    title: 'controlChange 可区分控件内部和后缀位置',
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
  439: {
    title: 'executeSetControlValue 空字符串清空控件并恢复 placeholder',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  503: {
    title: '循环按顺序设置多个控件值不出现索引失效',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  278: {
    title: 'getControlValue 可读取文本控件值',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  686: {
    title: '表格内多个文本控件可清空并恢复 placeholder',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  835: {
    title: '表格内 date 控件可通过 executeSetControlValue 替换',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  821: {
    title: '表格内复杂控件 getControlValue 与 getValue 值一致',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1026: {
    title: 'checkbox/radio/select 支持数值 code 包括 0',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1036: {
    title: '隐藏且不可删除控件不阻塞连续退格',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1347: {
    title: '表单模式下首次点击 checkbox 可选中',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1340: {
    title: '下拉多选选择后保留弹窗滚动位置',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  395: {
    title: '下拉选择控件无选中项时展示 placeholder',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  883: {
    title: '控件 placeholder 中的换行可正确格式化',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  843: {
    title: '控件颜色保存和读取不丢失',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  853: {
    title: '文本控件支持 pasteDisabled 禁止粘贴属性',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1004: {
    title: 'getPositionContextByEvent 返回控件最新 value',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1075: {
    title: 'getValue().data.main 可稳定读取文档内容',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1109: {
    title: '样式设置 API 可更新 disabled 控件样式',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1105: {
    title: 'disabled 控件支持 disabledBackgroundColor 高亮',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  296: {
    title: 'executeSetControlProperties 可修改控件属性',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  298: {
    title: '插入控件继承当前字号',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  299: {
    title: '插入控件继承当前字号',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1092: {
    title: '相邻 disabled 控件中间可插入普通文本',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1071: {
    title: '控件全局 prefix/postfix 为空字符串时可正常插入和设值',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1413: {
    title: 'control.deletable=false 保护控件不被删除',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  633: {
    title: 'disabled 控件不能通过前向 Delete 删除',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1083: {
    title: '隐藏控件导出时不保留占位文本',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  976: {
    title: 'executeReplace 跳过 disabled 控件内容',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1203: {
    title: '表格单元格内控件支持 executeSetControlExtension',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1259: {
    title: '按区域维度批量设置重复 conceptId 控件值',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1310: {
    title: '可手输下拉选择控件退格/删除仅删除单个字符',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  1037: {
    title: '批量设置控件属性和值',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  916: {
    title: 'executeSetControlProperties 可更新已有 highlight 控件',
    specs: ['cypress/e2e/issues/issue-control-api-regressions.cy.ts']
  },
  964: {
    title: '表单模式下支持填充和读取一个或多个输入域控件',
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
  799: {
    title: '表格 tr/td 保留 extension 属性',
    specs: ['cypress/e2e/issues/issue-area-table-api-regressions.cy.ts']
  },
  1389: {
    title: '相邻列表 setValue/getValue 不插入额外换行',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1167: {
    title: '可通过 shortcutDisableKeys 禁止页面缩放快捷键',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1278: {
    title: '页眉页脚 disabled 后不占位且不进入编辑区',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1380: {
    title: 'getImage 支持导出 iframe block',
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
