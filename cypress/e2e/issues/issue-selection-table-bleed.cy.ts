import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function visitEditor() {
  cy.visit(
    `${Cypress.env('EDITOR_BASE_URL') || 'http://localhost:3000'}/canvas-editor/index.html`
  )
  cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
}

describe('selection rendering around tables', () => {
  beforeEach(() => {
    visitEditor()
  })

  it('does not project main text selection into table cell local indexes', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            value: '流行病史：否认14天内接触过新冠肺炎确诊患者、疑似患者、无症状感染者及其密切接触者；'
          },
          {
            type: ElementType.TABLE,
            value: '',
            colgroup: [{ width: 300 }, { width: 300 }],
            trList: [
              {
                height: 80,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      {
                        value:
                          '接触过有发热或呼吸道症状的人员；否认14天内自身有发热或呼吸道症状；'
                      }
                    ]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: '' }]
                  }
                ]
              }
            ]
          }
        ],
        footer: []
      })

      const draw = (editor as any).draw
      const range = draw.getRange()
      const originalRender = range.render.bind(range)
      let renderCount = 0
      range.render = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        renderCount++
        originalRender(ctx, x, y, width, height)
      }

      draw.getCoordinate().setPositionContext({
        isTable: false
      })
      range.setRange(2, 20)

      const table = draw
        .getOriginalElementList()
        .find((element: any) => element.type === ElementType.TABLE)
      const td = table.trList[0].tdList[0]
      const canvas = window.document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600
      const ctx = canvas.getContext('2d')!
      draw.drawSelection(ctx, {
        elementList: td.value,
        positionList: td.positionList,
        rowList: td.rowList,
        pageNo: 0,
        startIndex: 0,
        innerWidth: td.width,
        zone: range.getEditBoundaryRange().zone,
        tableCellContext: {
          tableId: table.id,
          trId: table.trList[0].id,
          tdId: td.id,
          trIndex: 0,
          tdIndex: 0
        }
      })

      expect(renderCount).to.eq(0)
    })
  })
})
