import Editor from '../../../src/editor'
import { PageMode } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function getTable(editor: Editor) {
  return editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE)
}

function getCellBounds(editor: Editor, tableId: string, trIndex: number, tdIndex: number) {
  const draw = (editor as any).draw
  draw.flushScheduledFrameRender()
  const bounds = draw
    .getTableLayoutSnapshotAccessor()
    .getFragmentCellBounds(tableId)
    .find((item: any) => item.trIndex === trIndex && item.tdIndex === tdIndex)
  expect(bounds, `cell bounds ${trIndex}:${tdIndex}`).to.not.eq(undefined)
  return bounds
}

function dispatchClickInContinuityPage(editor: Editor, x: number, y: number) {
  const draw = (editor as any).draw
  const wrapper = draw.getPageCanvasHost().getPageWrapperList()[0] as HTMLDivElement
  const rect = wrapper.getBoundingClientRect()
  const clientX = rect.left + x
  const clientY = rect.top + y
  ;(['mousedown', 'mouseup', 'click'] as const).forEach(type => {
    wrapper.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        clientX,
        clientY,
        button: 0
      })
    )
  })
}

describe('table row height range context', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('does not crash when range text is read with a stale table context index', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 120 }, { width: 120 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
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
            }
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
      expect(table?.id).to.be.a('string')

      draw.getPosition().setPositionContext({
        isTable: true,
        index: 9999,
        trIndex: 0,
        tdIndex: 0
      })
      expect(() => draw.getRange().setRange(0, 0, table.id, 0, 1, 0, 0)).not.to.throw()

      expect(() => editor.command.getRangeText()).not.to.throw()
      expect(editor.command.getRangeText()).to.eq('AB')
    })
  })

  it('places caret inside a lower clicked cell in continuity mode after last row height changes', () => {
    cy.getEditor().then((editor: Editor) => {
      const leadingContent = Array.from({ length: 26 }, (_, index) => [
        {
          value: `line-${index}-before-continuity-table`
        },
        {
          type: ElementType.SEPARATOR
        }
      ]).flat()

      editor.command.executePaperSize(360, 640)
      editor.command.executeSetPaperMargin([40, 40, 40, 40])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            ...leadingContent,
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 120 }, { width: 120 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
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
                  height: 120,
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
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )
      editor.command.executePageMode(PageMode.CONTINUITY)

      const table = getTable(editor)
      expect(table?.id).to.be.a('string')
      const cell = getCellBounds(editor, table!.id!, 1, 1)
      const draw = (editor as any).draw
      expect(cell.y, 'table cell is near the first page bottom').to.be.greaterThan(
        draw.getHeight() - 180
      )
      expect(cell.height, 'last row uses adjusted height').to.be.greaterThan(80)

      dispatchClickInContinuityPage(
        editor,
        cell.x + cell.width / 2,
        cell.y + cell.height - 12
      )

      cy.wrap({
        tableId: table!.id!,
        tableIndex: draw
          .getOriginalElementList()
          .findIndex((element: any) => element.id === table!.id)
      }).as('continuityCellClick')
    })

    cy.get('@continuityCellClick').then(payload => {
      const { tableId, tableIndex } = payload as {
        tableId: string
        tableIndex: number
      }
      cy.getEditor().then((editor: Editor) => {
        const draw = (editor as any).draw
        const context = draw.getPosition().getPositionContext()

        expect(context.isTable, 'clicked lower cell keeps table context').to.eq(true)
        expect(context.index, 'clicked lower cell table index').to.eq(tableIndex)
        expect(context.trIndex, 'clicked lower cell row index').to.eq(1)
        expect(context.tdIndex, 'clicked lower cell column index').to.eq(1)

        editor.command.executeInsertElementList([{ value: 'X' }])

        const elementList = draw.getOriginalElementList()
        const clickedTable = elementList[tableIndex]
        expect(clickedTable?.id, 'typing after lower cell click does not insert before table').to.eq(tableId)
        expect(
          clickedTable?.trList?.[1]?.tdList?.[1]?.value
            ?.map((element: any) => element.value)
            .join(''),
          'typing after lower cell click stays in clicked cell'
        ).to.contain('X')
      })
    })
  })
})
