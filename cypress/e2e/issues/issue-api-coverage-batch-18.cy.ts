import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { TableDisplay } from '../../../src/editor/dataset/enum/table/Table'

function getTableRowCount(editor: Editor) {
  return (editor as any).draw
    .getObjectResolver().getOriginalRowList()
    .filter((row: any) =>
      row.elementList.some((element: any) => element.type === ElementType.TABLE)
    ).length
}

describe('issue API coverage batch 18', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #1295 keeps inline tables on the same logical row', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            id: 'inline-table-a',
            type: ElementType.TABLE,
            value: '',
            tableDisplay: TableDisplay.INLINE,
            width: 120,
            colgroup: [{ width: 120 }],
            trList: [
              {
                height: 32,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'A' }]
                  }
                ]
              }
            ]
          },
          { value: ' middle ' },
          {
            id: 'inline-table-b',
            type: ElementType.TABLE,
            value: '',
            tableDisplay: TableDisplay.INLINE,
            width: 120,
            colgroup: [{ width: 120 }],
            trList: [
              {
                height: 32,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B' }]
                  }
                ]
              }
            ]
          },
          { value: ' after' }
        ]
      })

      const tableValue = editor.command.getValue().data.main.filter(
        element => element.type === ElementType.TABLE
      )
      expect(tableValue).to.have.length(2)
      expect(tableValue.every(element => element.tableDisplay === TableDisplay.INLINE)).to.eq(
        true
      )
      expect(editor.command.getText().main).to.contain('before')
      expect(editor.command.getText().main).to.contain('after')
      expect(getTableRowCount(editor)).to.eq(1)
    })
  })

  it('issues #1297 and #1299 allow nested table cells to be read and updated', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'outer-table',
            type: ElementType.TABLE,
            value: '',
            width: 260,
            colgroup: [{ width: 260 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      {
                        id: 'inner-table',
                        type: ElementType.TABLE,
                        value: '',
                        width: 220,
                        colgroup: [{ width: 220 }],
                        trList: [
                          {
                            height: 32,
                            tdList: [
                              {
                                colspan: 1,
                                rowspan: 1,
                                value: [
                                  { id: 'inner-table-label', value: 'nested text' }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      const nestedText = editor.command.getElementById({
        id: 'inner-table-label'
      })
      expect(nestedText.map(element => element.value).join('')).to.eq('nested text')
      expect(nestedText.every(element => element.id === 'inner-table-label')).to.eq(
        true
      )

      editor.command.executeUpdateElementById({
        id: 'inner-table-label',
        properties: {
          value: 'nested text updated'
        }
      })

      const updatedText = editor.command.getElementById({
        id: 'inner-table-label'
      })
      expect(updatedText.map(element => element.value).join('')).to.eq(
        'nested text updated'
      )
      expect(editor.command.getText().main).to.contain('nested text updated')
      expect(editor.command.getHTML().main).to.contain('<table')
      expect(editor.command.getHTML().main).to.contain('nested text updated')
    })
  })
})
