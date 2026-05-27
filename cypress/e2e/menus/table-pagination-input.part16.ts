import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type CursorClickPoint = ReturnType<typeof getCursorClickPoint>
type IndexedCursorClickPoint = CursorClickPoint & {
  index: number
}
type CursorBoxPoint = IndexedCursorClickPoint & {
  left: number
  right: number
  top: number
  bottom: number
}

function getTableCellText(
  editor: Editor,
  tableId: string,
  trIndex = 0,
  tdIndex = 0
) {
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table' && element.id === tableId)
  return (
    table?.trList?.[trIndex].tdList?.[tdIndex].value
      .map(element => element.value)
      .join('') ||
    ''
  )
}

function preparePagedTable(
  editor: Editor,
  seed: string,
  options?: {
    paperWidth?: number
    paperHeight?: number
  }
) {
  const { paperWidth = 240, paperHeight = 240 } = options || {}
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: '\u200B' }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(paperWidth, paperHeight)
  editor.command.executeSetPaperMargin([10, 10, 10, 10])
  editor.command.executeInsertTable(1, 1)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  const tableId = table.id!

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  if (seed.length) {
    editor.command.executeInsertElementList(
      seed.split('').map(value => ({
        value
      }))
    )
  }

  return tableId
}

function preparePagedTableWithPrefix(
  editor: Editor,
  prefix: string,
  seed: string,
  options?: {
    paperWidth?: number
    paperHeight?: number
  }
) {
  const { paperWidth = 240, paperHeight = 240 } = options || {}
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: '\u200B' }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(paperWidth, paperHeight)
  editor.command.executeSetPaperMargin([10, 10, 10, 10])
  editor.command.executeSetRange(0, 0)
  if (prefix.length) {
    editor.command.executeInsertElementList(
      prefix.split('').map(value => ({
        value
      }))
    )
  }
  editor.command.executeSetRange(prefix.length, prefix.length)
  editor.command.executeInsertTable(1, 1)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  const tableId = table.id!

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  if (seed.length) {
    editor.command.executeInsertElementList(
      seed.split('').map(value => ({
        value
      }))
    )
  }

  return tableId
}

function preparePagedTwoColTable(
  editor: Editor,
  leftSeed: string,
  rightSeed: string,
  options?: {
    paperWidth?: number
    paperHeight?: number
  }
) {
  const { paperWidth = 240, paperHeight = 240 } = options || {}
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: '\u200B' }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(paperWidth, paperHeight)
  editor.command.executeSetPaperMargin([10, 10, 10, 10])
  editor.command.executeInsertTable(1, 2)

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  const tableId = table.id!

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 1,
    endTdIndex: 1,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  if (rightSeed.length) {
    editor.command.executeInsertElementList(
      rightSeed.split('').map(value => ({
        value
      }))
    )
  }

  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  if (leftSeed.length) {
    editor.command.executeInsertElementList(
      leftSeed.split('').map(value => ({
        value
      }))
    )
  }

  return tableId
}

function getCursorClickPoint(editor: Editor) {
  const cursor = editor.command.getCursorPosition()
  expect(cursor).to.not.eq(null)
  const {
    pageNo,
    coordinate: { leftTop, rightTop }
  } = cursor!
  return {
    pageNo,
    x: Math.max(1, Math.floor((leftTop[0] + rightTop[0]) / 2)),
    y: Math.max(1, Math.floor(leftTop[1] + 1))
  }
}

function resolveTableAbsoluteCursorContext(
  editor: Editor,
  tableId: string,
  index: number
) {
  const draw = (editor as any).draw
  const accessor = draw.getTableLayoutSnapshotAccessor()
  const table = draw
    .getOriginalElementList()
    .find((element: any) => element.type === 'table' && element.id === tableId)

  expect(table).to.not.eq(undefined)

  for (let trIndex = 0; trIndex < table!.trList.length; trIndex++) {
    const tr = table!.trList[trIndex]
    for (let tdIndex = 0; tdIndex < tr.tdList.length; tdIndex++) {
      const td = tr.tdList[tdIndex]
      const slice = accessor.resolveCellSliceByAbsoluteIndex({
        tableId,
        trId: tr.id,
        tdId: td.id,
        absoluteIndex: index
      })
      if (!slice) continue
      const localIndex = index - slice.absoluteStart
      const position = slice.positionList[localIndex]
      expect(position).to.not.eq(undefined)
      return {
        table,
        tr,
        td,
        trIndex,
        tdIndex,
        slice,
        localIndex,
        position
      }
    }
  }

  return null
}

function getTableCursorClickPoint(
  editor: Editor,
  tableId: string,
  index: number
) {
  const context = resolveTableAbsoluteCursorContext(editor, tableId, index)
  expect(context).to.not.eq(null)
  const {
    slice,
    position
  } = context!
  return {
    pageNo: slice.pageNo,
    x: Math.max(
      1,
      Math.floor(
        Math.max(
          position.coordinate.leftTop[0] + 1,
          position.coordinate.rightTop[0]
        )
      )
    ),
    y: Math.max(1, Math.floor(position.coordinate.leftTop[1] + 1)),
    resolvedIndex: resolveTableClickBoundaryIndex(editor, {
      pageNo: slice.pageNo,
      x: Math.max(
        1,
        Math.floor(
          Math.max(
            position.coordinate.leftTop[0] + 1,
            position.coordinate.rightTop[0]
          )
        )
      ),
      y: Math.max(1, Math.floor(position.coordinate.leftTop[1] + 1))
    })
  }
}

function resolveTableClickBoundaryIndex(
  editor: Editor,
  payload: {
    pageNo: number
    x: number
    y: number
  }
) {
  const draw = (editor as any).draw
  const result = draw.getComponents().tableHitTestService.resolve({
    x: payload.x,
    y: payload.y,
    pageNo: payload.pageNo,
    pagePoint: {
      pageIndex: String(payload.pageNo),
      x: payload.x,
      y: payload.y
    },
    startPosition: null
  })
  return result.boundary?.absoluteIndex
}

function getTableCursorBoxPoint(
  editor: Editor,
  tableId: string,
  index: number
): CursorBoxPoint {
  const context = resolveTableAbsoluteCursorContext(editor, tableId, index)
  expect(context).to.not.eq(null)
  const {
    slice,
    position
  } = context!
  const {
    coordinate: { leftTop, rightTop, rightBottom }
  } = position
  return {
    index,
    pageNo: slice.pageNo,
    x: Math.max(1, Math.floor(Math.max(leftTop[0] + 1, rightTop[0]))),
    y: Math.max(1, Math.floor(leftTop[1] + 1)),
    left: leftTop[0],
    right: rightTop[0],
    top: leftTop[1],
    bottom: rightBottom[1]
  }
}

function readCanvasBoxStats(
  doc: Document,
  pageNo: number,
  point: Pick<CursorBoxPoint, 'left' | 'right' | 'top' | 'bottom'>
) {
  return readCompositedPageBoxStats(doc, pageNo, point)
}

function getTableCursorLeftEdgePoint(
  editor: Editor,
  tableId: string,
  index: number
) {
  const context = resolveTableAbsoluteCursorContext(editor, tableId, index)
  expect(context).to.not.eq(null)
  const { slice, position } = context!
  return {
    pageNo: slice.pageNo,
    x: Math.max(1, Math.floor(position.coordinate.leftTop[0] - 2)),
    y: Math.max(1, Math.floor(position.coordinate.leftTop[1] + 1))
  }
}

function findCrossPageTableSelectionPoints(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  let previousPoint: IndexedCursorClickPoint | null = null
  for (let index = 10; index < textLength - 10; index += 20) {
    const rawPoint = getTableCursorClickPoint(editor, tableId, index) as any
    const point = {
      ...rawPoint,
      index: rawPoint.resolvedIndex ?? index
    }
    if (
      previousPoint &&
      point.pageNo > previousPoint.pageNo &&
      previousPoint.pageNo >= 1
    ) {
      return {
        startPoint: previousPoint,
        endPoint: point,
        startIndex: previousPoint.index,
        endIndex: point.index
      }
    }
    previousPoint = point
  }
  return null
}

function findSamePageTableSelectionPoints(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  let previousPoint: IndexedCursorClickPoint | null = null
  for (let index = 10; index < textLength - 10; index += 20) {
    const rawPoint = getTableCursorClickPoint(editor, tableId, index) as any
    const point = {
      ...rawPoint,
      index: rawPoint.resolvedIndex ?? index
    }
    if (
      previousPoint &&
      point.pageNo === previousPoint.pageNo &&
      point.index > previousPoint.index
    ) {
      return {
        startPoint: previousPoint,
        endPoint: point
      }
    }
    previousPoint = point
  }
  return null
}

function findLaterPageSamePageTableSelectionPoints(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  let previousPoint: IndexedCursorClickPoint | null = null
  for (let index = 10; index < textLength - 10; index += 20) {
    const rawPoint = getTableCursorClickPoint(editor, tableId, index) as any
    const point = {
      ...rawPoint,
      index: rawPoint.resolvedIndex ?? index
    }
    if (
      previousPoint &&
      point.pageNo === previousPoint.pageNo &&
      point.pageNo > 0 &&
      point.index > previousPoint.index
    ) {
      return {
        startPoint: previousPoint,
        endPoint: point
      }
    }
    previousPoint = point
  }
  return null
}

function findPagedTableBoundaryPoints(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  let previousPoint: IndexedCursorClickPoint = {
    ...(getTableCursorClickPoint(editor, tableId, 0) as any),
    index:
      ((getTableCursorClickPoint(editor, tableId, 0) as any).resolvedIndex as
        | number
        | undefined) ?? 0
  }
  for (let index = 1; index < textLength; index++) {
    const rawPoint = getTableCursorClickPoint(editor, tableId, index) as any
    const point = {
      ...rawPoint,
      index: rawPoint.resolvedIndex ?? index
    }
    if (point.pageNo > previousPoint.pageNo) {
      return {
        prevPoint: previousPoint,
        nextPoint: point
      }
    }
    previousPoint = point
  }
  return null
}

function getLaterFragmentSliceInfo(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  const boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, textLength)
  if (!boundaryPoints) return null
  const boundaryContext = resolveTableAbsoluteCursorContext(
    editor,
    tableId,
    boundaryPoints.nextPoint.index
  )
  if (!boundaryContext) return null
  const { slice } = boundaryContext
  const firstVisibleOffset = slice.firstVisibleOffset ?? 0
  const firstVisibleAbsoluteIndex = Math.min(
    slice.absoluteEnd - 1,
    slice.absoluteStart + firstVisibleOffset
  )
  return {
    boundaryPoints,
    slice,
    firstVisibleAbsoluteIndex
  }
}


function setPagedTableCursor(editor: Editor, tableId: string, index: number) {
  const context = resolveTableAbsoluteCursorContext(editor, tableId, index)
  expect(context).to.not.eq(null)
  const draw = (editor as any).draw
  const canvasEvent = draw.getComponents().canvasEvent
  const pageNo = context!.slice.pageNo
  const fragmentInfo = getLaterFragmentSliceInfo(
    editor,
    tableId,
    context!.slice.absoluteEnd
  )
  const isLaterFragmentStart =
    fragmentInfo &&
    context!.slice.fragmentCellKey === fragmentInfo.slice.fragmentCellKey &&
    index === fragmentInfo.firstVisibleAbsoluteIndex
  const x = isLaterFragmentStart
    ? Math.max(1, Math.floor(context!.position.coordinate.leftTop[0] - 2))
    : Math.max(
        1,
        Math.floor(
          Math.max(
            context!.position.coordinate.leftTop[0] + 1,
            context!.position.coordinate.rightTop[0]
          )
        )
      )
  const y = Math.max(1, Math.floor(context!.position.coordinate.leftTop[1] + 1))
  const canvas = draw.getPage(pageNo)
  const rect = canvas.getBoundingClientRect()
  const evt = {
    target: canvas,
    currentTarget: canvas,
    offsetX: x,
    offsetY: y,
    clientX: rect.left + x,
    clientY: rect.top + y,
    button: 0,
    buttons: 1,
    detail: 1,
    preventDefault() {
      return undefined
    },
    stopPropagation() {
      return undefined
    },
    composedPath() {
      return [canvas]
    }
  } as any
  canvasEvent.mousedown(evt)
  canvasEvent.mouseup(evt)
  canvasEvent.click({
    ...evt,
    detail: 1
  })
}

function setPagedTableCursorAndReadState(
  editor: Editor,
  tableId: string,
  index: number
) {
  setPagedTableCursor(editor, tableId, index)
  return {
    range: editor.command.getRange(),
    cursor: editor.command.getCursorPosition()
  }
}

function getPageGapClientPoint(
  doc: Document,
  pageNo: number,
  xOffset: number
) {
  const startPage = doc.querySelector(`canvas[data-index="${pageNo}"]`)
  const endPage = doc.querySelector(`canvas[data-index="${pageNo + 1}"]`)
  expect(startPage).to.not.eq(null)
  expect(endPage).to.not.eq(null)
  const startRect = (startPage as HTMLCanvasElement).getBoundingClientRect()
  const endRect = (endPage as HTMLCanvasElement).getBoundingClientRect()
  return {
    clientX: Math.floor(startRect.left + xOffset),
    clientY: Math.floor((startRect.bottom + endRect.top) / 2)
  }
}

function getPagedFragmentStartClickPoint(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  const fragmentInfo = getLaterFragmentSliceInfo(editor, tableId, textLength)
  if (!fragmentInfo) return null
  const startPoint = getTableCursorLeftEdgePoint(
    editor,
    tableId,
    fragmentInfo.firstVisibleAbsoluteIndex
  )
  return {
    pageNo: startPoint.pageNo,
    x: startPoint.x,
    y: startPoint.y,
    index: fragmentInfo.firstVisibleAbsoluteIndex
  }
}

function getPagedFragmentFirstVisibleCharClickPoint(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  const fragmentInfo = getLaterFragmentSliceInfo(editor, tableId, textLength)
  if (!fragmentInfo) return null
  const context = resolveTableAbsoluteCursorContext(
    editor,
    tableId,
    fragmentInfo.firstVisibleAbsoluteIndex
  )
  expect(context).to.not.eq(null)
  const { slice, position } = context!
  return {
    pageNo: slice.pageNo,
    x: Math.max(
      1,
      Math.floor(
        Math.max(
          position.coordinate.leftTop[0] + 1,
          position.coordinate.rightTop[0]
        )
      )
    ),
    y: Math.max(1, Math.floor(position.coordinate.leftTop[1] + 1)),
    index: fragmentInfo.firstVisibleAbsoluteIndex
  }
}

function getLaterFragmentInnerLineStartClickPoint(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  const fragmentInfo = getLaterFragmentSliceInfo(editor, tableId, textLength)
  if (!fragmentInfo) return null
  const { slice } = fragmentInfo
  const firstVisibleOffset = slice.firstVisibleOffset ?? 0
  const nextRowBand = slice.rowBands.find(
    band => band.startOffset > firstVisibleOffset
  )
  if (nextRowBand) {
    const index = slice.absoluteStart + nextRowBand.startOffset
    const point = getTableCursorLeftEdgePoint(editor, tableId, index)
    return {
      pageNo: point.pageNo,
      x: point.x,
      y: point.y,
      index
    }
  }

  return null
}

function getLaterFragmentFirstRowClickPoints(
  editor: Editor,
  tableId: string,
  textLength: number,
  sampleCount = 5
) {
  const fragmentInfo = getLaterFragmentSliceInfo(editor, tableId, textLength)
  if (!fragmentInfo) return []
  const { slice } = fragmentInfo
  const firstVisibleOffset = slice.firstVisibleOffset ?? 0
  const firstRowBand = slice.rowBands.find(
    band =>
      firstVisibleOffset >= band.startOffset && firstVisibleOffset <= band.endOffset
  )
  if (!firstRowBand) return []

  const rowIndices: number[] = []
  for (
    let offset = Math.max(firstVisibleOffset, firstRowBand.startOffset);
    offset <= firstRowBand.endOffset;
    offset++
  ) {
    rowIndices.push(slice.absoluteStart + offset)
  }

  if (!rowIndices.length) {
    return []
  }
  const step = Math.max(1, Math.floor(rowIndices.length / sampleCount))
  const sampledIndices = rowIndices.filter(
    (_, index) => index === 0 || index === rowIndices.length - 1 || index % step === 0
  )
  const uniqueIndices = [...new Set(sampledIndices)].slice(0, sampleCount)

  return uniqueIndices.map(index => {
    const point = getTableCursorClickPoint(editor, tableId, index) as any
    return {
      pageNo: point.pageNo,
      x: point.x,
      y: point.y,
      index: point.resolvedIndex ?? index
    }
  })
}

function preparePagedText(
  editor: Editor,
  seed: string,
  options?: {
    paperWidth?: number
    paperHeight?: number
  }
) {
  const { paperWidth = 240, paperHeight = 240 } = options || {}
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: '\u200B' }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executePaperSize(paperWidth, paperHeight)
  editor.command.executeSetPaperMargin([10, 10, 10, 10])
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    seed.split('').map(value => ({
      value
    }))
  )
}

describe('menu-table pagination input', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })
  it('does not eat the previous character when dragging again from the same character box in a later paged fragment', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let caretPoint:
      | {
          pageNo: number
          x: number
          y: number
          index: number
        }
      | null = null
    let endPoint:
      | {
          pageNo: number
          x: number
          y: number
          index: number
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      const innerLineStartPoint = getLaterFragmentInnerLineStartClickPoint(
        editor,
        tableId,
        seed.length
      )
      expect(innerLineStartPoint).to.not.eq(null)
      caretPoint = innerLineStartPoint
        ? {
            ...getTableCursorClickPoint(
              editor,
              tableId,
              innerLineStartPoint.index
            ),
            index: innerLineStartPoint.index
          }
        : null
      endPoint = caretPoint
        ? {
            ...getTableCursorClickPoint(
              editor,
              tableId,
              Math.min(seed.length - 1, caretPoint.index + 8)
            ),
            index: Math.min(seed.length - 1, caretPoint.index + 8)
          }
        : null
    })

    cy.wrap(null).then(() => {
      expect(caretPoint).to.not.eq(null)
      expect(endPoint).to.not.eq(null)
      cy.wrap(caretPoint!).as('pagedSameCharCaretPoint')
      cy.wrap(endPoint!).as('pagedSameCharEndPoint')
    })

    cy.get('@pagedSameCharCaretPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      cy.wrap({
        anchorCursorIndex: cursor!.index
      }).as('pagedSameCharAnchor')
    })

    cy.get('@pagedSameCharCaretPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get('@pagedSameCharEndPoint').then(endPayload => {
        const end = endPayload as IndexedCursorClickPoint
        cy.get(`canvas[data-index="${point.pageNo}"]`)
          .scrollIntoView()
          .trigger('mousedown', point.x, point.y, {
            button: 0,
            force: true
          })
          .trigger('mousemove', end.x, end.y, {
            button: 0,
            force: true
          })
          .trigger('mouseup', end.x, end.y, {
            button: 0,
            force: true
          })
      })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@pagedSameCharAnchor').then(() => {
        const range = editor.command.getRange()
        const rangeText = editor.command.getRangeText()
        const tableText = getTableCellText(editor, tableId)
        expect(rangeText.length).to.be.greaterThan(0)
        expect(rangeText[0]).to.eq(tableText[range.startIndex])
      })
    })
  })
})