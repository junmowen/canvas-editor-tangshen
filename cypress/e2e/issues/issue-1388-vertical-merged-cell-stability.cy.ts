import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function text(value: string) {
  return value.split('').map(item => ({ value: item }))
}

function prepareMergedTable(editor: Editor) {
  editor.command.executeSetValue(
    {
      header: [],
      main: [
        {
          type: ElementType.TABLE,
          value: '',
          colgroup: [{ width: 92 }, { width: 92 }, { width: 92 }],
          trList: [
            {
              height: 42,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 5,
                  value: text('Merged cell')
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R1C2')
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R1C3')
                }
              ]
            },
            {
              height: 42,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R2C2')
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R2C3')
                }
              ]
            },
            {
              height: 42,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R3C2')
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R3C3')
                }
              ]
            },
            {
              height: 42,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R4C2')
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R4C3')
                }
              ]
            },
            {
              height: 42,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R5C2')
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  value: text('R5C3')
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
  editor.command.executePaperSize(360, 640)
  editor.command.executeSetPaperMargin([32, 32, 32, 32])

  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE)
  if (!table?.id) {
    throw new Error('merged table not found')
  }
  return table.id
}

function getTableState(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === ElementType.TABLE && element.id === tableId)
  return {
    pageCount: draw.getPageRowList().length,
    height: table?.height || 0,
    cursor: editor.command.getCursorPosition()
  }
}

describe('issue #1388 vertically merged table cell stability', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('keeps page count and table height stable while moving inside a vertically merged cell', () => {
    let tableId = ''
    let firstState: ReturnType<typeof getTableState> | null = null

    cy.getEditor().then((editor: Editor) => {
      tableId = prepareMergedTable(editor)
      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, tableId, 0, 0, 0, 0)
    })

    cy.get('.ce-inputarea').type('{enter}{downarrow}{downarrow}', {
      force: true,
      delay: 0
    })

    cy.wait(80)

    cy.getEditor().then((editor: Editor) => {
      firstState = getTableState(editor, tableId)
      expect(firstState.pageCount, 'merged table should stay on the same page set').to.eq(1)
      expect(firstState.height, 'merged table should not keep growing after the move').to.be.greaterThan(0)
      expect(firstState.cursor, 'cursor should remain valid inside the merged table').to.not.eq(null)
    })

    cy.wait(80)

    cy.getEditor().then((nextEditor: Editor) => {
      const nextState = getTableState(nextEditor, tableId)
      expect(nextState.pageCount, 'page count must stay stable after settling').to.eq(
        firstState!.pageCount
      )
      expect(nextState.height, 'table height must stay stable after settling').to.eq(
        firstState!.height
      )
    })
  })
})
