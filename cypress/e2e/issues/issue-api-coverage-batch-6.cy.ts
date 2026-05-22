import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { LineNumberType } from '../../../src/editor/dataset/enum/LineNumber'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'

describe('issue API coverage batch 6', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #263 updates editor options through the command API', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'dynamic options remain readable' }]
      })

      editor.command.executeUpdateOptions({
        defaultColor: '#336699',
        defaultFont: 'Arial',
        defaultSize: 18,
        width: 640,
        height: 900
      })

      const options = editor.command.getOptions()
      expect(options).to.include({
        defaultColor: '#336699',
        defaultFont: 'Arial',
        defaultSize: 18,
        width: 640,
        height: 900
      })

      const value = editor.command.getValue()
      expect(value.options).to.include({
        defaultColor: '#336699',
        defaultFont: 'Arial',
        defaultSize: 18,
        width: 640,
        height: 900
      })
      expect(value.data.main[0].value).to.eq('dynamic options remain readable')
    })
  })

  it('issue #734 keeps line number options available from getOptions', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        lineNumber: {
          disabled: false,
          color: '#D14D72',
          size: 14,
          font: 'Arial',
          right: 24,
          type: LineNumberType.PAGE
        }
      })

      expect(editor.command.getOptions().lineNumber).to.deep.include({
        disabled: false,
        color: '#D14D72',
        size: 14,
        font: 'Arial',
        right: 24,
        type: LineNumberType.PAGE
      })
      expect(editor.command.getValue().options.lineNumber).to.deep.include({
        disabled: false,
        color: '#D14D72',
        size: 14,
        font: 'Arial',
        right: 24,
        type: LineNumberType.PAGE
      })
    })
  })

  it('issue #954 preserves disabled table tool state through setValue and getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            tableToolDisabled: true,
            colgroup: [{ width: 120 }, { width: 120 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'A1' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B1' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = editor.command.getValue().data.main[0]
      expect(table).to.include({
        type: ElementType.TABLE,
        tableToolDisabled: true
      })
      expect(table.trList?.[0].tdList[0].value[0].value).to.eq('A1')
    })
  })

  it('issue #535 preserves justify-all row flex data through getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: 'spread this row',
            rowFlex: RowFlex.JUSTIFY
          }
        ]
      })

      expect(editor.command.getValue().data.main[0]).to.include({
        value: 'spread this row',
        rowFlex: RowFlex.JUSTIFY
      })
    })
  })
})
