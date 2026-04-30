import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('table pagination remaining space', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('keeps the first splittable table fragment on the current page when space remains', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([10, 10, 10, 10])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            ...'prefix\nprefix\nEOF'.split('').map(value => ({ value })),
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 80 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron'
                        .split('')
                        .map(value => ({ value }))
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
      const pageRowList = draw.getPageRowList()
      const firstTablePageNo = pageRowList.findIndex((rows: any[]) =>
        rows.some(row =>
          row.elementList.some((element: any) => element.type === ElementType.TABLE)
        )
      )
      expect(firstTablePageNo).to.be.lessThan(2)
      expect(pageRowList.length).to.be.greaterThan(1)
    })
  })
})
