import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

const ZERO = '\u200B'

/** 创建跨页表格文档，用于覆盖表格输入不应进入主文档页级 chunk。 */
function preparePagedTableDocument(editor: Editor) {
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: ZERO }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(360, 420)
  editor.command.executeSetPaperMargin([32, 32, 32, 32])

  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertTable(1, 1)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE)
  if (!table?.id) {
    throw new Error('table not found')
  }
  const tableIndex = (editor as any).draw
    .getOriginalElementList()
    .findIndex(
      (element: any) =>
        element.type === ElementType.TABLE && element.id === table.id
    )
  if (tableIndex < 0) {
    throw new Error('table index not found')
  }

  const seed =
    '否认14天内去过以下场所：水产、肉类批发市场，农贸市场，集市，大型超市，夜市；'.repeat(14)
  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    seed.split('').map(value => ({
      value
    }))
  )

  return {
    tableId: table.id,
    tableIndex,
    seed
  }
}

/** 创建超长单元格文档并通过首次完整布局形成 20+ 页表格。 */
function prepareLargePagedTableDocument(editor: Editor) {
  editor.command.executeSetValue(
    {
      header: [],
      main: [
        {
          type: ElementType.TABLE,
          value: '',
          colgroup: [{ width: 240 }],
          trList: [
            {
              height: 32,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: '0123456789'.repeat(2600).split('').map(value => ({
                    value
                  }))
                }
              ]
            }
          ]
        }
      ],
      footer: []
    },
    {
      isSetCursor: false
    } as any
  )
  editor.command.executePaperSize(360, 420)
  editor.command.executeSetPaperMargin([32, 32, 32, 32])
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE)
  if (!table?.id) {
    throw new Error('large table not found')
  }
  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(
    table.trList![0].tdList[0].value.length - 1,
    table.trList![0].tdList[0].value.length - 1,
    table.id,
    0,
    0,
    0,
    0
  )
  return table.id
}

/** 创建表格前有大量正文的文档，用于验证表格必须整体自然下移。 */
function preparePrefixedTableDocument(editor: Editor) {
  const prefixText = '上方正文内容用于占据页面空间。'.repeat(30)
  editor.command.executeSetValue(
    {
      header: [],
      main: [
        ...prefixText.split('').map(value => ({ value })),
        {
          type: ElementType.TABLE,
          value: '',
          colgroup: [{ width: 240 }],
          trList: [
            {
              height: 32,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: 'EOF'.split('').map(value => ({ value }))
                }
              ]
            },
            {
              height: 32,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: []
                }
              ]
            }
          ]
        }
      ],
      footer: []
    },
    {
      isSetCursor: false
    } as any
  )
  editor.command.executePaperSize(360, 420)
  editor.command.executeSetPaperMargin([32, 32, 32, 32])
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE)
  if (!table?.id) {
    throw new Error('prefixed table not found')
  }
  editor.command.executeSetPositionContext({
    startIndex: prefixText.length,
    endIndex: prefixText.length,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(1, 1, table.id, 0, 0, 0, 0)
  return table.id
}

/** 创建表格紧跟正文的文档，用于验证主文档页 chunk 推动表格下移后旧页不残留边框。 */
function prepareTextDrivenTableMoveDocument(editor: Editor) {
  const prefixText = '上方正文推动表格分页。'.repeat(34)
  editor.command.executeSetValue(
    {
      header: [],
      main: [
        ...prefixText.split('').map(value => ({ value })),
        {
          type: ElementType.TABLE,
          value: '',
          colgroup: [{ width: 240 }],
          trList: [
            {
              height: 32,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: '表格内容'.split('').map(value => ({ value }))
                }
              ]
            }
          ]
        }
      ],
      footer: []
    },
    {
      isSetCursor: false
    } as any
  )
  editor.command.executePaperSize(360, 420)
  editor.command.executeSetPaperMargin([32, 32, 32, 32])
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE)
  if (!table?.id) {
    throw new Error('text driven table not found')
  }
  editor.command.executeSetPositionContext({
    startIndex: prefixText.length - 1,
    endIndex: prefixText.length - 1
  } as any)
  editor.command.executeSetRange(prefixText.length - 1, prefixText.length - 1)
  return {
    tableId: table.id,
    prefixLength: prefixText.length
  }
}

/** 创建表格位于第三页且页顶保留少量正文的文档，用于覆盖表格被推到第四页后的旧页残留。 */
function prepareThirdPageTableMoveDocument(editor: Editor) {
  const prefixText = '正文填充到第三页并在表格上方保留少量内容。'.repeat(16)
  editor.command.executeSetValue(
    {
      header: [],
      main: [
        ...prefixText.split('').map(value => ({ value })),
        {
          type: ElementType.TABLE,
          value: '',
          colgroup: [{ width: 240 }],
          trList: [
            {
              height: 32,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: '第三页表格'.split('').map(value => ({ value }))
                }
              ]
            }
          ]
        }
      ],
      footer: []
    },
    {
      isSetCursor: false
    } as any
  )
  editor.command.executePaperSize(360, 420)
  editor.command.executeSetPaperMargin([32, 32, 32, 32])
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE)
  if (!table?.id) {
    throw new Error('third page table not found')
  }
  editor.command.executeSetPositionContext({
    startIndex: prefixText.length - 1,
    endIndex: prefixText.length - 1
  } as any)
  editor.command.executeSetRange(prefixText.length - 1, prefixText.length - 1)
  return {
    tableId: table.id,
    prefixLength: prefixText.length
  }
}

/** 读取单元格完整边框采样区域，避免只检查顶部线漏掉残留竖线或底线。 */
function getFirstTableCellFullBorderBox(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const snapshot = draw.getTableLayoutSnapshot()
  const firstSlice = snapshot.sliceList.find(
    (slice: any) => slice.logicalTableId === tableId
  )
  if (!firstSlice) {
    return null
  }
  const bounds = snapshot.cellBoundsByFragmentTableId
    .get(firstSlice.fragmentTableId)
    ?.find(
      (item: any) =>
        item.fragmentTrId === firstSlice.fragmentTrId &&
        item.fragmentTdId === firstSlice.fragmentTdId
    )
  if (!bounds) {
    return null
  }
  return {
    pageNo: bounds.pageNo,
    left: bounds.x - 2,
    right: bounds.x + bounds.width + 2,
    top: bounds.y - 2,
    bottom: bounds.y + bounds.height + 2
  }
}

/** 读取表格第一个单元格边界，用于断言表格不能覆盖同页前置正文。 */
function getFirstTableCellBounds(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const snapshot = draw.getTableLayoutSnapshot()
  const firstSlice = snapshot.sliceList.find(
    (slice: any) => slice.logicalTableId === tableId
  )
  if (!firstSlice) {
    return null
  }
  return (
    snapshot.cellBoundsByFragmentTableId
      .get(firstSlice.fragmentTableId)
      ?.find(
        (item: any) =>
          item.fragmentTrId === firstSlice.fragmentTrId &&
          item.fragmentTdId === firstSlice.fragmentTdId
      ) || null
  )
}

/** 读取指定页非表格正文的最大底边，用于捕捉表格跳到页顶覆盖正文。 */
function getNonTableTextBottomOnPage(editor: Editor, pageNo: number) {
  const draw = (editor as any).draw
  const positionList = draw
    .getCoordinate()
    .getMainPositionListByPage(pageNo)
    .filter((position: any) => position.element?.type !== ElementType.TABLE)
  if (!positionList.length) {
    return 0
  }
  return Math.max(
    ...positionList.map(
      (position: any) => position.coordinate.leftBottom[1] || 0
    )
  )
}

/** 统计逻辑表在每个页上的 fragment 行数量，用于发现旧页和新页重复保留同一张表。 */
function getLogicalTableRowCountByPage(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const countByPage = new Map<number, number>()
  draw.getPageRowList().forEach((pageRows: any[], pageNo: number) => {
    pageRows.forEach(row => {
      const rowTable = row.tableFragment || row.elementList?.find(
        (element: any) => element.type === ElementType.TABLE
      )
      const logicalTableId =
        row.tableFragment?.logicalTableId ||
        rowTable?.logicalTableId ||
        rowTable?.pagingId ||
        rowTable?.id
      if (logicalTableId === tableId) {
        countByPage.set(pageNo, (countByPage.get(pageNo) || 0) + 1)
      }
    })
  })
  return countByPage
}

/** 读取单元格四条边的窄带采样区域，避开旧位置内后来出现的正文文本。 */
function getFirstTableCellBorderBandList(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const snapshot = draw.getTableLayoutSnapshot()
  const firstSlice = snapshot.sliceList.find(
    (slice: any) => slice.logicalTableId === tableId
  )
  if (!firstSlice) {
    return []
  }
  const bounds = snapshot.cellBoundsByFragmentTableId
    .get(firstSlice.fragmentTableId)
    ?.find(
      (item: any) =>
        item.fragmentTrId === firstSlice.fragmentTrId &&
        item.fragmentTdId === firstSlice.fragmentTdId
    )
  if (!bounds) {
    return []
  }
  return [
    {
      pageNo: bounds.pageNo,
      left: bounds.x,
      right: bounds.x + bounds.width,
      top: bounds.y - 1,
      bottom: bounds.y + 2
    },
    {
      pageNo: bounds.pageNo,
      left: bounds.x,
      right: bounds.x + bounds.width,
      top: bounds.y + bounds.height - 2,
      bottom: bounds.y + bounds.height + 1
    },
    {
      pageNo: bounds.pageNo,
      left: bounds.x - 1,
      right: bounds.x + 2,
      top: bounds.y,
      bottom: bounds.y + bounds.height
    },
    {
      pageNo: bounds.pageNo,
      left: bounds.x + bounds.width - 2,
      right: bounds.x + bounds.width + 1,
      top: bounds.y,
      bottom: bounds.y + bounds.height
    }
  ]
}

/** 为像素断言显式挂载并渲染目标页，避免虚拟页未进入视口时读不到 canvas。 */
function renderPageForPixelSampling(editor: Editor, pageNo: number) {
  const draw = (editor as any).draw
  draw.enqueueExtraVisibleRenderPages([pageNo])
  draw.getServices().renderPipeline.render({
    isLazy: false,
    pageRenderScope: 'visible'
  })
}

/** 统计合成画布区域内的深色像素，直接捕捉旧表格边框残影。 */
function countDarkPixels(doc: Document, pageNo: number, box: {
  left: number
  right: number
  top: number
  bottom: number
}) {
  const baseCanvas = doc.querySelector(
    `canvas[data-index="${pageNo}"]`
  ) as HTMLCanvasElement | null
  if (!baseCanvas) {
    throw new Error(`base canvas ${pageNo} not found`)
  }
  const overlayCanvas = doc.querySelector(
    `canvas[data-overlay-index="${pageNo}"]`
  ) as HTMLCanvasElement | null
  const canvas = doc.createElement('canvas')
  canvas.width = baseCanvas.width
  canvas.height = baseCanvas.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)
  if (overlayCanvas) {
    ctx.drawImage(overlayCanvas, 0, 0)
  }
  const scaleX = canvas.width / baseCanvas.clientWidth
  const scaleY = canvas.height / baseCanvas.clientHeight
  const x = Math.max(0, Math.floor(box.left * scaleX))
  const y = Math.max(0, Math.floor(box.top * scaleY))
  const width = Math.max(1, Math.ceil((box.right - box.left) * scaleX))
  const height = Math.max(1, Math.ceil((box.bottom - box.top) * scaleY))
  const data = ctx.getImageData(x, y, width, height).data
  let darkPixels = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a > 0 && r < 170 && g < 170 && b < 170) {
      darkPixels++
    }
  }
  return darkPixels
}

/** 统计多个边框窄带里的深色像素总数。 */
function countDarkPixelsInBandList(
  doc: Document,
  bandList: Array<{
    pageNo: number
    left: number
    right: number
    top: number
    bottom: number
  }>
) {
  return bandList.reduce(
    (count, band) => count + countDarkPixels(doc, band.pageNo, band),
    0
  )
}

/** 统计边框采样窄带中连续线段长度，避免把新正文文字误判成表格线残留。 */
function getMaxDarkRunInBandList(
  doc: Document,
  bandList: Array<{
    pageNo: number
    left: number
    right: number
    top: number
    bottom: number
  }>
) {
  return Math.max(...bandList.map(band => getMaxDarkRunInBand(doc, band)))
}

/** 统计单个窄带中的最长连续深色像素线段。 */
function getMaxDarkRunInBand(
  doc: Document,
  band: {
    pageNo: number
    left: number
    right: number
    top: number
    bottom: number
  }
) {
  const baseCanvas = doc.querySelector(
    `canvas[data-index="${band.pageNo}"]`
  ) as HTMLCanvasElement | null
  if (!baseCanvas) {
    throw new Error(`base canvas ${band.pageNo} not found`)
  }
  const canvas = doc.createElement('canvas')
  canvas.width = baseCanvas.width
  canvas.height = baseCanvas.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)
  const scaleX = canvas.width / baseCanvas.clientWidth
  const scaleY = canvas.height / baseCanvas.clientHeight
  const x = Math.max(0, Math.floor(band.left * scaleX))
  const y = Math.max(0, Math.floor(band.top * scaleY))
  const width = Math.max(1, Math.ceil((band.right - band.left) * scaleX))
  const height = Math.max(1, Math.ceil((band.bottom - band.top) * scaleY))
  const data = ctx.getImageData(x, y, width, height).data
  let maxRun = 0
  for (let row = 0; row < height; row++) {
    let currentRun = 0
    for (let col = 0; col < width; col++) {
      const offset = (row * width + col) * 4
      const isDark =
        data[offset + 3] > 0 &&
        data[offset] < 170 &&
        data[offset + 1] < 170 &&
        data[offset + 2] < 170
      currentRun = isDark ? currentRun + 1 : 0
      maxRun = Math.max(maxRun, currentRun)
    }
  }
  for (let col = 0; col < width; col++) {
    let currentRun = 0
    for (let row = 0; row < height; row++) {
      const offset = (row * width + col) * 4
      const isDark =
        data[offset + 3] > 0 &&
        data[offset] < 170 &&
        data[offset + 1] < 170 &&
        data[offset + 2] < 170
      currentRun = isDark ? currentRun + 1 : 0
      maxRun = Math.max(maxRun, currentRun)
    }
  }
  return maxRun
}

/** 统计指定页旧区域内是否仍存在表格 fragment 行，用于区分布局残留和画布残留。 */
function countTableRowsIntersectingBox(
  editor: Editor,
  box: {
    pageNo: number
    left: number
    right: number
    top: number
    bottom: number
  }
) {
  const draw = (editor as any).draw
  const pageRows = draw.getPageRowList()[box.pageNo] || []
  return pageRows.filter((row: any) => {
    const hasTable =
      Boolean(row.tableFragment) ||
      row.elementList?.some((element: any) => element.type === ElementType.TABLE)
    if (!hasTable) {
      return false
    }
    const rowTop = row.coordinate?.leftTop?.[1] ?? row.y ?? 0
    const rowBottom = rowTop + row.height + (row.offsetY || 0)
    return rowBottom >= box.top && rowTop <= box.bottom
  }).length
}

/** 读取表格单元格纯文本，验证输入仍保留在 td.value 内。 */
function getTableCellText(editor: Editor, tableId: string) {
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE && element.id === tableId)
  return (
    table?.trList?.[0].tdList?.[0].value
      .map(element => element.value)
      .join('') || ''
  )
}

/** 读取指定表格第一个逻辑单元格的 slice 列表。 */
function getFirstCellSliceList(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const snapshot = draw.getTableLayoutSnapshot()
  return snapshot.sliceList.filter(
    (slice: any) =>
      slice.logicalTableId === tableId &&
      slice.logicalTrIndex === 0 &&
      slice.logicalTdIndex === 0
  )
}

/** 统计单元格 fragment 中越过边界的字符位置数量。 */
function getCellPositionOverflowStats(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const snapshot = draw.getTableLayoutSnapshot()
  const sliceList = getFirstCellSliceList(editor, tableId)
  let overflowCount = 0
  let checkedPositionCount = 0

  sliceList.forEach((slice: any) => {
    const bounds = snapshot.cellBoundsByFragmentTableId
      .get(slice.fragmentTableId)
      ?.find(
        (item: any) =>
          item.fragmentTrId === slice.fragmentTrId &&
          item.fragmentTdId === slice.fragmentTdId
      )
    if (!bounds) {
      return
    }
    const bottom = bounds.y + bounds.height + 1
    ;(slice.positionList || []).forEach((position: any) => {
      checkedPositionCount++
      if (position.coordinate.leftBottom[1] > bottom) {
        overflowCount++
      }
    })
  })

  return {
    checkedPositionCount,
    overflowCount
  }
}

/** 统计表格 fragment 是否侵入页码 / 页脚绘制区域。 */
function getCellBoundsFooterOverlapStats(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const options = draw.getOptions()
  const snapshot = draw.getTableLayoutSnapshot()
  const sliceList = getFirstCellSliceList(editor, tableId)
  let safeBottom = draw.getHeight() - draw.getMargins()[2] - draw.getFooter().getExtraHeight()
  if (!options.footer.disabled && draw.getFooter().getHeight() > 0) {
    safeBottom = Math.min(
      safeBottom,
      draw.getHeight() - draw.getFooter().getFooterBottom() - draw.getFooter().getHeight()
    )
  }
  if (!options.pageNumber.disabled) {
    safeBottom = Math.min(
      safeBottom,
      draw.getHeight() -
        draw.getServices().metricsService.getPageNumberBottom() -
        options.pageNumber.size * options.scale -
        6 * options.scale
    )
  }
  let checkedBoundsCount = 0
  let overlapCount = 0

  sliceList.forEach((slice: any) => {
    const bounds = snapshot.cellBoundsByFragmentTableId
      .get(slice.fragmentTableId)
      ?.find(
        (item: any) =>
          item.fragmentTrId === slice.fragmentTrId &&
          item.fragmentTdId === slice.fragmentTdId
      )
    if (!bounds) {
      return
    }
    checkedBoundsCount++
    if (bounds.y + bounds.height > safeBottom + 1) {
      overlapCount++
    }
  })

  return {
    checkedBoundsCount,
    overlapCount
  }
}

/** 统计布局结果中的表格行，确认渲染层没有被单元格文本扁平化。 */
function getLayoutTableStats(editor: Editor, seed: string) {
  const draw = (editor as any).draw
  const layoutElementList = draw.getLayoutMainElementList()
  const pageRowList = draw.getPageRowList()
  const tableElementCount = layoutElementList.filter(
    (element: any) => element.type === ElementType.TABLE
  ).length
  const tableRowCount = pageRowList
    .flat()
    .filter((row: any) =>
      row.elementList.some((element: any) => element.type === ElementType.TABLE)
    ).length
  const flatMainText = layoutElementList
    .map((element: { value?: string }) => element.value || '')
    .join('')

  return {
    tableElementCount,
    tableRowCount,
    isCellTextFlattenedToMain: flatMainText.includes(seed.slice(0, 40))
  }
}

/** 断言表格输入由局部重分页接管，或明确回退到完整表格 layout。 */
function expectTableRelayoutOrFullLayout(stats: any, label: string) {
  if (stats.tableLocalRelayout.patchSuccessCount > 0) {
    expect(stats.layout.computeCount, `${label} 局部重分页接管后不应触发整篇 layout`).to.eq(0)
    return
  }
  expect(stats.layout.computeCount, `${label} 未局部接管时必须回退完整 layout`).to.be.greaterThan(0)
}

describe('表格输入原分页正确性基线', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })
  it('keeps paged table layout after typing inside a table cell', () => {
    const appendText = 'XYZ'
    let tableId = ''
    let seed = ''

    cy.getEditor().then((editor: Editor) => {
      const prepared = preparePagedTableDocument(editor)
      tableId = prepared.tableId
      seed = prepared.seed
      editor.resetRenderBackendStats()
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text())).to.be.greaterThan(1)
    })

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeInsertElementList(
        appendText.split('').map(value => ({
          value
        })),
        {
          isSubmitHistory: false
        } as any
      )
    })

    cy.get('canvas[data-index="0"]').click(40, 40, { force: true })

    cy.getEditor().then((editor: Editor) => {
      const stats = editor.getRenderBackendStats()
      const layoutTableStats = getLayoutTableStats(editor, seed)

      expect(getTableCellText(editor, tableId)).to.eq(seed + appendText)
      expectTableRelayoutOrFullLayout(stats, '带前缀行表格输入')
      expect(layoutTableStats.tableElementCount, '布局表格元素数量').to.be.greaterThan(0)
      expect(layoutTableStats.tableRowCount, '布局表格行数量').to.be.greaterThan(0)
      expect(
        layoutTableStats.isCellTextFlattenedToMain,
        '单元格文本不能被扁平化写入主文档'
      ).to.eq(false)
      expect(stats.tableCellChunk.chunkCount, '表格子 chunk 数量').to.be.greaterThan(0)
      expect(
        stats.tableCellChunk.lastLookupHit,
        '表格输入必须命中 td 子 chunk'
      ).to.eq(true)
      expect(
        stats.tableCellChunk.dirtyChunkCount,
        '表格输入仍需标记 td 子 chunk，供后续局部重分页复用'
      ).to.be.greaterThan(0)
      expect(stats.chunkLayout.patchSuccessCount, '表格输入不走主文档 chunk patch').to.eq(0)
      expect(getCellBoundsFooterOverlapStats(editor, tableId).overlapCount, '带前缀行表格不能压到页码').to.eq(0)
    })
  })

  it('keeps large table cell typing on the original pagination baseline after 20 pages', () => {
    const appendText = 'ABCDEFGHIJ'
    let tableId = ''

    cy.getEditor().then((editor: Editor) => {
      tableId = prepareLargePagedTableDocument(editor)
      editor.resetRenderBackendStats()
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text()), '单元格分页数量').to.be.greaterThan(20)
    })

    cy.getEditor().then((editor: Editor) => {
      const startTime = performance.now()
      editor.command.executeInsertElementList(
        appendText.split('').map(value => ({
          value
        })),
        {
          isSubmitHistory: false
        } as any
      )
      const duration = performance.now() - startTime
      const stats = editor.getRenderBackendStats()

      expect(getTableCellText(editor, tableId)).to.include(appendText)
      expect(duration, '20+ 页单元格输入耗时应可被记录').to.be.greaterThan(0)
      expect(
        stats.tableLocalRelayout.patchSuccessCount,
        `20+ 页单元格输入应优先走表格级局部重分页，统计：${JSON.stringify(stats.tableLocalRelayout)}`
      ).to.be.greaterThan(0)
      expect(stats.layout.computeCount, '20+ 页尾部大表输入不应再触发整篇 layout').to.eq(0)
      expect(stats.chunkLayout.patchSuccessCount, '20+ 页单元格输入不走主文档 chunk').to.eq(0)
    })
  })

  it('keeps table cell fragment text inside its page chunk after overflow typing', () => {
    const appendText = '边界溢出校验'.repeat(24)
    let tableId = ''
    let firstSliceEndIndex = 0

    cy.getEditor().then((editor: Editor) => {
      tableId = prepareLargePagedTableDocument(editor)
      const firstSlice = getFirstCellSliceList(editor, tableId)[0]
      firstSliceEndIndex = firstSlice.absoluteEnd - 1
      editor.command.executeSetRange(
        firstSliceEndIndex,
        firstSliceEndIndex,
        tableId,
        0,
        0,
        0,
        0
      )
      editor.resetRenderBackendStats()
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text()), '单元格分页数量').to.be.greaterThan(20)
    })

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeInsertElementList(
        appendText.split('').map(value => ({
          value
        })),
        {
          isSubmitHistory: false
        } as any
      )

      const stats = editor.getRenderBackendStats()
      const overflowStats = getCellPositionOverflowStats(editor, tableId)
      const footerOverlapStats = getCellBoundsFooterOverlapStats(editor, tableId)

      expect(getTableCellText(editor, tableId)).to.include(appendText)
      expectTableRelayoutOrFullLayout(stats, '边界输入')
      expect(overflowStats.checkedPositionCount, '检查到的单元格字符位置').to.be.greaterThan(0)
      expect(overflowStats.overflowCount, '单元格字符不能越过 fragment 边界').to.eq(0)
      expect(footerOverlapStats.checkedBoundsCount, '检查到的单元格边界').to.be.greaterThan(0)
      expect(footerOverlapStats.overlapCount, '表格 fragment 不能侵入页码或页脚').to.eq(0)
    })
  })

  it('pulls following table cell fragment content after local backspace', () => {
    let tableId = ''
    let firstSliceEndIndex = 0
    let oldTextLength = 0

    cy.getEditor().then((editor: Editor) => {
      tableId = prepareLargePagedTableDocument(editor)
      const firstSlice = getFirstCellSliceList(editor, tableId)[0]
      firstSliceEndIndex = firstSlice.absoluteEnd - 2
      oldTextLength = getTableCellText(editor, tableId).length
      editor.command.executeSetRange(
        firstSliceEndIndex,
        firstSliceEndIndex,
        tableId,
        0,
        0,
        0,
        0
      )
      editor.resetRenderBackendStats()
    })

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeBackspace()
    })

    cy.wait(20)

    cy.getEditor().then((editor: Editor) => {
      const stats = editor.getRenderBackendStats()
      const overflowStats = getCellPositionOverflowStats(editor, tableId)

      expect(getTableCellText(editor, tableId).length, '单元格退格后逻辑文本减少').to.eq(
        oldTextLength - 1
      )
      expectTableRelayoutOrFullLayout(stats, '表格退格')
      expect(stats.chunkLayout.patchSuccessCount, '表格退格不走主文档 chunk').to.eq(0)
      expect(overflowStats.checkedPositionCount, '退格后检查到的单元格字符位置').to.be.greaterThan(0)
      expect(overflowStats.overflowCount, '退格后单元格字符不能越过 fragment 边界').to.eq(0)
    })
  })
})