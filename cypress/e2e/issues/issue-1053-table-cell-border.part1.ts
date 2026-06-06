import Editor from '../../../src/editor'
import {
  TableBorder,
  TdBorder
} from '../../../src/editor/dataset/enum/table/Table'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { WordBreak } from '../../../src/editor/dataset/enum/Editor'

function getTable(editor: Editor) {
  return editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
}

function getCellBounds(editor: Editor, tableId: string, trIndex: number, tdIndex: number) {
  const draw = (editor as any).draw
  draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
  const bounds = draw
    .getServices().tableLayoutSnapshotAccessor
    .getFragmentCellBounds(tableId)
    .find((item: any) => item.trIndex === trIndex && item.tdIndex === tdIndex)
  expect(bounds).to.not.eq(undefined)
  return bounds
}

function getFirstLaterFragmentBounds(editor: Editor, logicalTableId: string) {
  const draw = (editor as any).draw
  draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
  const rowList = draw.getPageRowList().flat()
  const laterRow = rowList.find(
    (row: any) =>
      row.tableFragment?.logicalTableId === logicalTableId &&
      row.tableFragment?.fragmentOrder > 0
  )
  expect(laterRow).to.not.eq(undefined)
  const fragment = laterRow.tableFragment
  const bounds = draw
    .getServices().tableLayoutSnapshotAccessor
    .getFragmentCellBounds(fragment.tableId)
  expect(bounds.length).to.be.greaterThan(0)
  return {
    row: laterRow,
    bounds: bounds[0]
  }
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
    canvas: compositedCanvas,
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
    if (a > 0 && r < 80 && g < 80 && b < 80) {
      darkPixels++
    }
  }
  return darkPixels
}

function countColorPixelsInRegion(
  doc: Document,
  pageNo: number,
  box: {
    left: number
    right: number
    top: number
    bottom: number
  },
  predicate: (r: number, g: number, b: number, a: number) => boolean
) {
  const { ctx, scaleX, scaleY } = getCompositedCanvas(doc, pageNo)
  const x = Math.max(0, Math.floor(box.left * scaleX))
  const y = Math.max(0, Math.floor(box.top * scaleY))
  const width = Math.max(1, Math.ceil((box.right - box.left) * scaleX))
  const height = Math.max(1, Math.ceil((box.bottom - box.top) * scaleY))
  const image = ctx.getImageData(x, y, width, height).data
  let colorPixels = 0
  for (let index = 0; index < image.length; index += 4) {
    const r = image[index]
    const g = image[index + 1]
    const b = image[index + 2]
    const a = image[index + 3]
    if (predicate(r, g, b, a)) {
      colorPixels++
    }
  }
  return colorPixels
}

function countBluePixelsInRegion(
  doc: Document,
  pageNo: number,
  box: {
    left: number
    right: number
    top: number
    bottom: number
  }
) {
  return countColorPixelsInRegion(
    doc,
    pageNo,
    box,
    (r, g, b, a) => a > 0 && b > 150 && b > r * 1.5 && b > g * 1.5
  )
}

function countRedPixelsInRegion(
  doc: Document,
  pageNo: number,
  box: {
    left: number
    right: number
    top: number
    bottom: number
  }
) {
  return countColorPixelsInRegion(
    doc,
    pageNo,
    box,
    (r, g, b, a) => a > 0 && r > 150 && r > g * 1.5 && r > b * 1.5
  )
}

function countVisibleLinePixelsInDataUrlRegion(
  dataUrl: string,
  box: {
    left: number
    right: number
    top: number
    bottom: number
  }
) {
  return new Cypress.Promise<number>(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const x = Math.max(0, Math.floor(box.left))
      const y = Math.max(0, Math.floor(box.top))
      const width = Math.max(1, Math.ceil(box.right - box.left))
      const height = Math.max(1, Math.ceil(box.bottom - box.top))
      const imageData = ctx.getImageData(x, y, width, height).data
      let linePixels = 0
      for (let index = 0; index < imageData.length; index += 4) {
        const r = imageData[index]
        const g = imageData[index + 1]
        const b = imageData[index + 2]
        const a = imageData[index + 3]
        if (a > 0 && r < 235 && g < 235 && b < 235) {
          linePixels++
        }
      }
      resolve(linePixels)
    }
    image.src = dataUrl
  })
}

function countDarkPixelsInDataUrlRegion(
  dataUrl: string,
  box: {
    left: number
    right: number
    top: number
    bottom: number
  }
) {
  return new Cypress.Promise<number>(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const x = Math.max(0, Math.floor(box.left))
      const y = Math.max(0, Math.floor(box.top))
      const width = Math.max(1, Math.ceil(box.right - box.left))
      const height = Math.max(1, Math.ceil(box.bottom - box.top))
      const imageData = ctx.getImageData(x, y, width, height).data
      let darkPixels = 0
      for (let index = 0; index < imageData.length; index += 4) {
        const r = imageData[index]
        const g = imageData[index + 1]
        const b = imageData[index + 2]
        const a = imageData[index + 3]
        if (a > 0 && r < 80 && g < 80 && b < 80) {
          darkPixels++
        }
      }
      resolve(darkPixels)
    }
    image.src = dataUrl
  })
}

function countRedPixelsInDataUrl(dataUrl: string) {
  return new Cypress.Promise<number>(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let redPixels = 0
      for (let index = 0; index < imageData.length; index += 4) {
        const r = imageData[index]
        const g = imageData[index + 1]
        const b = imageData[index + 2]
        const a = imageData[index + 3]
        if (a > 0 && r > 150 && r > g * 1.5 && r > b * 1.5) {
          redPixels++
        }
      }
      resolve(redPixels)
    }
    image.src = dataUrl
  })
}

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

function findLaterFragmentBox(
  editor: Editor,
  tableId: string,
  textLength: number
) {
  let prevPageNo = 0
  for (let index = 0; index < textLength; index++) {
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
    const cursor = editor.command.getCursorPosition()
    if (!cursor) continue
    if (cursor.pageNo > prevPageNo) {
      const draw = (editor as any).draw
      const slice = draw
        .getServices().tableLayoutSnapshotAccessor
        .resolveSliceByPositionContext(draw.getCoordinate().getPositionContext())
      const bounds = draw
        .getServices().tableLayoutSnapshotAccessor
        .getFragmentCellBounds(slice.fragmentTableId)
        .find((item: any) => item.fragmentTdId === slice.fragmentTdId)
      if (bounds) {
        return {
          pageNo: bounds.pageNo,
          left: bounds.x + bounds.width * 0.35,
          right: bounds.x + bounds.width,
          top: bounds.y - 0.5,
          bottom: bounds.y + 1.5
        }
      }
    }
    prevPageNo = cursor.pageNo
  }
  return null
}

function getLongestDarkPixelRunInRegion(
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
  let longestRun = 0
  for (let row = 0; row < height; row++) {
    let currentRun = 0
    for (let col = 0; col < width; col++) {
      const index = (row * width + col) * 4
      const r = image[index]
      const g = image[index + 1]
      const b = image[index + 2]
      const a = image[index + 3]
      if (a > 0 && r < 80 && g < 80 && b < 80) {
        currentRun++
        longestRun = Math.max(longestRun, currentRun)
      } else {
        currentRun = 0
      }
    }
  }
  return longestRun
}

describe('issue #1053 table cell border settings', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })
  it('sets table border type, border color and selected cell border types', () => {
    cy.getEditor().then((editor: Editor) => {
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
      editor.command.executeInsertTable(2, 2)

      let table = getTable(editor)
      expect(table?.id).to.be.a('string')

      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table!.id!,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0)

      editor.command.executeTableBorderType(TableBorder.EXTERNAL)
      editor.command.executeTableBorderColor('#0000FF')
      editor.command.executeTableBorderWidth(3)
      editor.command.executeTableTdBorderType(TdBorder.TOP)
      editor.command.executeTableTdBorderType(TdBorder.LEFT)
      editor.command.executeTableTdBorderColor('#FF0000')
      editor.command.executeTableTdBorderWidth(4)

      table = getTable(editor)
      const firstCell = table?.trList?.[0].tdList[0]

      expect(table?.borderType).to.eq(TableBorder.EXTERNAL)
      expect(table?.borderColor).to.eq('#0000FF')
      expect(table?.borderWidth).to.eq(3)
      expect(table?.borderExternalWidth).to.eq(3)
      expect(firstCell?.borderTypes).to.include(TdBorder.TOP)
      expect(firstCell?.borderTypes).to.include(TdBorder.LEFT)
      expect(firstCell?.borderColor).to.eq('#FF0000')
      expect(firstCell?.borderWidth).to.eq(4)

      editor.command.executeTableTdBorderType(TdBorder.TOP)

      table = getTable(editor)
      expect(table?.trList?.[0].tdList[0].borderTypes).to.not.include(
        TdBorder.TOP
      )
      expect(table?.trList?.[0].tdList[0].borderTypes).to.include(TdBorder.LEFT)
    })
  })

  it('sets table and cell border styles from the context menu', () => {
    cy.getEditor().then((editor: Editor) => {
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
      editor.command.executeInsertTable(2, 2)
      editor.command.executeSetRange(0, 0)

      const table = getTable(editor)!
      const bounds = getCellBounds(editor, table.id!, 0, 0)

      cy.wrap({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      }).as('contextCell')
    })

    cy.get('@contextCell').then(payload => {
      const cell = payload as { x: number; y: number }
      cy.get('canvas[data-index="0"]').rightclick(cell.x, cell.y, {
        force: true
      })
    })

    cy.get('.ce-contextmenu-item').contains('表格边框').trigger('mouseenter')
    cy.get('.ce-contextmenu-item').contains('边框颜色').click()
    cy.get('.dialog-option__item input[type="color"]')
      .invoke('val', '#0000ff')
      .trigger('input')
      .trigger('change')
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.get('@contextCell').then(payload => {
      const cell = payload as { x: number; y: number }
      cy.get('canvas[data-index="0"]').rightclick(cell.x, cell.y, {
        force: true
      })
    })

    cy.get('.ce-contextmenu-item').contains('表格边框').trigger('mouseenter')
    cy.get('.ce-contextmenu-item').contains('边框宽度').click()
    cy.get('.dialog-option__item input[type="number"]').clear().type('3')
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.get('@contextCell').then(payload => {
      const cell = payload as { x: number; y: number }
      cy.get('canvas[data-index="0"]').rightclick(cell.x, cell.y, {
        force: true
      })
    })

    cy.get('.ce-contextmenu-item').contains('表格边框').trigger('mouseenter')
    cy.get('.ce-contextmenu-item')
      .contains('单元格边框')
      .trigger('mouseenter')
    cy.get('.ce-contextmenu-item').contains('单元格边框颜色').click()
    cy.get('.dialog-option__item input[type="color"]')
      .invoke('val', '#ff0000')
      .trigger('input')
      .trigger('change')
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.get('@contextCell').then(payload => {
      const cell = payload as { x: number; y: number }
      cy.get('canvas[data-index="0"]').rightclick(cell.x, cell.y, {
        force: true
      })
    })

    cy.get('.ce-contextmenu-item').contains('表格边框').trigger('mouseenter')
    cy.get('.ce-contextmenu-item')
      .contains('单元格边框')
      .trigger('mouseenter')
    cy.get('.ce-contextmenu-item').contains('单元格边框宽度').click()
    cy.get('.dialog-option__item input[type="number"]').clear().type('4')
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const table = getTable(editor)
      const firstCell = table?.trList?.[0].tdList[0]

      expect(table?.borderColor).to.eq('#0000ff')
      expect(table?.borderWidth).to.eq(3)
      expect(table?.borderExternalWidth).to.eq(3)
      expect(firstCell?.borderColor).to.eq('#ff0000')
      expect(firstCell?.borderWidth).to.eq(4)
      expect(firstCell?.borderTypes).to.have.members([
        TdBorder.TOP,
        TdBorder.RIGHT,
        TdBorder.BOTTOM,
        TdBorder.LEFT
      ])
    })
  })

  it('repaints the visible canvas after border color and width changes', () => {
    cy.getEditor().then((editor: Editor) => {
      const table = insertTableAndSelectFirstCell(editor)
      const firstCell = getCellBounds(editor, table.id!, 0, 0)
      const secondCell = getCellBounds(editor, table.id!, 0, 1)
      const topBorderBox = {
        left: secondCell.x + 6,
        right: secondCell.x + secondCell.width - 6,
        top: secondCell.y - 8,
        bottom: secondCell.y + 8
      }
      const rightBorderBox = {
        left: firstCell.x + firstCell.width - 8,
        right: firstCell.x + firstCell.width + 8,
        top: firstCell.y + 6,
        bottom: firstCell.y + firstCell.height - 6
      }

      editor.command.executeTableBorderColor('#0000FF')
      ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
      expect(getTable(editor)?.borderColor).to.eq('#0000FF')
      const firstFragment = (editor as any).draw
        .getPageRowList()
        .flat()
        .map((row: any) => row.tableFragment)
        .find(Boolean)
      expect(firstFragment?.borderColor).to.eq('#0000FF')

      return cy.document().then(doc => {
        const pageCanvas = doc.querySelector(
          `canvas[data-index="${firstCell.pageNo}"]`
        ) as HTMLCanvasElement
        const allBluePixels = countBluePixelsInRegion(
          doc,
          firstCell.pageNo,
          {
            left: 0,
            top: 0,
            right: pageCanvas.clientWidth,
            bottom: pageCanvas.clientHeight
          }
        )
        expect(allBluePixels).to.be.greaterThan(0)

        const thinBlueTopPixels = countBluePixelsInRegion(
          doc,
          firstCell.pageNo,
          topBorderBox
        )
        expect(thinBlueTopPixels).to.be.greaterThan(0)

        editor.command.executeTableBorderWidth(5)
        ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
        expect(getTable(editor)?.borderWidth).to.eq(5)
        expect(getTable(editor)?.borderExternalWidth).to.eq(5)

        const wideBlueTopPixels = countBluePixelsInRegion(
          doc,
          firstCell.pageNo,
          topBorderBox
        )
        expect(wideBlueTopPixels).to.be.greaterThan(thinBlueTopPixels + 20)

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
        editor.command.executeTableTdBorderColor('#FF0000')
        ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

        const thinRedPixels = countRedPixelsInRegion(
          doc,
          firstCell.pageNo,
          rightBorderBox
        )
        expect(thinRedPixels).to.be.greaterThan(0)

        editor.command.executeTableTdBorderWidth(8)
        ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
        expect(getTable(editor)?.trList?.[0].tdList[0].borderWidth).to.eq(8)

        const wideRedPixels = countRedPixelsInRegion(
          doc,
          firstCell.pageNo,
          rightBorderBox
        )
        expect(wideRedPixels).to.be.greaterThan(thinRedPixels + 20)
      })
    })
  })

  it('shows all borders when only selected cell border color and width are set', () => {
    cy.getEditor().then((editor: Editor) => {
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
      editor.command.executeInsertTable(2, 2)

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
      editor.command.executeSetRange(0, 0)

      editor.command.executeTableBorderType(TableBorder.EMPTY)
      editor.command.executeTableTdBorderColor('#FF0000')
      editor.command.executeTableTdBorderWidth(4)

      const firstCell = getTable(editor)?.trList?.[0].tdList[0]
      expect(firstCell?.borderTypes).to.have.members([
        TdBorder.TOP,
        TdBorder.RIGHT,
        TdBorder.BOTTOM,
        TdBorder.LEFT
      ])
      expect(firstCell?.borderColor).to.eq('#FF0000')
      expect(firstCell?.borderWidth).to.eq(4)
    })
  })

  it('round-trips per-cell border color and width through getValue and setValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            type: 'table',
            value: '',
            borderType: TableBorder.EXTERNAL,
            borderColor: '#0000FF',
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    borderTypes: [TdBorder.TOP],
                    borderColor: '#FF0000',
                    borderWidth: 4,
                    value: [{ value: 'A' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B' }]
                  }
                ]
              }
            ]
          } as any
        ],
        footer: []
      })

      const value = editor.command.getValue().data.main
      const firstCell = value[0].trList![0].tdList[0]

      expect(firstCell.borderTypes).to.deep.eq([TdBorder.TOP])
      expect(firstCell.borderColor).to.eq('#FF0000')
      expect(firstCell.borderWidth).to.eq(4)

      editor.command.executeSetValue({
        header: [],
        main: value,
        footer: []
      })

      const roundTripCell = editor.command.getValue().data.main[0].trList![0]
        .tdList[0]

      expect(roundTripCell.borderTypes).to.deep.eq([TdBorder.TOP])
      expect(roundTripCell.borderColor).to.eq('#FF0000')
      expect(roundTripCell.borderWidth).to.eq(4)
    })
  })

  it('renders a single cell border with its own color and width', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            type: 'table',
            value: '',
            borderType: TableBorder.EMPTY,
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    borderTypes: [
                      TdBorder.TOP,
                      TdBorder.RIGHT,
                      TdBorder.BOTTOM,
                      TdBorder.LEFT
                    ],
                    borderColor: '#FF0000',
                    borderWidth: 4,
                    value: [{ value: 'A' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B' }]
                  }
                ]
              },
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'C' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'D' }]
                  }
                ]
              }
            ]
          } as any
        ],
        footer: []
      })

      getCellBounds(editor, getTable(editor)!.id!, 0, 0)
      return editor.command.getImage({
        mode: 'print',
        pixelRatio: 1
      })
    }).then(imageList => {
      expect(imageList).to.have.length.greaterThan(0)
      return countRedPixelsInDataUrl(imageList[0])
    }).then(redPixels => {
      expect(redPixels).to.be.greaterThan(0)
    })
  })

  it('clears existing cell borders when switching the table to no border', () => {
    cy.getEditor().then((editor: Editor) => {
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
      editor.command.executeInsertTable(2, 2)

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
      editor.command.executeSetRange(0, 0)

      editor.command.executeTableTdBorderColor('#FF0000')
      editor.command.executeTableTdBorderWidth(4)
      editor.command.executeTableBorderType(TableBorder.EMPTY)

      const clearedCell = getTable(editor)?.trList?.[0].tdList[0]
      expect(clearedCell?.borderTypes).to.eq(undefined)
      expect(clearedCell?.borderColor).to.eq(undefined)
      expect(clearedCell?.borderWidth).to.eq(undefined)

      return editor.command.getImage({
        mode: 'print',
        pixelRatio: 1
      })
    }).then(imageList => {
      expect(imageList).to.have.length.greaterThan(0)
      return countRedPixelsInDataUrl(imageList[0])
    }).then(redPixels => {
      expect(redPixels).to.eq(0)
    })
  })

  it('does not keep the paged fragment top border after switching to no border', () => {
    const seed = '0123456789'.repeat(800)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTable(editor, seed)
      const box = findLaterFragmentBox(editor, tableId, seed.length)
      expect(box).to.not.eq(null)
      cy.wrap({ editor, box }).as('pagedBorderContext')
    })

    cy.get('@pagedBorderContext').then(payload => {
      const { editor, box } = payload as {
        editor: Editor
        box: {
          pageNo: number
          left: number
          right: number
          top: number
          bottom: number
        }
      }
      editor.command.executeTableBorderType(TableBorder.EMPTY)
      cy.wait(50)
      cy.document().then(doc => {
        expect(
          getLongestDarkPixelRunInRegion(doc, box.pageNo, box)
        ).to.be.lessThan(4)
      })
    })
  })
})