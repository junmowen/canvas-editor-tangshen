import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function getPageTableRowCount(editor: Editor) {
  const draw = (editor as any).draw
  return draw
    .getPageRowList()
    .map((rows: any[]) =>
      rows.filter((row: any) =>
        row.elementList.some((element: any) => element.type === ElementType.TABLE)
      ).length
    )
    .filter((count: number) => count > 0)
}

describe('issue API coverage batch 17', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issues #1232 #1254 and #1309 keep wide multi-page tables visible and serializable', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([10, 10, 10, 10])

      const rowTexts = Array.from({ length: 10 }, (_, index) =>
        `row-${index + 1} ${'alpha beta gamma '.repeat(6)}`
      )

      editor.command.executeSetValue({
        main: [
          {
            id: 'wide-table',
            type: ElementType.TABLE,
            value: '',
            width: 320,
            colgroup: [{ width: 320 }],
            trList: rowTexts.map(text => ({
              height: 32,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: [{ value: text }]
                }
              ]
            }))
          }
        ]
      })

      const table = editor.command.getValue().data.main[0]
      expect(table.width).to.eq(320)
      expect(editor.command.getText().main).to.contain('row-1')
      expect(editor.command.getText().main).to.contain('row-10')
      expect(editor.command.getHTML().main).to.contain('<table')
      expect(getPageTableRowCount(editor).length).to.be.greaterThan(1)
    })
  })

  it('issue #1291 preserves merged cell content across paged table fragments', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([10, 10, 10, 10])

      editor.command.executeSetValue({
        main: [
          {
            id: 'merged-table',
            type: ElementType.TABLE,
            value: '',
            width: 260,
            colgroup: [{ width: 130 }, { width: 130 }],
            trList: [
              {
                height: 48,
                tdList: [
                  {
                    id: 'merged-cell',
                    colspan: 1,
                    rowspan: 2,
                    value: [{ id: 'merged-cell-label', value: 'merged content' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'right top' }]
                  }
                ]
              },
              {
                height: 48,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'right bottom' }]
                  }
                ]
              },
              {
                height: 48,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'tail one' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'tail two' }]
                  }
                ]
              },
              {
                height: 48,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'tail three' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'tail four' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const mergedCell = editor.command.getElementById({ id: 'merged-cell-label' })
      expect(mergedCell.map(element => element.value).join('')).to.eq(
        'merged content'
      )
      expect(mergedCell.every(element => element.id === 'merged-cell-label')).to.eq(
        true
      )
      expect(editor.command.getText().main).to.contain('merged content')
      expect(editor.command.getHTML().main).to.contain('merged content')
      expect(getPageTableRowCount(editor).length).to.be.greaterThan(1)
    })
  })
})
