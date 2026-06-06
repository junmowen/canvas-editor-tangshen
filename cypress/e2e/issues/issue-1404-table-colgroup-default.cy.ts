import Editor from '../../../src/editor'

describe('issue #1404 - table colgroup default width', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('uses the editable page width evenly when table colgroup is omitted', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(500, 500)
      editor.command.executeSetPaperMargin([50, 50, 50, 50])
      editor.command.executeSetValue({
        main: [
          {
            type: 'table',
            value: '',
            trList: [
              {
                height: 40,
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
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'C' }]
                  }
                ]
              }
            ]
          } as any
        ]
      })

      const draw = (editor as any).draw
      const table = (draw as any)
        .getOriginalElementList()
        .find((element: any) => element.type === 'table')
      const expectedColWidth = 400 / 3

      expect(table?.colgroup).to.have.length(3)
      table.colgroup.forEach((col: { width: number }) => {
        expect(col.width).to.be.closeTo(expectedColWidth, 0.001)
      })

      ;(draw as any).getServices().renderInvalidationManager.flushScheduledFrameRender()
      const firstRowBounds = (draw as any)
        .getServices().tableLayoutSnapshotAccessor
        .getFragmentCellBounds(table.id)
        .filter((item: any) => item.trIndex === 0)

      expect(firstRowBounds).to.have.length(3)
      firstRowBounds.forEach((item: any) => {
        expect(item.width).to.be.closeTo(expectedColWidth, 0.001)
      })
    })
  })
})
