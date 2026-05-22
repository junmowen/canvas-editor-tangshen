import type Editor from '../../../src/editor'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('issue #490 control value style', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps control text styles when executeSetControlValue writes a string', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            size: 21,
            control: {
              conceptId: 'styledControl',
              type: ControlType.TEXT,
              value: null,
              placeholder: '请输入',
              deletable: false,
              minWidth: 300,
              size: 21,
              color: '#ff0000',
              underline: true
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'styledControl',
        value: 'hahhahahaaha'
      })

      const control = editor.command.getControlValue({
        conceptId: 'styledControl'
      })[0]
      expect(control).to.include({
        value: 'hahhahahaaha',
        innerText: 'hahhahahaaha',
        size: 21,
        color: '#ff0000',
        underline: true
      })
      expect(control.elementList).to.have.length(1)
      expect(control.elementList?.[0]).to.include({
        value: 'hahhahahaaha',
        size: 21,
        color: '#ff0000',
        underline: true
      })
    })
  })
})
