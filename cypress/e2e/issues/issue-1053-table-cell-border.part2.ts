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
  it('does not draw a paged fragment top border for internal-only borders', () => {
    const seed = '0123456789'.repeat(800)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTable(editor, seed)
      const box = findLaterFragmentBox(editor, tableId, seed.length)
      expect(box).to.not.eq(null)
      cy.wrap({ editor, box }).as('pagedInternalBorderContext')
    })

    cy.get('@pagedInternalBorderContext').then(payload => {
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
      editor.command.executeTableBorderType(TableBorder.INTERNAL)
      cy.wait(50)
      cy.document().then(doc => {
        expect(
          getLongestDarkPixelRunInRegion(doc, box.pageNo, box)
        ).to.be.lessThan(4)
      })
    })
  })

  it('keeps table cell text inside thick borders', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              borderType: TableBorder.ALL,
              borderWidth: 8,
              colgroup: [{ width: 120 }, { width: 120 }],
              trList: [
                {
                  height: 80,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: '否认14天内去过以下场所；水产、肉类批发市场'.split('').map(value => ({
                        value
                      }))
                    },
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

      const table = (editor as any).draw
        .getOriginalElementList()
        .find((element: any) => element.type === ElementType.TABLE)
      const firstCell = getCellBounds(editor, table.id!, 0, 0)
      const firstRow = table.trList![0].tdList[0].rowList![0]
      const rowList = table.trList![0].tdList[0].rowList!
      const rowsHeight = rowList.reduce(
        (sum: number, row: any) => sum + row.height + (row.offsetY || 0),
        0
      )
      const borderContentInset = 7
      const tdPaddingHeight = 5
      const contentLeft = firstCell.x + 8 + 5
      const contentRight = firstCell.x + firstCell.width - 8 - 5
      expect(firstRow.width).to.be.lessThan(contentRight - contentLeft + 1)
      expect(rowsHeight).to.be.at.most(
        table.trList![0].tdList[0].height! -
          borderContentInset * 2 -
          tdPaddingHeight
      )
    })
  })

  it('resizes table rows and columns by dragging table tool handles', () => {
    cy.getEditor().then((editor: Editor) => {
      const table = insertTableAndSelectFirstCell(editor, 2, 2)
      ;(editor as any).draw.getComponents().tableTool.render()
      const beforeWidth = table.colgroup![0].width
      const beforeHeight = table.trList![0].height
      cy.wrap({ tableId: table.id!, beforeWidth, beforeHeight }).as(
        'resizeContext'
      )
    })

    cy.get('.ce-table-tool__col .ce-table-tool__anchor')
      .first()
      .trigger('mousedown', { button: 0, clientX: 260, clientY: 120 })
    cy.document().trigger('mousemove', { clientX: 290, clientY: 120 })
    cy.document().trigger('mouseup', { clientX: 290, clientY: 120 })

    cy.get('@resizeContext').then(payload => {
      const { beforeWidth } = payload as {
        tableId: string
        beforeWidth: number
        beforeHeight: number
      }
      cy.getEditor().then((editor: Editor) => {
        const table = getTable(editor)!
        expect(table.colgroup![0].width).to.be.greaterThan(beforeWidth)
        ;(editor as any).draw.getComponents().tableTool.render()
      })
    })

    cy.get('.ce-table-tool__row .ce-table-tool__anchor')
      .first()
      .trigger('mousedown', { button: 0, clientX: 120, clientY: 220 })
    cy.document().trigger('mousemove', { clientX: 120, clientY: 250 })
    cy.document().trigger('mouseup', { clientX: 120, clientY: 250 })

    cy.get('@resizeContext').then(payload => {
      const { beforeHeight } = payload as {
        tableId: string
        beforeWidth: number
        beforeHeight: number
      }
      cy.getEditor().then((editor: Editor) => {
        const table = getTable(editor)!
        expect(table.trList![0].height).to.be.greaterThan(beforeHeight)
      })
    })
  })

  it('adds table rows and columns from quick add buttons', () => {
    cy.getEditor().then((editor: Editor) => {
      const table = insertTableAndSelectFirstCell(editor, 2, 2)
      ;(editor as any).draw.getComponents().tableTool.render()
      cy.wrap({
        beforeRows: table.trList!.length,
        beforeCols: table.colgroup!.length
      }).as('quickAddContext')
    })

    cy.get('.ce-table-tool__quick__add').first().click()
    cy.get('@quickAddContext').then(payload => {
      const { beforeRows } = payload as {
        beforeRows: number
        beforeCols: number
      }
      cy.getEditor().then((editor: Editor) => {
        const table = getTable(editor)!
        expect(table.trList!.length).to.eq(beforeRows + 1)
        ;(editor as any).draw.getComponents().tableTool.render()
      })
    })

    cy.get('.ce-table-tool__quick__add').last().click()
    cy.get('@quickAddContext').then(payload => {
      const { beforeCols } = payload as {
        beforeRows: number
        beforeCols: number
      }
      cy.getEditor().then((editor: Editor) => {
        const table = getTable(editor)!
        expect(table.colgroup!.length).to.eq(beforeCols + 1)
      })
    })
  })

  it('removes internal horizontal lines after switching to external border', () => {
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
      editor.command.executeInsertTable(3, 2)

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
      editor.command.executeTableBorderType(TableBorder.ALL)
      editor.command.executeTableBorderType(TableBorder.EXTERNAL)
      ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

      const firstCell = getCellBounds(editor, table.id!, 0, 0)
      const secondRowCell = getCellBounds(editor, table.id!, 1, 0)
      cy.document().then(doc => {
        const internalLinePixels = countDarkPixelsInRegion(doc, firstCell.pageNo, {
          left: firstCell.x + 3,
          right: firstCell.x + firstCell.width - 3,
          top: secondRowCell.y - 1,
          bottom: secondRowCell.y + 2
        })
        expect(internalLinePixels).to.eq(0)
      })
    })
  })

  it('keeps internal vertical borders inside the table bottom', () => {
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
      editor.command.executeTableBorderType(TableBorder.INTERNAL)
      ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

      const topLeft = getCellBounds(editor, table.id!, 0, 0)
      const bottomLeft = getCellBounds(editor, table.id!, 1, 0)
      const tableBottom = bottomLeft.y + bottomLeft.height
      const lineBox = {
        left: topLeft.x + topLeft.width - 10,
        right: topLeft.x + topLeft.width + 10,
        top: topLeft.y + 3,
        bottom: tableBottom - 3
      }
      const overflowBox = {
        left: topLeft.x + topLeft.width - 3,
        right: topLeft.x + topLeft.width + 4,
        top: tableBottom + 2,
        bottom: tableBottom + 18
      }
      return editor.command
        .getImage({
          mode: 'print',
          pixelRatio: 1
        })
        .then(imageList =>
          Cypress.Promise.all([
            countVisibleLinePixelsInDataUrlRegion(
              imageList[topLeft.pageNo],
              lineBox
            ),
            countDarkPixelsInDataUrlRegion(
              imageList[topLeft.pageNo],
              overflowBox
            )
          ])
        )
        .then(([verticalLinePixels, overflowPixels]) => {
          expect(verticalLinePixels).to.be.greaterThan(0)
          expect(overflowPixels).to.eq(0)
        })
    })
  })

  it('keeps dashed table top border visible', () => {
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
      editor.command.executeTableBorderType(TableBorder.DASH)
      ;(editor as any).draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

      const firstCell = getCellBounds(editor, table.id!, 0, 0)
      return editor.command.getImage({
        mode: 'print',
        pixelRatio: 1
      }).then(imageList => {
        return countVisibleLinePixelsInDataUrlRegion(imageList[firstCell.pageNo], {
          left: firstCell.x - 10,
          right: firstCell.x + firstCell.width + 10,
          top: firstCell.y - 10,
          bottom: firstCell.y + 10
        })
      }).then(topBorderPixels => {
        expect(topBorderPixels).to.be.greaterThan(0)
      })
    })
  })

  it('places later table fragments below a header bottom separator', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([10, 10, 10, 10])
      editor.command.executeSetValue(
        {
          header: [
            {
              value: '第一人民医院',
              size: 24
            },
            {
              value: '\n',
              type: ElementType.SEPARATOR
            }
          ],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              borderType: TableBorder.ALL,
              colgroup: [{ width: 80 }],
              trList: [
                {
                  height: 42,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: '0123456789'.repeat(120).split('').map(value => ({
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

      const table = getTable(editor)!
      const {
        row,
        bounds
      } = getFirstLaterFragmentBounds(editor, table.id!)
      const draw = (editor as any).draw
      const rowMargin =
        draw.getServices().metricsService.getElementRowMargin(
          draw.getOriginalElementList().find((element: any) => element.id === table.id)
        )
      const bodyStartY =
        draw.getMargins()[0] + draw.getHeader().getExtraHeight()

      expect(row.offsetY).to.be.greaterThan(0)
      expect(bounds.y).to.be.greaterThan(bodyStartY + rowMargin - 1)
    })
  })

  it('wraps punctuation inside table cells without changing ordinary text hanging', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        wordBreak: WordBreak.BREAK_WORD
      })
      editor.command.executePaperSize(260, 260)
      editor.command.executeSetPaperMargin([20, 20, 20, 20])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 120 }],
              trList: [
                {
                  height: 42,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [
                        {
                          value: '你',
                          width: 55
                        },
                        {
                          value: '好',
                          width: 55
                        },
                        {
                          value: '，',
                          width: 20
                        },
                        {
                          value: '下',
                          width: 55
                        }
                      ]
                    }
                  ]
                }
              ]
            },
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const table = draw
        .getOriginalElementList()
        .find((element: any) => element.type === ElementType.TABLE)
      const tableCellRows = table.trList![0].tdList[0].rowList!
      const getRowText = (row: any) =>
        row.elementList
          .map((element: any) => element.value)
          .join('')
          .replace(/\u200B/g, '')
      expect(getRowText(tableCellRows[0])).to.eq('你好')
      expect(getRowText(tableCellRows[1])).to.eq('，下')

      const innerWidth = draw.getOriginalInnerWidth()
      const charWidth = Math.floor(innerWidth / 2)
      editor.command.executeSetValue({
        main: [
          {
            value: '你',
            width: charWidth
          },
          {
            value: '好',
            width: charWidth
          },
          {
            value: '，',
            width: 20
          },
          {
            value: '下',
            width: charWidth
          }
        ]
      })
      const textRows = draw
        .getObjectResolver().getOriginalRowList()
        .filter((row: any) =>
          row.elementList.some((element: any) => element.value !== '\u200B') &&
          !row.elementList.some((element: any) => element.type === ElementType.TABLE)
        )
      const hangingRow = textRows.find((row: any) =>
        row.elementList.map((element: any) => element.value).join('').includes('你好，')
      )
      expect(hangingRow).to.not.eq(undefined)
    })
  })
})