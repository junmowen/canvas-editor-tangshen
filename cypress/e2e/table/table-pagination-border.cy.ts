import Editor from '../../../src/editor'
import { TableBorder } from '../../../src/editor/dataset/enum/table/Table'
import { createPrintSvgPageListFromDocument } from '../../../src/editor/utils/print/svg'

function preparePagedTable(
  editor: Editor,
  seed: string,
  options: {
    borderType?: TableBorder
    borderColor?: string
    borderWidth?: number
  } = {}
) {
  editor.command.executePaperSize(240, 240)
  editor.command.executeSetPaperMargin([10, 10, 10, 10])
  editor.command.executeSelectAll()
  editor.command.executeBackspace()
  editor.command.executeInsertTable(1, 1)

  const table = (editor as any).draw
    .getObjectResolver().getOriginalMainElementList()
    .find((element: any) => element.type === 'table')
  if (!table?.id) {
    throw new Error('paged table was not inserted')
  }
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
  if (options.borderType) {
    editor.command.executeTableBorderType(options.borderType)
  }
  if (options.borderColor) {
    editor.command.executeTableBorderColor(options.borderColor)
  }
  if (options.borderWidth !== undefined) {
    editor.command.executeTableBorderWidth(options.borderWidth)
  }

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
        .getServices().tableLayoutSnapshotAccessor
        .resolveSliceByPositionContext(draw.getCoordinate().getPositionContext())
      const bounds = draw
        .getServices().tableLayoutSnapshotAccessor
        .getFragmentCellBounds(slice.fragmentTableId)
        .find((item: any) => item.fragmentTdId === slice.fragmentTdId)
      if (bounds) {
        return {
          pageNo: bounds.pageNo,
          left: bounds.x,
          right: bounds.x + bounds.width,
          top: bounds.y - 1,
          bottom: bounds.y + 2,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      }
    }
    prevPageNo = cursor.pageNo
  }
  return null
}

function buildWorkerSnapshot(editor: Editor, pageNo: number) {
  const draw = (editor as any).draw
  return draw.getServices().pageRenderSnapshotBuilder.build({
    jobId: Date.now(),
    pagePayload: {
      elementList: draw.getObjectResolver().getLayoutMainElementList(),
      positionList: draw.getCoordinate().getMainPositionList(),
      rowList: draw.getPageRowList()[pageNo],
      pageNo
    }
  })
}

function commandTouchesTopBox(command: any, box: {
  left: number
  right: number
  top: number
  bottom: number
}) {
  if (command.type === 'fillRect') {
    const rect = command.rect
    return (
      rect.x < box.right &&
      rect.x + rect.width > box.left &&
      rect.y < box.bottom &&
      rect.y + rect.height > box.top
    )
  }
  if (command.type === 'strokePath') {
    return command.segmentList?.some((segment: any) => {
      const minX = Math.min(segment.from[0], segment.to[0])
      const maxX = Math.max(segment.from[0], segment.to[0])
      const minY = Math.min(segment.from[1], segment.to[1])
      const maxY = Math.max(segment.from[1], segment.to[1])
      return (
        minX < box.right &&
        maxX > box.left &&
        minY <= box.bottom &&
        maxY >= box.top
      )
    })
  }
  return false
}

function findWorkerTopBorderCommands(
  editor: Editor,
  box: {
    pageNo: number
    left: number
    right: number
    top: number
    bottom: number
  },
  borderColor: string
) {
  const snapshot = buildWorkerSnapshot(editor, box.pageNo)
  return snapshot.commandList.filter((command: any) => {
    return (
      (command.fillStyle === borderColor || command.strokeStyle === borderColor) &&
      commandTouchesTopBox(command, box)
    )
  })
}

function createPrintSvgPageList(editor: Editor) {
  const draw = (editor as any).draw
  const pageCount = draw.getPageRowList().length
  return createPrintSvgPageListFromDocument({
    mainPositionList: draw.getCoordinate().getMainPositionList(),
    pageRowList: draw.getPageRowList(),
    editorOptions: draw.getOptions(),
    pageMetricList: Array.from({ length: pageCount }, (_, pageNo) => ({
      margins: draw.getMargins(pageNo),
      innerWidth: draw.getInnerWidth(pageNo),
      headerExtraHeight: draw.getHeader().getExtraHeight(),
      footerExtraHeight: draw.getFooter().getExtraHeight()
    })),
    pageCount,
    width: draw.getWidth(),
    height: draw.getHeight(),
    direction: draw.getOptions().paperDirection
  })
}

describe('menu-table pagination border', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('keeps the worker top border command for the first character row in a later paged fragment', () => {
    const seed = '0123456789'.repeat(800)

    cy.getEditor().then((editor: Editor) => {
      const borderColor = '#222222'
      const tableId = preparePagedTable(editor, seed, {
        borderType: TableBorder.ALL,
        borderColor
      })
      const box = findLaterFragmentTopBorderBox(editor, tableId, seed.length)
      expect(box).to.not.eq(null)
      const commands = findWorkerTopBorderCommands(editor, box!, borderColor)
      expect(
        commands,
        'worker 后续 fragment 首行应保留顶边绘制命令'
      ).to.have.length.greaterThan(0)
    })
  })

  it('does not synthesize solid worker top borders for empty or dashed later fragments', () => {
    const seed = '0123456789'.repeat(800)

    cy.getEditor().then((editor: Editor) => {
      const emptyBorderColor = '#cc3300'
      const emptyTableId = preparePagedTable(editor, seed, {
        borderType: TableBorder.EMPTY,
        borderColor: emptyBorderColor
      })
      const emptyBox = findLaterFragmentTopBorderBox(
        editor,
        emptyTableId,
        seed.length
      )
      expect(emptyBox).to.not.eq(null)
      const emptyCommands = findWorkerTopBorderCommands(
        editor,
        emptyBox!,
        emptyBorderColor
      )
      expect(
        emptyCommands,
        'empty 表格后续 fragment worker 不应补任何顶边命令'
      ).to.have.length(0)

      const dashBorderColor = '#3366cc'
      const dashTableId = preparePagedTable(editor, seed, {
        borderType: TableBorder.DASH,
        borderColor: dashBorderColor
      })
      const dashBox = findLaterFragmentTopBorderBox(
        editor,
        dashTableId,
        seed.length
      )
      expect(dashBox).to.not.eq(null)
      const dashCommands = findWorkerTopBorderCommands(
        editor,
        dashBox!,
        dashBorderColor
      )
      expect(
        dashCommands.some((command: any) => command.type === 'fillRect'),
        'dash 表格后续 fragment worker 不应补实心顶边'
      ).to.eq(false)
      expect(
        dashCommands.some(
          (command: any) =>
            command.type === 'strokePath' && command.lineDash?.length
        ),
        'dash 表格后续 fragment worker 应保留虚线顶边'
      ).to.eq(true)
    })
  })

  it('clips worker table cell text to the padded content box on later fragments', () => {
    const seed = '0123456789'.repeat(800)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTable(editor, seed, {
        borderType: TableBorder.ALL,
        borderColor: '#445566',
        borderWidth: 6
      })
      const box = findLaterFragmentTopBorderBox(editor, tableId, seed.length)
      expect(box).to.not.eq(null)
      const snapshot = buildWorkerSnapshot(editor, box!.pageNo)
      const clipCommand = snapshot.commandList.find((command: any) => {
        return (
          command.type === 'pushClipRect' &&
          command.rect.x > box!.x &&
          command.rect.y > box!.y &&
          command.rect.x < box!.x + box!.width &&
          command.rect.y < box!.y + box!.height
        )
      }) as any
      expect(clipCommand, 'worker 后续 fragment 单元格文本应裁剪到内容区').to.exist
      const {
        scale,
        table: { tdPadding }
      } = (editor as any).draw.getRuntime().getOptions()
      const borderInset = (6 - 1) * scale
      const expectedLeft = (tdPadding[3] * scale) + borderInset
      const expectedRight = (tdPadding[1] * scale) + borderInset
      const expectedTop = (tdPadding[0] * scale) + borderInset
      const expectedBottom = (tdPadding[2] * scale) + borderInset

      expect(clipCommand.rect.x).to.eq(box!.x + expectedLeft)
      expect(clipCommand.rect.y).to.eq(box!.y + expectedTop)
      expect(clipCommand.rect.width).to.eq(
        box!.width - expectedLeft - expectedRight
      )
      expect(clipCommand.rect.height).to.eq(
        box!.height - expectedTop - expectedBottom
      )
    })
  })

  it('clips SVG table cell content to the padded content box on later fragments', () => {
    const seed = '0123456789'.repeat(800)

    cy.getEditor().then((editor: Editor) => {
      const tableId = preparePagedTable(editor, seed, {
        borderType: TableBorder.ALL,
        borderColor: '#778899',
        borderWidth: 6
      })
      const box = findLaterFragmentTopBorderBox(editor, tableId, seed.length)
      expect(box).to.not.eq(null)
      const svgPageList = createPrintSvgPageList(editor)
      expect(svgPageList[box!.pageNo], '后续 fragment 页 SVG 应存在').to.be.a(
        'string'
      )
      expect(svgPageList[box!.pageNo], 'SVG 应输出单元格内容 clipPath').to.include(
        'clipPath'
      )
      const {
        scale,
        table: { tdPadding }
      } = (editor as any).draw.getRuntime().getOptions()
      const borderInset = (6 - 1) * scale
      const expectedLeft = (tdPadding[3] * scale) + borderInset
      const expectedRight = (tdPadding[1] * scale) + borderInset
      const expectedTop = (tdPadding[0] * scale) + borderInset
      const expectedBottom = (tdPadding[2] * scale) + borderInset
      const expectedRect = {
        x: box!.x + expectedLeft,
        y: box!.y + expectedTop,
        width: box!.width - expectedLeft - expectedRight,
        height: box!.height - expectedTop - expectedBottom
      }
      const doc = new DOMParser().parseFromString(
        svgPageList[box!.pageNo],
        'image/svg+xml'
      )
      const clipRectList = Array.from(doc.getElementsByTagName('rect')).filter(
        rect => rect.parentElement?.tagName.toLowerCase() === 'clippath'
      )
      const clipRect = clipRectList.find(rect => {
        return (
          Number(rect.getAttribute('x')) === expectedRect.x &&
          Number(rect.getAttribute('y')) === expectedRect.y &&
          Number(rect.getAttribute('width')) === expectedRect.width &&
          Number(rect.getAttribute('height')) === expectedRect.height
        )
      })
      if (!clipRect) {
        throw new Error(
          `SVG 后续 fragment 单元格内容应裁剪到内容区 expected=${JSON.stringify(
            expectedRect
          )} actual=${JSON.stringify(
            clipRectList.map(rect => ({
              x: rect.getAttribute('x'),
              y: rect.getAttribute('y'),
              width: rect.getAttribute('width'),
              height: rect.getAttribute('height')
            }))
          )}`
        )
      }

      expect(Number(clipRect!.getAttribute('x'))).to.eq(expectedRect.x)
      expect(Number(clipRect!.getAttribute('y'))).to.eq(expectedRect.y)
      expect(Number(clipRect!.getAttribute('width'))).to.eq(expectedRect.width)
      expect(Number(clipRect!.getAttribute('height'))).to.eq(expectedRect.height)
    })
  })
})
