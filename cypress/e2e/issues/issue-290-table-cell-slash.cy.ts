import Editor from '../../../src/editor'
import { TableBorder, TdSlash } from '../../../src/editor/dataset/enum/table/Table'

function getTable(editor: Editor) {
  return editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
}

function insertTableAndSelectFirstCell(editor: Editor, row = 2, col = 2) {
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
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertTable(row, col)

  const table = getTable(editor)!
  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id!,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0, table.id!, 0, 0, 0, 0)
  return table
}

function getCompositedCanvas(doc: Document, pageNo = 0) {
  const baseCanvas = doc.querySelector(
    `canvas[data-index="${pageNo}"]`
  ) as HTMLCanvasElement | null
  if (!baseCanvas) {
    throw new Error(`base canvas ${pageNo} not found`)
  }
  const overlayCanvas = doc.querySelector(
    `canvas[data-overlay-index="${pageNo}"]`
  ) as HTMLCanvasElement | null
  const compositedCanvas = doc.createElement('canvas')
  compositedCanvas.width = baseCanvas.width
  compositedCanvas.height = baseCanvas.height
  const ctx = compositedCanvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)
  if (overlayCanvas) {
    ctx.drawImage(overlayCanvas, 0, 0)
  }
  return {
    ctx,
    scaleX: compositedCanvas.width / baseCanvas.clientWidth,
    scaleY: compositedCanvas.height / baseCanvas.clientHeight
  }
}

function countDarkPixelsInRegion(
  doc: Document,
  pageNo: number,
  box: {
    left: number
    right: number
    top: number
    bottom: number
  }
) {
  const { ctx, scaleX, scaleY } = getCompositedCanvas(doc, pageNo)
  const x = Math.max(0, Math.floor(box.left * scaleX))
  const y = Math.max(0, Math.floor(box.top * scaleY))
  const width = Math.max(1, Math.ceil((box.right - box.left) * scaleX))
  const height = Math.max(1, Math.ceil((box.bottom - box.top) * scaleY))
  const image = ctx.getImageData(x, y, width, height).data
  let darkPixels = 0
  for (let index = 0; index < image.length; index += 4) {
    const r = image[index]
    const g = image[index + 1]
    const b = image[index + 2]
    const a = image[index + 3]
    if (a > 0 && (r < 245 || g < 245 || b < 245)) {
      darkPixels++
    }
  }
  return darkPixels
}

describe('issue #290 table cell slash', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('renders a slash inside a table cell and persists slashTypes', () => {
    cy.document().then(doc => {
      cy.getEditor().then((editor: Editor) => {
        insertTableAndSelectFirstCell(editor, 2, 2)
        editor.command.executeTableBorderType(TableBorder.EMPTY)
        editor.command.executeTableTdSlashType(TdSlash.FORWARD)

        const latestTable = getTable(editor)!
        const draw = (editor as any).draw

        const slashTd = latestTable.trList![0].tdList[0]
        expect(slashTd.slashTypes).to.deep.eq([TdSlash.FORWARD])

        editor.command.executeBlur()
        draw.render({ isSetCursor: false })
        draw.flushScheduledFrameRender()

        const bounds = draw
          .getTableLayoutSnapshotAccessor()
          .getFragmentCellBounds(latestTable.id!)
          .find((item: any) => item.trIndex === 0 && item.tdIndex === 0)
        expect(bounds).to.not.eq(undefined)

        const darkPixels = countDarkPixelsInRegion(doc, 0, {
          left: bounds.x + 2,
          right: bounds.x + bounds.width - 2,
          top: bounds.y + 2,
          bottom: bounds.y + bounds.height - 2
        })
        expect(darkPixels).to.be.greaterThan(0)
      })
    })
  })
})
