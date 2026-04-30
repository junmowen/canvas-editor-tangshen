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

  it('still appends text after the table spans multiple pages', () => {
    const seed = 'M'.repeat(2000)
    const appendText = 'XYZ'
    let tableId = ''

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text())).to.be.greaterThan(1)
    })

    cy.get('.ce-inputarea').type(appendText)

    cy.getEditor().then((editor: Editor) => {
      expect(getTableCellText(editor, tableId)).to.eq(seed + appendText)
    })
  })

  it('still supports composition input after the table spans multiple pages', () => {
    const seed = 'M'.repeat(2000)
    const finalText = '拼音'
    let tableId = ''

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text())).to.be.greaterThan(1)
    })

    cy.window().then(win => {
      const input = win.document.querySelector('.ce-inputarea') as HTMLTextAreaElement
      input.focus()
      input.dispatchEvent(new win.CompositionEvent('compositionstart', { bubbles: true }))
      input.dispatchEvent(
        new win.InputEvent('input', {
          bubbles: true,
          data: '拼'
        })
      )
      input.dispatchEvent(
        new win.InputEvent('input', {
          bubbles: true,
          data: finalText
        })
      )
      input.dispatchEvent(
        new win.CompositionEvent('compositionend', {
          bubbles: true,
          data: finalText
        })
      )
    })

    cy.getEditor().then((editor: Editor) => {
      expect(getTableCellText(editor, tableId)).to.eq(seed + finalText)
    })
  })

  it('keeps the caret on the clicked later page during typing after the table spans more than two pages', () => {
    const seed = 'M'.repeat(2000)
    const appendText = 'XYZ'
    let tableId = ''

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
    })

    cy.getEditor().then((editor: Editor) => {
      expect(tableId).to.not.eq('')
      expect(getTableCellText(editor, tableId)).to.eq(seed)
    })

    cy.get('canvas[data-index="2"]').then($canvas => {
      cy.getEditor().then((editor: Editor) => {
        let hitPoint: { x: number; y: number } | null = null
        for (let y = 20; y <= 180 && !hitPoint; y += 20) {
          for (let x = 20; x <= 180; x += 20) {
            const result = editor.command.getPositionContextByEvent(
              {
                target: $canvas[0],
                offsetX: x,
                offsetY: y
              } as any
            )
            if (result?.tableInfo) {
              hitPoint = { x, y }
              break
            }
          }
        }
        expect(hitPoint).to.not.eq(null)
        cy.wrap(hitPoint).as('hitPoint')
      })
    })

    cy.get('@hitPoint').then(point => {
      const hitPoint = point as { x: number; y: number }
      cy.get('canvas[data-index="2"]').scrollIntoView().click(hitPoint.x, hitPoint.y, {
        force: true
      })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      expect(cursor!.pageNo).to.eq(2)
    })

    cy.get('.ce-inputarea').type('X', { delay: 0 })

    cy.getEditor().then((editor: Editor) => {
      const text = getTableCellText(editor, tableId)
      expect(text).to.include('X')
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      expect(cursor!.pageNo).to.eq(2)
    })

    cy.get('.ce-inputarea').type('YZ', { delay: 0 })

    cy.getEditor().then((editor: Editor) => {
      const text = getTableCellText(editor, tableId)
      expect(text).to.have.length(seed.length + appendText.length)
      expect(text).to.include(appendText)
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      expect(cursor!.pageNo).to.eq(2)
    })
  })

  it('keeps the caret on the clicked page after the table spans more than two pages', () => {
    const seed = 'M'.repeat(2000)
    let tableId = ''

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text())).to.be.greaterThan(2)
    })

    cy.getEditor().then((editor: Editor) => {
      const clickPoint = getCursorClickPoint(editor)
      expect(clickPoint.pageNo).to.be.greaterThan(1)
      cy.wrap(clickPoint).as('clickPoint')
    })

    cy.get('@clickPoint').then(point => {
      const clickPoint = point as ReturnType<typeof getCursorClickPoint>
      cy.get(`canvas[data-index="${clickPoint.pageNo}"]`)
        .scrollIntoView()
        .click(clickPoint.x, clickPoint.y, {
          force: true
        })
    })

    cy.get('@clickPoint').then(point => {
      const clickPoint = point as ReturnType<typeof getCursorClickPoint>
      cy.getEditor().then((editor: Editor) => {
        expect(getTableCellText(editor, tableId)).to.eq(seed)
        const cursor = editor.command.getCursorPosition()
        expect(cursor).to.not.eq(null)
        expect(cursor!.pageNo).to.eq(clickPoint.pageNo)
      })
    })
  })

  it('still moves backspace across paged table boundaries', () => {
    const seed = 'M'.repeat(2000)
    let tableId = ''
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      setPagedTableCursor(editor, tableId, boundaryPoints!.nextPoint.index)
      expect(editor.command.getRange().startIndex).to.eq(0)
    })

    cy.get('.ce-inputarea').type('{backspace}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      expect(range.startIndex).to.be.greaterThan(0)
      expect(getTableCellText(editor, tableId)).to.eq('M'.repeat(seed.length - 1))
    })
  })

  it('still moves delete across paged table boundaries', () => {
    const seed = 'M'.repeat(2000)
    let tableId = ''
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      setPagedTableCursor(editor, tableId, boundaryPoints!.prevPoint.index)
      expect(editor.command.getRange().startIndex).to.be.greaterThan(0)
    })

    cy.get('.ce-inputarea').type('{del}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      expect(range.startIndex).to.eq(0)
      expect(getTableCellText(editor, tableId)).to.eq('M'.repeat(seed.length - 1))
    })
  })

  it('still moves arrow keys across paged table boundaries', () => {
    const seed = 'M'.repeat(2000)
    let tableId = ''
    let prevPageNo = -1
    let nextPageNo = -1
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      setPagedTableCursor(editor, tableId, boundaryPoints!.prevPoint.index)
      prevPageNo = editor.command.getCursorPosition()!.pageNo
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor?.pageNo).to.be.greaterThan(prevPageNo)
      expect(editor.command.getRange().startIndex).to.eq(0)
    })

    cy.getEditor().then((editor: Editor) => {
      setPagedTableCursor(editor, tableId, boundaryPoints!.nextPoint.index)
      nextPageNo = editor.command.getCursorPosition()!.pageNo
      expect(editor.command.getRange().startIndex).to.eq(0)
    })

    cy.get('.ce-inputarea').type('{uparrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor?.pageNo).to.be.lessThan(nextPageNo)
      expect(editor.command.getRange().startIndex).to.be.greaterThan(0)
      expect(getTableCellText(editor, tableId)).to.eq(seed)
    })
  })

  it('still deletes the whole paged table at once', () => {
    const seed = 'M'.repeat(2000)

    cy.getEditor().then((editor: Editor) => {
      preparePagedTable(editor, seed)
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text())).to.be.greaterThan(1)
    })

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeDeleteTable()
      const tableList = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.filter(element => element.type === 'table')
      expect(tableList).to.have.length(0)
    })
  })

  it('still supports selecting text across pages', () => {
    const seed = '0123456789'.repeat(500)
    let startPoint: ReturnType<typeof getCursorClickPoint> | null = null
    let endPoint: ReturnType<typeof getCursorClickPoint> | null = null

    cy.getEditor().then((editor: Editor) => {
      preparePagedText(editor, seed)
      editor.command.executeSetRange(10, 10)
      startPoint = getCursorClickPoint(editor)
      expect(startPoint.pageNo).to.eq(0)
      editor.command.executeSetRange(seed.length - 10, seed.length - 10)
      endPoint = getCursorClickPoint(editor)
      expect(endPoint.pageNo).to.be.greaterThan(0)
      editor.command.executeSetRange(0, 0)
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text())).to.be.greaterThan(1)
    })

    cy.wrap(null).then(() => {
      expect(startPoint).to.not.eq(null)
      cy.wrap(startPoint).as('startPoint')
    })

    cy.wrap(null).then(() => {
      expect(endPoint).to.not.eq(null)
      cy.wrap(endPoint).as('endPoint')
    })

    cy.get('@startPoint').then(start => {
      const point = start as { x: number; y: number }
      cy.get('canvas[data-index="0"]').trigger('mousedown', point.x, point.y, {
        button: 0,
        force: true
      })
    })

    cy.get('@endPoint').then(end => {
      const point = end as ReturnType<typeof getCursorClickPoint>
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const rangeText = editor.command.getRangeText()
      expect(rangeText.length).to.be.greaterThan(50)
    })
  })

  it('still supports selecting paged table text across pages', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let selectionPoints:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
          startIndex: number
          endIndex: number
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      selectionPoints = findCrossPageTableSelectionPoints(
        editor,
        tableId,
        seed.length
      )
      expect(selectionPoints).to.not.eq(null)
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
    })

    cy.get('.page-size').should($el => {
      expect(Number($el.text())).to.be.greaterThan(2)
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      cy.wrap(selectionPoints!.startPoint).as('tableStartPoint')
      cy.wrap(selectionPoints!.endPoint).as('tableEndPoint')
    })

    cy.get('@tableStartPoint').then(start => {
      const point = start as ReturnType<typeof getCursorClickPoint>
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@tableEndPoint').then(end => {
      const point = end as ReturnType<typeof getCursorClickPoint>
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText.length).to.be.greaterThan(10)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
    })
  })

  it('still supports selecting paged table text within the same page', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let selectionPoints:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      selectionPoints = findSamePageTableSelectionPoints(
        editor,
        tableId,
        seed.length
      )
      expect(selectionPoints).to.not.eq(null)
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
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      cy.wrap(selectionPoints!.startPoint).as('samePageTableStartPoint')
      cy.wrap(selectionPoints!.endPoint).as('samePageTableEndPoint')
    })

    cy.get('@samePageTableStartPoint').then(start => {
      const point = start as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@samePageTableEndPoint').then(end => {
      const point = end as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText.length).to.be.greaterThan(0)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
    })
  })

  it('does not highlight the lower fragment when selecting only within the upper fragment of a paged cell', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoint: IndexedCursorClickPoint | null = null
    let endPoint: IndexedCursorClickPoint | null = null
    let lowerFragmentPoints: CursorBoxPoint[] = []

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      const boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      startPoint = {
        ...getTableCursorClickPoint(
          editor,
          tableId,
          Math.max(0, boundaryPoints!.prevPoint.index - 8)
        ),
        index: Math.max(0, boundaryPoints!.prevPoint.index - 8)
      }
      endPoint = {
        ...getTableCursorClickPoint(editor, tableId, boundaryPoints!.prevPoint.index),
        index: boundaryPoints!.prevPoint.index
      }
      const lowerFragmentStartPageNo = boundaryPoints!.nextPoint.pageNo
      const sampleIndexes = [
        boundaryPoints!.nextPoint.index,
        boundaryPoints!.nextPoint.index + 1,
        boundaryPoints!.nextPoint.index + 5,
        boundaryPoints!.nextPoint.index + 10
      ]
      lowerFragmentPoints = sampleIndexes
        .filter(index => index < seed.length)
        .map(index => getTableCursorBoxPoint(editor, tableId, index))
        .filter(point => point.pageNo === lowerFragmentStartPageNo)
      expect(startPoint.pageNo).to.eq(endPoint.pageNo)
      expect(lowerFragmentPoints.length).to.be.greaterThan(0)
      expect(lowerFragmentPoints[0].pageNo).to.be.greaterThan(endPoint.pageNo)
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
    })

    cy.wrap(null).then(() => {
      expect(startPoint).to.not.eq(null)
      expect(endPoint).to.not.eq(null)
      expect(lowerFragmentPoints.length).to.be.greaterThan(0)
    })

    cy.document().then(doc => {
      lowerFragmentPoints.forEach(point => {
        expect(readCanvasBoxStats(doc, point.pageNo, point).blueish).to.eq(0)
      })
    })

    cy.then(() => {
      cy.get(`canvas[data-index="${startPoint!.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', startPoint!.x, startPoint!.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', endPoint!.x, endPoint!.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', endPoint!.x, endPoint!.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
      expect(range.endIndex).to.be.lessThan(lowerFragmentPoints[0].index + 1)
    })

    cy.document().then(doc => {
      lowerFragmentPoints.forEach(point => {
        expect(readCanvasBoxStats(doc, point.pageNo, point).blueish).to.eq(0)
      })
    })
  })

  it('does not highlight the lower fragment when dragging right to left only within the upper fragment of a paged cell', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let upperLeftPoint: IndexedCursorClickPoint | null = null
    let upperRightPoint: IndexedCursorClickPoint | null = null
    let lowerFragmentPoints: CursorBoxPoint[] = []

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      const boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      upperLeftPoint = {
        ...getTableCursorClickPoint(
          editor,
          tableId,
          Math.max(0, boundaryPoints!.prevPoint.index - 20)
        ),
        index: Math.max(0, boundaryPoints!.prevPoint.index - 20)
      }
      upperRightPoint = {
        ...getTableCursorClickPoint(editor, tableId, boundaryPoints!.prevPoint.index),
        index: boundaryPoints!.prevPoint.index
      }
      const lowerFragmentStartPageNo = boundaryPoints!.nextPoint.pageNo
      const sampleIndexes = [
        boundaryPoints!.nextPoint.index,
        boundaryPoints!.nextPoint.index + 1,
        boundaryPoints!.nextPoint.index + 5,
        boundaryPoints!.nextPoint.index + 10
      ]
      lowerFragmentPoints = sampleIndexes
        .filter(index => index < seed.length)
        .map(index => getTableCursorBoxPoint(editor, tableId, index))
        .filter(point => point.pageNo === lowerFragmentStartPageNo)
      expect(upperLeftPoint.pageNo).to.eq(upperRightPoint.pageNo)
      expect(lowerFragmentPoints.length).to.be.greaterThan(0)
      expect(lowerFragmentPoints[0].pageNo).to.be.greaterThan(upperRightPoint.pageNo)
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
    })

    cy.document().then(doc => {
      lowerFragmentPoints.forEach(point => {
        expect(readCanvasBoxStats(doc, point.pageNo, point).blueish).to.eq(0)
      })
    })

    cy.then(() => {
      cy.get(`canvas[data-index="${upperRightPoint!.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', upperRightPoint!.x, upperRightPoint!.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', upperLeftPoint!.x, upperLeftPoint!.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', upperLeftPoint!.x, upperLeftPoint!.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
      expect(range.endIndex).to.be.lessThan(lowerFragmentPoints[0].index + 1)
    })

    cy.document().then(doc => {
      lowerFragmentPoints.forEach(point => {
        expect(readCanvasBoxStats(doc, point.pageNo, point).blueish).to.eq(0)
      })
    })
  })

  it('keeps earliest-page paged table selection indices stable', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let selectionPoints:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
        }
      | null = null
    let crossPageBoundary:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
          startIndex: number
          endIndex: number
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      selectionPoints = findSamePageTableSelectionPoints(editor, tableId, seed.length)
      crossPageBoundary = findCrossPageTableSelectionPoints(
        editor,
        tableId,
        seed.length
      )
      expect(selectionPoints).to.not.eq(null)
      expect(crossPageBoundary).to.not.eq(null)
      expect(selectionPoints!.startPoint.pageNo).to.eq(
        selectionPoints!.endPoint.pageNo
      )
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
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      cy.wrap(selectionPoints!.startPoint).as('firstPageTableStartPoint')
      cy.wrap(selectionPoints!.endPoint).as('firstPageTableEndPoint')
    })

    cy.get('@firstPageTableStartPoint').then(start => {
      const point = start as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@firstPageTableEndPoint').then(end => {
      const point = end as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(range.startIndex).to.be.lessThan(crossPageBoundary!.endIndex)
      expect(range.endIndex).to.be.lessThan(crossPageBoundary!.endIndex)
      expect(rangeText.length).to.be.greaterThan(0)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
    })
  })

  it('still supports selecting paged table text across page gaps', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let selectionPoints:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
          startIndex: number
          endIndex: number
        }
      | null = null
    let gapPoint: { clientX: number; clientY: number } | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      selectionPoints = findCrossPageTableSelectionPoints(
        editor,
        tableId,
        seed.length
      )
      expect(selectionPoints).to.not.eq(null)
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
    })

    cy.window().then(win => {
      expect(selectionPoints).to.not.eq(null)
      gapPoint = getPageGapClientPoint(
        win.document,
        selectionPoints!.startPoint.pageNo,
        selectionPoints!.startPoint.x
      )
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      expect(gapPoint).to.not.eq(null)
      cy.wrap(selectionPoints!.startPoint).as('gapTableStartPoint')
      cy.wrap(selectionPoints!.endPoint).as('gapTableEndPoint')
      cy.wrap(gapPoint!).as('gapPoint')
    })

    cy.get('@gapTableStartPoint').then(start => {
      const point = start as ReturnType<typeof getCursorClickPoint>
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          buttons: 1,
          which: 1,
          force: true
        })
    })

    cy.get('@gapPoint').then(point => {
      const gap = point as { clientX: number; clientY: number }
      cy.get('.ce-page-container').trigger('mousemove', {
        clientX: gap.clientX,
        clientY: gap.clientY,
        pageX: gap.clientX,
        pageY: gap.clientY,
        screenX: gap.clientX,
        screenY: gap.clientY,
        button: 0,
        buttons: 1,
        which: 1,
        force: true
      })
    })

    cy.get('@gapTableEndPoint').then(end => {
      const point = end as ReturnType<typeof getCursorClickPoint>
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          buttons: 1,
          which: 1,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          buttons: 1,
          which: 1,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText.length).to.be.greaterThan(10)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
    })
  })

  it('does not include sibling cell text when selecting a paged cell across pages', () => {
    const leftSeed = 'L'.repeat(2000)
    const rightSeed = 'R'.repeat(80)
    let tableId = ''
    let selectionPoints:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
          startIndex: number
          endIndex: number
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTwoColTable(editor, leftSeed, rightSeed)
      selectionPoints = findCrossPageTableSelectionPoints(
        editor,
        tableId,
        leftSeed.length
      )
      expect(selectionPoints).to.not.eq(null)
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
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      cy.wrap(selectionPoints!.startPoint).as('leftCellStartPoint')
      cy.wrap(selectionPoints!.endPoint).as('leftCellEndPoint')
    })

    cy.get('@leftCellStartPoint').then(start => {
      const point = start as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@leftCellEndPoint').then(end => {
      const point = end as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const rangeText = editor.command.getRangeText()
      expect(rangeText.length).to.be.greaterThan(10)
      expect(rangeText).to.not.include('R')
      expect(getTableCellText(editor, tableId, 0, 0)).to.eq(leftSeed)
      expect(getTableCellText(editor, tableId, 0, 1)).to.eq(rightSeed)
    })
  })

  it('still supports selecting paged table text within a later page only', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let selectionPoints:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      selectionPoints = findLaterPageSamePageTableSelectionPoints(
        editor,
        tableId,
        seed.length
      )
      expect(selectionPoints).to.not.eq(null)
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      cy.wrap(selectionPoints!.startPoint).as('laterPageTableStartPoint')
      cy.wrap(selectionPoints!.endPoint).as('laterPageTableEndPoint')
    })

    cy.get('@laterPageTableStartPoint').then(start => {
      const point = start as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@laterPageTableEndPoint').then(end => {
      const point = end as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(range.startIndex).to.be.greaterThan(0)
      expect(rangeText.length).to.be.greaterThan(0)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
    })
  })

  it('still moves left arrow from a later page back to an earlier page', () => {
    const seed = 'M'.repeat(2000)
    let tableId = ''
    let nextPageNo = -1
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      setPagedTableCursor(editor, tableId, boundaryPoints!.nextPoint.index)
      nextPageNo = editor.command.getCursorPosition()!.pageNo
      expect(editor.command.getRange().startIndex).to.eq(0)
    })

    cy.get('.ce-inputarea').type('{leftarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor?.pageNo).to.be.lessThan(nextPageNo)
      expect(editor.command.getRange().startIndex).to.be.greaterThan(0)
      expect(getTableCellText(editor, tableId)).to.eq(seed)
    })
  })

  it('still moves right arrow from an earlier page into a later page', () => {
    const seed = 'M'.repeat(2000)
    let tableId = ''
    let prevPageNo = -1
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      const state = setPagedTableCursorAndReadState(
        editor,
        tableId,
        boundaryPoints!.prevPoint.index
      )
      prevPageNo = state.cursor!.pageNo
      boundaryPoints!.prevPoint.index = state.range.startIndex
    })

    cy.get('.ce-inputarea').type('{rightarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor?.pageNo).to.be.greaterThan(prevPageNo)
      expect(editor.command.getRange().startIndex).to.eq(0)
      expect(getTableCellText(editor, tableId)).to.eq(seed)
    })
  })

  it('still supports dragging selection from a later page back to an earlier page', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let selectionPoints:
      | {
          startPoint: IndexedCursorClickPoint
          endPoint: IndexedCursorClickPoint
          startIndex: number
          endIndex: number
        }
      | null = null
    let previousPoint: CursorBoxPoint | null = null
    let startBoxPoint: CursorBoxPoint | null = null
    let gapPoint: { clientX: number; clientY: number } | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      selectionPoints = findCrossPageTableSelectionPoints(
        editor,
        tableId,
        seed.length
      )
      expect(selectionPoints).to.not.eq(null)
      previousPoint = getTableCursorBoxPoint(
        editor,
        tableId,
        selectionPoints!.startIndex - 1
      )
      startBoxPoint = getTableCursorBoxPoint(
        editor,
        tableId,
        selectionPoints!.startIndex
      )
    })

    cy.window().then(win => {
      expect(selectionPoints).to.not.eq(null)
      gapPoint = getPageGapClientPoint(
        win.document,
        selectionPoints!.startPoint.pageNo,
        selectionPoints!.startPoint.x
      )
    })

    cy.wrap(null).then(() => {
      expect(selectionPoints).to.not.eq(null)
      expect(gapPoint).to.not.eq(null)
      cy.wrap(selectionPoints!.endPoint).as('reverseTableStartPoint')
      cy.wrap(selectionPoints!.startPoint).as('reverseTableEndPoint')
      cy.wrap(gapPoint!).as('reverseGapPoint')
    })

    cy.get('@reverseTableStartPoint').then(start => {
      const point = start as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const actualStartIndex = editor.command.getRange().startIndex
      if (selectionPoints) {
        selectionPoints.startIndex = actualStartIndex
        previousPoint = getTableCursorBoxPoint(
          editor,
          tableId,
          Math.max(0, actualStartIndex - 1)
        )
        startBoxPoint = getTableCursorBoxPoint(
          editor,
          tableId,
          actualStartIndex
        )
      }
    })

    cy.get('@reverseGapPoint').then(point => {
      const gap = point as { clientX: number; clientY: number }
      cy.get('.ce-page-container').trigger('mousemove', {
        clientX: gap.clientX,
        clientY: gap.clientY,
        pageX: gap.clientX,
        pageY: gap.clientY,
        screenX: gap.clientX,
        screenY: gap.clientY,
        button: 0,
        buttons: 1,
        which: 1,
        force: true
      })
    })

    cy.get('@reverseTableEndPoint').then(end => {
      const point = end as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .then($canvas => {
          const rect = ($canvas[0] as HTMLCanvasElement).getBoundingClientRect()
          const endClientPoint = {
            clientX: Math.floor(rect.left + point.x),
            clientY: Math.floor(rect.top + point.y)
          }
          cy.get('.ce-page-container')
            .trigger('mousemove', {
              clientX: endClientPoint.clientX,
              clientY: endClientPoint.clientY,
              pageX: endClientPoint.clientX,
              pageY: endClientPoint.clientY,
              screenX: endClientPoint.clientX,
              screenY: endClientPoint.clientY,
              button: 0,
              buttons: 1,
              which: 1,
              force: true
            })
            .trigger('mouseup', {
              clientX: endClientPoint.clientX,
              clientY: endClientPoint.clientY,
              pageX: endClientPoint.clientX,
              pageY: endClientPoint.clientY,
              screenX: endClientPoint.clientX,
              screenY: endClientPoint.clientY,
              button: 0,
              buttons: 1,
              which: 1,
              force: true
            })
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      if (rangeText.length === 0) {
        throw new Error(
          JSON.stringify({
            range,
            cursor: editor.command.getCursorPosition()
          })
        )
      }
      expect(rangeText.length).to.be.greaterThan(10)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
      startBoxPoint = getTableCursorBoxPoint(editor, tableId, range.startIndex)
    })

    cy.document().then(doc => {
      expect(previousPoint).to.not.eq(null)
      expect(startBoxPoint).to.not.eq(null)
      expect(
        readCanvasBoxStats(doc, previousPoint!.pageNo, previousPoint!).blueish
      ).to.eq(0)
      const startBlueish = readCanvasBoxStats(
        doc,
        startBoxPoint!.pageNo,
        startBoxPoint!
      ).blueish
      if (startBlueish > 0) {
        expect(startBlueish).to.be.greaterThan(0)
        return
      }
      cy.getEditor().then((editor: Editor) => {
        const range = editor.command.getRange()
        const candidateIndexes = [
          range.startIndex,
          Math.min(range.startIndex + 1, range.endIndex),
          Math.min(range.startIndex + 2, range.endIndex)
        ]
        const hasBlueish = candidateIndexes.some(index => {
          const point = getTableCursorBoxPoint(editor, tableId, index)
          return (
            readCanvasBoxStats(doc, point.pageNo, point).blueish > 0
          )
        })
        expect(hasBlueish).to.eq(true)
      })
    })
  })

  it('double click twice selects the whole paged cell across pages', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
    })

    cy.wrap(null).then(() => {
      expect(boundaryPoints).to.not.eq(null)
      cy.wrap(boundaryPoints!.nextPoint).as('pagedCellDblclickPoint')
    })

    cy.get('@pagedCellDblclickPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`).scrollIntoView()
    })

    cy.get('@pagedCellDblclickPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      expect(rangeText).to.eq(seed)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
    })
  })

  it('double click twice in a paged cell highlights text without painting adjacent blank cell', () => {
    const leftSeed = '0123456789'.repeat(500)
    const rightSeed = ''
    let tableId = ''
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null
    let textBoxPoint: CursorBoxPoint | null = null
    let rightBlankPoint:
      | {
          pageNo: number
          left: number
          right: number
          top: number
          bottom: number
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTwoColTable(editor, leftSeed, rightSeed)
      boundaryPoints = findPagedTableBoundaryPoints(
        editor,
        tableId,
        leftSeed.length
      )
      expect(boundaryPoints).to.not.eq(null)
      textBoxPoint = getTableCursorBoxPoint(
        editor,
        tableId,
        boundaryPoints!.nextPoint.index
      )
      rightBlankPoint = {
        pageNo: textBoxPoint.pageNo,
        left: 175,
        right: 205,
        top: textBoxPoint.top,
        bottom: textBoxPoint.bottom
      }
      cy.wrap(boundaryPoints!.nextPoint).as('pagedCellTextDblclickPoint')
    })

    cy.get('@pagedCellTextDblclickPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getRangeText()).to.eq(leftSeed)
    })

    cy.document().then(doc => {
      expect(textBoxPoint).to.not.eq(null)
      expect(rightBlankPoint).to.not.eq(null)
      expect(
        readCanvasBoxStats(doc, textBoxPoint!.pageNo, textBoxPoint!).blueish
      ).to.be.greaterThan(0)
      expect(
        readCanvasBoxStats(doc, rightBlankPoint!.pageNo, rightBlankPoint!).blueish
      ).to.eq(0)
    })
  })

  it('double click twice inside a third-page paged cell does not select the whole document', () => {
    const prefix = 'PREFIX-KEEP'
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let thirdPagePoint: IndexedCursorClickPoint | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTableWithPrefix(editor, prefix, seed)
      for (let index = 0; index < seed.length; index++) {
        const point = {
          ...getTableCursorClickPoint(editor, tableId, index),
          index
        }
        if (point.pageNo >= 2) {
          thirdPagePoint = point
          break
        }
      }
      expect(thirdPagePoint).to.not.eq(null)
      cy.wrap(thirdPagePoint!).as('thirdPagePagedCellDblclickPoint')
    })

    cy.get('@thirdPagePagedCellDblclickPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`).scrollIntoView()
    })

    cy.get('@thirdPagePagedCellDblclickPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText).to.eq(seed)
      expect(rangeText.includes(prefix)).to.eq(false)
    })
  })

  it('click then double click twice inside a third-page paged cell still selects only the cell content', () => {
    const prefix = 'PREFIX-KEEP'
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let thirdPagePoint: IndexedCursorClickPoint | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTableWithPrefix(editor, prefix, seed)
      for (let index = 0; index < seed.length; index++) {
        const point = {
          ...getTableCursorClickPoint(editor, tableId, index),
          index
        }
        if (point.pageNo >= 2) {
          thirdPagePoint = point
          break
        }
      }
      expect(thirdPagePoint).to.not.eq(null)
      cy.wrap(thirdPagePoint!).as('thirdPagePagedCellClickDblclickPoint')
    })

    cy.get('@thirdPagePagedCellClickDblclickPoint').then(pointPayload => {
      const point = pointPayload as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .click(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
        .dblclick(point.x, point.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText).to.eq(seed)
      expect(rangeText.includes(prefix)).to.eq(false)
    })
  })

  it('places the caret before the first character in a later paged fragment', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoint:
      | {
          pageNo: number
          x: number
          y: number
          index: number
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      startPoint = getPagedFragmentStartClickPoint(editor, tableId, seed.length)
      expect(startPoint).to.not.eq(null)
    })

    cy.get('@canvas')
    cy.wrap(null).then(() => {
      expect(startPoint).to.not.eq(null)
    })

    cy.then(() => {
      const point = startPoint!
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      if (range.startIndex !== 0 || range.endIndex !== 0) {
        throw new Error(
          JSON.stringify({
            range,
            cursor: editor.command.getCursorPosition()
          })
        )
      }
    })
  })

  it('selects the first character in a later paged fragment first row', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoint:
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
      startPoint = getPagedFragmentFirstVisibleCharClickPoint(
        editor,
        tableId,
        seed.length
      )
      expect(startPoint).to.not.eq(null)
      endPoint = startPoint
        ? {
            ...getTableCursorClickPoint(
              editor,
              tableId,
              Math.min(seed.length - 1, startPoint.index + 8)
            ),
            index: Math.min(seed.length - 1, startPoint.index + 8)
          }
        : null
    })

    cy.wrap(null).then(() => {
      expect(startPoint).to.not.eq(null)
      expect(endPoint).to.not.eq(null)
      cy.wrap(startPoint!).as('laterFragmentFirstCharStartPoint')
      cy.wrap(endPoint!).as('laterFragmentFirstCharEndPoint')
    })

    cy.get('@laterFragmentFirstCharStartPoint').then(start => {
      const point = start as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const actualStartIndex = editor.command.getRange().startIndex
      if (startPoint) {
        startPoint.index = actualStartIndex
      }
    })

    cy.get('@laterFragmentFirstCharEndPoint').then(end => {
      const point = end as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText.length).to.be.greaterThan(0)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
      expect(rangeText[0]).to.eq(tableText[range.startIndex])
    })
  })

  it('selects the first CJK character in a later paged fragment first row', () => {
    const seed = '接触过有发热或呼吸道症状的人员；否认14天内自身有发热或呼吸道症状；'.repeat(
      60
    )
    let tableId = ''
    let startPoint:
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
      startPoint = getPagedFragmentFirstVisibleCharClickPoint(
        editor,
        tableId,
        seed.length
      )
      expect(startPoint).to.not.eq(null)
      endPoint = startPoint
        ? {
            ...getTableCursorClickPoint(
              editor,
              tableId,
              Math.min(seed.length - 1, startPoint.index + 6)
            ),
            index: Math.min(seed.length - 1, startPoint.index + 6)
          }
        : null
    })

    cy.wrap(null).then(() => {
      expect(startPoint).to.not.eq(null)
      expect(endPoint).to.not.eq(null)
      cy.wrap(startPoint!).as('laterFragmentFirstCJKStartPoint')
      cy.wrap(endPoint!).as('laterFragmentFirstCJKEndPoint')
    })

    cy.get('@laterFragmentFirstCJKStartPoint').then(start => {
      const point = start as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const actualStartIndex = editor.command.getRange().startIndex
      if (startPoint) {
        startPoint.index = actualStartIndex
      }
    })

    cy.get('@laterFragmentFirstCJKEndPoint').then(end => {
      const point = end as IndexedCursorClickPoint
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousemove', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      const tableText = getTableCellText(editor, tableId)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText.length).to.be.greaterThan(0)
      expect(rangeText).to.eq(tableText.slice(range.startIndex, range.endIndex))
      expect(rangeText[0]).to.eq(tableText[range.startIndex])
    })
  })

  it('still moves up and down inside a later paged fragment', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let boundaryPoints:
      | {
          prevPoint: IndexedCursorClickPoint
          nextPoint: IndexedCursorClickPoint
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      boundaryPoints = findPagedTableBoundaryPoints(editor, tableId, seed.length)
      expect(boundaryPoints).to.not.eq(null)
      setPagedTableCursor(editor, tableId, boundaryPoints!.nextPoint.index + 20)
    })

    cy.getEditor().then((editor: Editor) => {
      const before = editor.command.getCursorPosition()
      cy.wrap(before?.pageNo).as('laterFragmentPageNo')
    })

    cy.get('.ce-inputarea').type('{uparrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      expect(editor.command.getRange().startIndex).to.be.greaterThan(0)
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      expect(getTableCellText(editor, tableId)).to.eq(seed)
    })
  })

  it('still moves up and down from the later fragment start caret position', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoint:
      | {
          pageNo: number
          x: number
          y: number
          index: number
        }
      | null = null
    let startPageNo = -1

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      startPoint = getPagedFragmentStartClickPoint(editor, tableId, seed.length)
      expect(startPoint).to.not.eq(null)
    })

    cy.then(() => {
      const point = startPoint!
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      startPageNo = editor.command.getCursorPosition()!.pageNo
      expect(editor.command.getRange().startIndex).to.eq(0)
    })

    cy.get('.ce-inputarea').type('{uparrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor?.pageNo).to.be.lessThan(startPageNo)
    })

    cy.get('.ce-inputarea').type('{downarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor?.pageNo).to.eq(startPageNo)
      expect(editor.command.getRange().startIndex).to.eq(0)
    })
  })

  it('moves up from a later fragment inner line start into the previous page', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoint:
      | {
          pageNo: number
          x: number
          y: number
          index: number
        }
      | null = null
    let startPageNo = -1

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      startPoint = getLaterFragmentInnerLineStartClickPoint(
        editor,
        tableId,
        seed.length
      )
      expect(startPoint).to.not.eq(null)
    })

    cy.then(() => {
      const point = startPoint!
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      startPageNo = editor.command.getCursorPosition()!.pageNo
    })

    cy.get('.ce-inputarea').type('{uparrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      const range = editor.command.getRange()
      expect(cursor).to.not.eq(null)
      expect(cursor!.pageNo).to.be.lessThan(startPageNo)
      expect(range.startIndex).to.be.lessThan(startPoint!.index)
      expect(range.startIndex).to.be.greaterThan(0)
    })
  })

  it('moves up from multiple caret positions in the later fragment first row', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoints: Array<{
      pageNo: number
      x: number
      y: number
      index: number
    }> = []

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      startPoints = getLaterFragmentFirstRowClickPoints(editor, tableId, seed.length)
      expect(startPoints.length).to.be.greaterThan(1)
    })

    cy.wrap(null).then(() => {
      startPoints.forEach(point => {
        let clickedIndex = -1
        cy.get(`canvas[data-index="${point.pageNo}"]`)
          .scrollIntoView()
          .trigger('mousedown', point.x, point.y, {
            button: 0,
            force: true
          })
          .trigger('mouseup', point.x, point.y, {
            button: 0,
            force: true
          })

        cy.getEditor().then((editor: Editor) => {
          const cursor = editor.command.getCursorPosition()
          const range = editor.command.getRange()
          expect(cursor).to.not.eq(null)
          expect(cursor!.pageNo).to.eq(point.pageNo)
          clickedIndex = cursor!.index
          expect(range.startIndex).to.eq(range.endIndex)
        })

        cy.get('.ce-inputarea').type('{uparrow}', {
          force: true
        })

        cy.getEditor().then((editor: Editor) => {
          const cursor = editor.command.getCursorPosition()
          expect(cursor).to.not.eq(null)
          expect(cursor!.pageNo).to.be.lessThan(point.pageNo)
          expect(cursor!.index).to.be.lessThan(clickedIndex)
          expect(cursor!.index).to.be.greaterThan(0)
        })
      })
    })
  })

  it('moves right from the later fragment start without skipping characters', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoint:
      | {
          pageNo: number
          x: number
          y: number
          index: number
        }
      | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      startPoint = getPagedFragmentStartClickPoint(editor, tableId, seed.length)
      expect(startPoint).to.not.eq(null)
    })

    cy.then(() => {
      const point = startPoint!
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.get('.ce-inputarea').type('{rightarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      expect(range.startIndex).to.eq(1)
      expect(range.endIndex).to.eq(1)
    })
  })

  it('moves left from the later fragment start into the previous paged fragment', () => {
    const seed = '0123456789'.repeat(500)
    let tableId = ''
    let startPoint:
      | {
          pageNo: number
          x: number
          y: number
          index: number
        }
      | null = null
    let startPageNo = -1

    cy.getEditor().then((editor: Editor) => {
      tableId = preparePagedTable(editor, seed)
      startPoint = getPagedFragmentStartClickPoint(editor, tableId, seed.length)
      expect(startPoint).to.not.eq(null)
    })

    cy.then(() => {
      const point = startPoint!
      cy.get(`canvas[data-index="${point.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', point.x, point.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', point.x, point.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      startPageNo = editor.command.getCursorPosition()!.pageNo
      expect(editor.command.getRange().startIndex).to.eq(0)
    })

    cy.get('.ce-inputarea').type('{leftarrow}', {
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor?.pageNo).to.be.lessThan(startPageNo)
      expect(editor.command.getRange().startIndex).to.be.greaterThan(0)
    })
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
      cy.get('@pagedSameCharAnchor').then(anchorPayload => {
        const { anchorCursorIndex } = anchorPayload as {
          anchorCursorIndex: number
        }
        const rangeText = editor.command.getRangeText()
        expect(rangeText.length).to.be.greaterThan(0)
        expect(rangeText[0]).to.eq(seed[anchorCursorIndex])
      })
    })
  })

})
