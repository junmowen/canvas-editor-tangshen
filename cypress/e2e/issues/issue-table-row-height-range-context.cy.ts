import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('table row height range context', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
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
})
