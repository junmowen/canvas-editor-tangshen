export const ISSUE_SPECS_PART_1 = {
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
  376: {
    title: '通过两次回车的方式取消有序/无序列表',
    specs: ['cypress/e2e/issues/issue-376-list-double-enter.cy.ts']
  },
  776: {
    title: '希望实现分割线可删除或设置成透明功能',
    specs: ['cypress/e2e/menus/separator.cy.ts']
  },
  721: {
    title: '点击自定义的工具栏，编辑面板会失焦',
    specs: ['cypress/e2e/issues/issue-721-toolbar-component-focus.cy.ts']
  },
  871: {
    title: '点击操作栏后快捷键仍可作用于当前编辑选区',
    specs: ['cypress/e2e/issues/issue-721-toolbar-component-focus.cy.ts']
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
  111: {
    title: 'Issue with selection using Shift + Left/Right',
    specs: ['cypress/e2e/issues/issue-111-shift-selection-direction.cy.ts']
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
  1149: {
    title: '键盘移动光标触发 positionContextChange',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1175: {
    title: '宋体缩放后光标坐标保持一致',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1314: {
    title: '打印导出可禁用页面背景',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1249: {
    title: 'getImage 导出包含背景图片',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1247: {
    title: '关闭弹窗后恢复编辑器焦点',
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
  1043: {
    title: 'executeAddWatermark 支持图片格式水印',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  985: {
    title: 'executeInsertElementList 后光标停留在插入内容后',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1028: {
    title: '图片可禁用预览和缩放工具',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1132: {
    title: '只读和打印模式下可禁用图片选中与预览',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1124: {
    title: '可禁用和重新开启历史记录',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1193: {
    title: '韩文输入可正常提交',
    specs: ['cypress/e2e/issues/issue-colon-input.cy.ts']
  },
  1162: {
    title: '电子病历全角冒号输入不丢失',
    specs: ['cypress/e2e/issues/issue-colon-input.cy.ts']
  },
  1323: {
    title: '首个 j 输入不应引起后续文本抖动',
    specs: ['cypress/e2e/issues/issue-colon-input.cy.ts']
  },
  1209: {
    title: '输入字母 j 不应引起整行排版抖动',
    specs: ['cypress/e2e/issues/issue-colon-input.cy.ts']
  },
  1356: {
    title: '表格高度计算 API 修正',
    specs: ['cypress/e2e/issues/issue-1356-table-height.cy.ts']
  },
  1290: {
    title: '表格跨页时候后续executeInsertElementList内容位置有误',
    specs: ['cypress/e2e/issues/issue-table-typing-chunk-isolation.cy.ts']
  },
  981: {
    title: '水印支持页码占位符',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  973: {
    title: 'getHTML 保留浮动图片显示方式',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1300: {
    title: '格式刷支持无选区时应用到当前单词',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
  },
  1256: {
    title: '日期选择器支持年份和月份选择模式',
    specs: ['cypress/e2e/menus/date.cy.ts']
  },
  1364: {
    title: '代码块内容过长时自动换行',
    specs: ['cypress/e2e/menus/codeblock.cy.ts']
  },
  1181: {
    title: '水印可在添加时调整尺寸',
    specs: ['cypress/e2e/menus/watermark.cy.ts']
  },
  1173: {
    title: '图片预览弹窗支持上一张和下一张切换',
    specs: ['cypress/e2e/issues/issue-recent-api-regressions.cy.ts']
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
  608: {
    title: '英文与中文混合输入可正确计算字数',
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
  1176: {
    title: '长文本文档中继续输入保持性能基线',
    specs: ['cypress/e2e/issues/issue-837-large-document-performance.cy.ts']
  },
  1192: {
    title: '超长文本内容输入保持性能基线',
    specs: ['cypress/e2e/issues/issue-837-large-document-performance.cy.ts']
  },
  1312: {
    title: '三万字内容渲染不白屏',
    specs: ['cypress/e2e/issues/issue-837-large-document-performance.cy.ts']
  },
  877: {
    title: '分页符行为优化',
    specs: [
      'cypress/e2e/issues/issue-877-pagebreak-behavior.cy.ts',
      'cypress/e2e/menus/pagebreak.cy.ts'
    ]
  },
  290: {
    title: '单元格属性增加斜线',
    specs: ['cypress/e2e/issues/issue-290-table-cell-slash.cy.ts']
  },
  466: {
    title: '表格添加斜线保存以后再打开没有斜线了',
    specs: ['cypress/e2e/issues/issue-290-table-cell-slash.cy.ts']
  },
  858: {
    title: '表格虚线边框',
    specs: ['cypress/e2e/issues/issue-1053-table-cell-border.cy.ts']
  },
  1029: {
    title: '粘贴表格后保留虚线边框表现',
    specs: ['cypress/e2e/issues/issue-1053-table-cell-border.cy.ts']
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
  1211: {
    title: '跨单元格选择时选区高亮样式正确',
    specs: ['cypress/e2e/menus/table-selection-nonpaged.cy.ts']
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
  898: {
    title: '插入 AREA 元素遵循当前光标位置',
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
  }

}
