import { ElementType } from '../../../src/editor/dataset/enum/Element'

/** 覆盖 TS-03-C：公式文本控件在多栏中不能撑破栏宽。 */
describe('typesetting page columns formula width', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 公式在窄栏中应按栏宽测量，后续文本仍应留在栏区域内。 */
  it('keeps a wide formula inside the current column bounds', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
        margins: [20, 20, 20, 20],
        columns: {
          count: 2,
          gap: 20,
          widths: [120, 120]
        },
        header: {
          disabled: true
        },
        footer: {
          disabled: true
        },
        pageNumber: {
          disabled: true
        }
      })
      editor.command.executeSetValue({
        main: [
          { value: '前' },
          {
            id: 'column-wide-formula',
            type: ElementType.LATEX,
            value: '\\frac{abcdefghijk}{mnopqrstuvwxyz}+\\sqrt{abcdefghijk}',
            formula: {
              id: 'column-wide-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: '\\frac{abcdefghijk}{mnopqrstuvwxyz}+\\sqrt{abcdefghijk}',
              ast: {
                type: 'root',
                children: [
                  {
                    type: 'text',
                    value: '\\frac{abcdefghijk}{mnopqrstuvwxyz}+\\sqrt{abcdefghijk}'
                  }
                ]
              }
            }
          },
          { value: '后' }
        ]
      })

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const resolver = editor.draw.getObjectResolver()
      const formulaPosition = editor.draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => {
          return resolver.getLayoutMainElement(position.index)?.id === 'column-wide-formula'
        })
      const formulaRow = editor.draw.getPageRowList()[formulaPosition.pageNo][
        formulaPosition.rowNo
      ]
      const column = snapshot.pageList[formulaPosition.pageNo].columnList[
        formulaRow.columnIndex || 0
      ]

      expect(formulaPosition, '公式 position 必须存在').to.exist
      expect(
        formulaPosition.coordinate.rightTop[0],
        '公式右边界不能越过当前栏'
      ).to.be.lte(column.rect.x + column.rect.width + 0.5)
      expect(formulaRow.width, '公式所在行宽不能超过栏宽').to.be.lte(
        column.rect.width + 0.5
      )
    })
  })
})
