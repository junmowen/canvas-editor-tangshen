import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type CellRef = {
  tableId: string
  text: string
}

type CursorPoint = {
  index: number
  pageNo: number
  x: number
  y: number
  left: number
  right: number
  top: number
  bottom: number
}

function prepareSimpleTable(editor: Editor, text: string): CellRef {
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
  editor.command.executeInsertTable(1, 1)
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  if (!table?.id) throw new Error('table not found')
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
  editor.command.executeInsertElementList(text.split('').map(value => ({ value })))
  return { tableId: table.id, text }
}

function setTableCursor(editor: Editor, cell: CellRef, index: number) {
  editor.command.executeSetPositionContext({
    startIndex: index,
    endIndex: index,
    tableId: cell.tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(index, index)
}

function getTableCursorPoint(
  editor: Editor,
  cell: CellRef,
  index: number
): CursorPoint {
  setTableCursor(editor, cell, index)
  const cursor = editor.command.getCursorPosition()
  if (!cursor) throw new Error(`cursor not found ${index}`)
  const {
    pageNo,
    coordinate: { leftTop, rightTop, rightBottom }
  } = cursor
  return {
    index,
    pageNo,
    x: Math.floor((leftTop[0] + rightTop[0]) / 2),
    y: Math.floor(leftTop[1] + 2),
    left: leftTop[0],
    right: rightTop[0],
    top: leftTop[1],
    bottom: rightBottom[1]
  }
}

function runDrag(
  alias: string,
  start: CursorPoint,
  end: CursorPoint,
  samplePoints: CursorPoint[],
  text: string
) {
  const snapshots: Array<{
    x: number
    range: unknown
    rangeText: string
    blueish?: Record<string, number>
  }> = []
  cy.window().then(win => {
    win.__canvasEditorPointerDebugLogs = []
    win.__canvasEditorSelectionRenderLogs = []
  })
  cy.get(`canvas[data-index="${start.pageNo}"]`).trigger('mousedown', start.x, start.y, {
    button: 0,
    force: true
  })
  const moveCount = Math.max(1, Math.abs(end.x - start.x))
  for (let i = 1; i <= moveCount; i++) {
    const x = Math.round(start.x + ((end.x - start.x) * i) / moveCount)
    const y = Math.round(start.y + ((end.y - start.y) * i) / moveCount)
    cy.get(`canvas[data-index="${start.pageNo}"]`).trigger('mousemove', x, y, {
      button: 0,
      buttons: 1,
      force: true
    })
    cy.wait(40)
    cy.getEditor().then((editor: Editor) => {
      cy.document().then(doc => {
        const blueish: Record<string, number> = {}
        for (const point of samplePoints) {
          const textIndex = point.index
          const centerBox = {
            left: Math.floor((point.left + point.right) / 2),
            right: Math.floor((point.left + point.right) / 2) + 1,
            top: point.top,
            bottom: point.bottom
          }
          blueish[`${point.index}:${text[textIndex] ?? ''}`] = readCompositedPageBoxStats(
            doc,
            point.pageNo,
            centerBox
          ).blueish
        }
        snapshots.push({
          x,
          range: { ...editor.command.getRange() },
          rangeText: editor.command.getRangeText(),
          blueish
        })
      })
    })
  }
  cy.wait(150)
  cy.getEditor().then((editor: Editor) => {
    cy.window().then(win => {
      cy.writeFile(`tmp/${alias}.json`, {
        alias,
        start,
        end,
        range: editor.command.getRange(),
        rangeText: editor.command.getRangeText(),
        snapshots,
        logs: win.__canvasEditorPointerDebugLogs,
        renderLogs: win.__canvasEditorSelectionRenderLogs,
        renderLogCount: win.__canvasEditorSelectionRenderLogs?.length ?? 0
      })
    })
  })
}


function runClickThenDrag(
  alias: string,
  start: CursorPoint,
  end: CursorPoint,
  samplePoints: CursorPoint[],
  text: string
) {
  cy.get(`canvas[data-index="${start.pageNo}"]`).click(start.x, start.y, {
    force: true
  })
  cy.getEditor().then((editor: Editor) => {
    const cursor = editor.command.getCursorPosition()
    if (!cursor) throw new Error('cursor not found after click')
    const caretStart: CursorPoint = {
      ...start,
      index: cursor.index,
      pageNo: cursor.pageNo,
      x: Math.floor(cursor.coordinate.rightTop[0]),
      y: Math.floor(cursor.coordinate.leftTop[1] + 2),
      left: cursor.coordinate.leftTop[0],
      right: cursor.coordinate.rightTop[0],
      top: cursor.coordinate.leftTop[1],
      bottom: cursor.coordinate.rightBottom[1]
    }
    runDrag(alias, caretStart, end, samplePoints, text)
  })
}
describe('pointer debug selection', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('exist')
  })

  it('captures right and left drag pointer logs', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareSimpleTable(editor, '0123456789'.repeat(8))
      const p4 = getTableCursorPoint(editor, cell, 4)
      const p8 = getTableCursorPoint(editor, cell, 8)
      cy.wrap({ cell, p4, p8 }).as('points')
    })

    cy.get('@points').then(payload => {
      const { cell, p4, p8 } = payload as {
        cell: CellRef
        p4: CursorPoint
        p8: CursorPoint
      }
      cy.getEditor().then((editor: Editor) => {
        const samplePoints = [4, 5, 6, 7, 8, 9].map(index =>
          getTableCursorPoint(editor, cell, index)
        )
        runDrag('pointer-debug-right', p4, p8, samplePoints, cell.text)
        cy.get(`canvas[data-index="${p8.pageNo}"]`).trigger('mouseup', p8.x, p8.y, {
          button: 0,
          force: true
        })
        runClickThenDrag(
          'pointer-debug-click-right',
          p4,
          p8,
          samplePoints,
          cell.text
        )
      })
    })

    cy.get('@points').then(payload => {
      const { cell, p4, p8 } = payload as {
        cell: CellRef
        p4: CursorPoint
        p8: CursorPoint
      }
      cy.get(`canvas[data-index="${p8.pageNo}"]`).trigger('mouseup', p8.x, p8.y, {
        button: 0,
        force: true
      })
      cy.getEditor().then((editor: Editor) => {
        const samplePoints = [4, 5, 6, 7, 8, 9].map(index =>
          getTableCursorPoint(editor, cell, index)
        )
        runDrag('pointer-debug-left', p8, p4, samplePoints, cell.text)
        cy.get(`canvas[data-index="${p4.pageNo}"]`).trigger('mouseup', p4.x, p4.y, {
          button: 0,
          force: true
        })
        runClickThenDrag(
          'pointer-debug-click-left',
          p8,
          p4,
          samplePoints,
          cell.text
        )
      })
    })
  })
})
