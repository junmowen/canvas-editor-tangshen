import type Editor from '../../../src/editor'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('issue #832 control id stable', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps the control id unchanged after updating control properties', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'stableControl',
              type: ControlType.TEXT,
              value: null,
              placeholder: 'stable'
            }
          }
        ]
      })

      const findControl = () =>
        editor.command
          .getControlList()
          .find(
            (element: any) => element.control?.conceptId === 'stableControl'
          )

      const before = findControl()
      expect(before?.controlId).to.be.a('string')

      editor.command.executeSetControlProperties({
        conceptId: 'stableControl',
        properties: {
          highlight: '#ffff00'
        }
      })

      const after = findControl()

      expect(after?.controlId).to.eq(before?.controlId)
      expect(after?.control?.highlight).to.eq('#ffff00')
    })
  })
})
