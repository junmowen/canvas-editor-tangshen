import Editor from '../../../src/editor'

function preparePagedTable(editor: Editor, seed: string) {
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
  editor.command.executePaperSize(240, 240)
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
  editor.command.executeInsertElementList(
    seed.split('').map(value => ({
      value
    }))
  )

  return tableId
}

function setPagedTableCursor(editor: Editor, tableId: string, index: number) {
  editor.command.executeSetPositionContext({
    startIndex: index,
    endIndex: index,
    tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(index, index)
}

function findLaterFragmentTopBorderBox(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  let prevPageNo = 0
  for (let index = 0; index < textLength; index++) {
    setPagedTableCursor(editor, tableId, index)
    const cursor = editor.command.getCursorPosition()
    if (!cursor) continue
    if (cursor.pageNo > prevPageNo) {
      const draw = (editor as any).draw
      const slice = draw
        .getTableLayoutSnapshotAccessor()
        .resolveSliceByPositionContext(draw.getPosition().getPositionContext())
      const bounds = draw
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds(slice.fragmentTableId)
        .find((item: any) => item.fragmentTdId === slice.fragmentTdId)
      if (bounds) {
        return {
          pageNo: bounds.pageNo,
          left: bounds.x,
          right: bounds.x + bounds.width,
          top: bounds.y - 1,
          bottom: bounds.y + 2
        }
      }
    }
    prevPageNo = cursor.pageNo
  }
  return null
}

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
  const compositedCanvas = doc.createElement('canvas')
  compositedCanvas.width = baseCanvas.width
  compositedCanvas.height = baseCanvas.height
  const ctx = compositedCanvas.getContext('2d')!
  ctx.drawImage(baseCanvas, 0, 0)
  if (overlayCanvas) {
    ctx.drawImage(overlayCanvas, 0, 0)
  }
  const scaleX = compositedCanvas.width / baseCanvas.clientWidth
  const scaleY = compositedCanvas.height / baseCanvas.clientHeight
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
    if (a > 0 && r < 220 && g < 220 && b < 220) {
      darkPixels++
    }
  }
  return darkPixels
}

describe('menu-table pagination border', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('keeps the top border visible for the first character row in a later paged fragment', () => {
    const seed = '0123456789'.repeat(800)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTable(editor, seed)
      const box = findLaterFragmentTopBorderBox(editor, tableId, seed.length)
      expect(box).to.not.eq(null)
      cy.wrap(box!).as('laterFragmentTopBorderBox')
    })

    cy.get('@laterFragmentTopBorderBox').then(payload => {
      const box = payload as {
        pageNo: number
        left: number
        right: number
        top: number
        bottom: number
      }
      cy.wait(50)
      cy.document().then(doc => {
        expect(countDarkPixels(doc, box.pageNo, box)).to.be.greaterThan(0)
      })
    })
  })
})
